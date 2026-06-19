import { useEffect, useRef, useCallback } from 'react';
import { Chess, Move } from 'chess.js';

interface SpeechRecognitionEvent {
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface VoiceControlProps {
  game: Chess;
  makeMove: (moveObj: { from: string; to: string; promotion?: string }) => Move | null;
  setBlindfoldMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  setShowResignConfirm: (val: boolean) => void;
  showResignConfirm: boolean;
  handleResign: () => void;
  isVoiceActive: boolean;
  isPlayerTurn: boolean;
  setVoiceStatus: (status: string) => void;
  volume: number;
}

export const useChessVoiceControl = ({
  game,
  makeMove,
  setBlindfoldMode,
  setShowResignConfirm,
  showResignConfirm,
  handleResign,
  isVoiceActive,
  isPlayerTurn,
  setVoiceStatus,
  volume,
}: VoiceControlProps) => {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isVoiceActiveRef = useRef(isVoiceActive);
  // Track whether a fatal error occurred so onend doesn't restart into a loop
  const hadFatalErrorRef = useRef(false);
  // Consecutive transient error count for backoff
  const errorCountRef = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs to avoid stale closures in persistent event listeners
  const refs = useRef({
    game,
    makeMove,
    setBlindfoldMode,
    setShowResignConfirm,
    showResignConfirm,
    handleResign,
    isPlayerTurn,
    setVoiceStatus,
    volume,
  });

  // Keep refs in sync with latest values
  useEffect(() => {
    refs.current = {
      game,
      makeMove,
      setBlindfoldMode,
      setShowResignConfirm,
      showResignConfirm,
      handleResign,
      isPlayerTurn,
      setVoiceStatus,
      volume,
    };
  }, [
    game,
    makeMove,
    setBlindfoldMode,
    setShowResignConfirm,
    showResignConfirm,
    handleResign,
    isPlayerTurn,
    setVoiceStatus,
    volume,
  ]);

  // Keep isVoiceActive ref in sync
  useEffect(() => {
    isVoiceActiveRef.current = isVoiceActive;
    // When the user explicitly toggles voice on, reset error state to allow fresh start
    if (isVoiceActive) {
      hadFatalErrorRef.current = false;
      errorCountRef.current = 0;
    }
  }, [isVoiceActive]);

  // Browser Text-to-Speech (TTS) helper using window.speechSynthesis
  const speakText = (text: string) => {
    const vol = refs.current.volume;
    if ('speechSynthesis' in window && vol > 0) {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.volume = vol;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 1. Text Normalization Pipeline
  const normalizeTranscript = (text: string): string => {
    let clean = text.toLowerCase().trim();

    // Mapping written numbers to digits
    const numberMap: Record<string, string> = {
      one: '1', two: '2', three: '3', four: '4', for: '4',
      five: '5', six: '6', seven: '7', eight: '8', ate: '8',
      to: '2', too: '2', free: '3', tree: '3'
    };

    // Homophones for letters/squares
    const homophones: Record<string, string> = {
      see: 'c', sea: 'c', bee: 'b', be: 'b', gee: 'g',
      de: 'd', day: 'd', easy: 'e', night: 'knight',
      horse: 'knight'
    };

    // Clean up punctuation (keep spaces)
    clean = clean.replace(/[^a-z0-9\s]/g, '');

    // Split into words, replace numbers/homophones, rejoin
    let tokens = clean.split(/\s+/);
    tokens = tokens.map((t) => {
      if (numberMap[t]) return numberMap[t];
      if (homophones[t]) return homophones[t];
      return t;
    });

    return tokens.join(' ');
  };

  // Helper to convert short piece characters to full names
  const getPieceFullName = (char: string): string => {
    switch (char) {
      case 'p': return 'pawn';
      case 'n': return 'knight';
      case 'b': return 'bishop';
      case 'r': return 'rook';
      case 'q': return 'queen';
      case 'k': return 'king';
      default: return 'pawn';
    }
  };

  // 2. Local Intent & Move Matcher
  const processVoiceCommand = useCallback((rawText: string) => {
    const current = refs.current;
    const cleanText = normalizeTranscript(rawText);

    // Log raw input and interpreted move to console
    console.log(`[Voice] Raw input: "${rawText}"`);
    console.log(`[Voice] Normalized: "${cleanText}"`);

    // Reset error count on successful speech result
    errorCountRef.current = 0;

    current.setVoiceStatus(`Heard: "${rawText}"`);

    // --- Action 1: Resign Confirmation Flow ---
    if (current.showResignConfirm) {
      if (cleanText.match(/\b(yes|confirm|sure|resign)\b/)) {
        console.log('[Voice] Interpreted: RESIGN CONFIRMED');
        speakText("Resigning the game.");
        current.handleResign();
        return;
      }
      if (cleanText.match(/\b(no|cancel|keep playing|dont)\b/)) {
        console.log('[Voice] Interpreted: RESIGN CANCELLED');
        speakText("Resignation cancelled.");
        current.setShowResignConfirm(false);
        current.setVoiceStatus("Resignation cancelled. Speak your move.");
        return;
      }
      console.log('[Voice] Interpreted: AWAITING RESIGN CONFIRMATION');
      speakText("Please confirm resignation. Say yes or no.");
      return;
    }

    // --- Action 2: Triggering Resignation ---
    if (cleanText.match(/\b(resign|give up|forfeit)\b/)) {
      console.log('[Voice] Interpreted: RESIGN REQUEST');
      current.setShowResignConfirm(true);
      speakText("Are you sure you want to resign? Say yes to confirm or no to keep playing.");
      current.setVoiceStatus("Confirm resignation by saying 'yes' or 'no'");
      return;
    }

    // --- Action 3: Toggling Blindfold Mode ---
    if (cleanText.match(/\b(blindfold|hide pieces|show pieces|toggle board|toggle blindfold)\b/)) {
      console.log('[Voice] Interpreted: TOGGLE BLINDFOLD');
      current.setBlindfoldMode((prev) => {
        const nextState = !prev;
        speakText(nextState ? "Blindfold mode enabled." : "Blindfold mode disabled.");
        current.setVoiceStatus(nextState ? "Blindfold mode enabled" : "Blindfold mode disabled");
        return nextState;
      });
      return;
    }

    // --- Action 4: Match Spoken Text to a Legal Move ---
    // Guard: don't try to make a move if it's not the player's turn
    if (!current.isPlayerTurn) {
      console.log('[Voice] Ignoring move command — not player\'s turn');
      current.setVoiceStatus("Not your turn. Wait for the opponent to move.");
      return;
    }

    const legalMoves = current.game.moves({ verbose: true });
    const scoredCandidates: Array<{ move: Move; score: number }> = [];

    // Parse out potential square coordinates in the speech (e.g., e4, f3, c6, etc.)
    // Use global flag to capture ALL coordinate mentions (e.g. "knight from g1 to f3" -> ['g1','f3'])
    const coordinateRegex = /[a-h][1-8]/g;
    const allCoordMatches = cleanText.replace(/\s+/g, '').match(coordinateRegex);
    // Last coordinate mentioned is the destination; first (if two exist) is the origin
    const spokenTargetSquare = allCoordMatches ? allCoordMatches[allCoordMatches.length - 1] : null;
    const spokenFromSquare = allCoordMatches && allCoordMatches.length >= 2 ? allCoordMatches[0] : null;

    for (const move of legalMoves) {
      let score = 0;
      const targetSq = move.to; // e.g., 'e4', 'f3'
      const startSq = move.from; // e.g., 'e2', 'g1'
      const pieceName = getPieceFullName(move.piece); // 'pawn', 'knight', etc.
      const isCapture = move.flags.includes('c') || move.san.includes('x');

      // Exact match of standard algebraic notation (e.g. "Nf3" -> "nf3")
      if (cleanText.replace(/\s+/g, '') === move.san.toLowerCase()) {
        score += 20;
      }

      // Check for target square coordinates
      if (spokenTargetSquare && spokenTargetSquare === targetSq) {
        score += 10;
      } else if (cleanText.includes(targetSq)) {
        score += 8;
      }

      // Check piece type matching
      if (pieceName === 'pawn') {
        // Pawn moves usually don't mention a piece (e.g. "e4", not "pawn e4")
        if (!cleanText.includes('knight') && !cleanText.includes('bishop') && 
            !cleanText.includes('rook') && !cleanText.includes('castle') &&
            !cleanText.includes('queen') && !cleanText.includes('king')) {
          score += 5;
        }
      } else if (cleanText.includes(pieceName) || (pieceName === 'rook' && cleanText.includes('castle'))) {
        score += 5;
      }

      // Check for capture intention
      if (isCapture && (cleanText.includes('take') || cleanText.includes('capture') || cleanText.includes('x'))) {
        score += 3;
      }

      // Source disambiguation (e.g. "knight from g1 to f3" -> matches start square)
      // Prefer the explicitly extracted from-square; fall back to substring search
      if ((spokenFromSquare && spokenFromSquare === startSq) ||
          (!spokenFromSquare && (cleanText.includes(startSq) || cleanText.includes(`from ${startSq[0]}`)))) {
        score += 5;
      }

      // Castling rules
      if (move.san === 'O-O' && cleanText.match(/\b(castle kingside|short castle)\b/)) {
        score += 15;
      } else if (move.san === 'O-O' && cleanText.match(/\bcastle\b/) && !spokenTargetSquare) {
        score += 15;
      }
      if (move.san === 'O-O-O' && cleanText.match(/\b(castle queenside|long castle)\b/)) {
        score += 18;
      }

      if (score > 0) {
        scoredCandidates.push({ move, score });
      }
    }

    // Sort by highest score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Log all scored candidates
    if (scoredCandidates.length > 0) {
      console.log('[Voice] Move candidates:', scoredCandidates.map(c => `${c.move.san} (score: ${c.score})`).join(', '));
    } else {
      console.log('[Voice] No move candidates matched');
    }

    if (scoredCandidates.length > 0) {
      const top = scoredCandidates[0];
      // Require a minimum confidence threshold (10 = must have target square + at least one other signal)
      if (top.score >= 10) {
        // Check for ambiguous ties
        const ties = scoredCandidates.filter((c) => c.score === top.score);
        if (ties.length > 1) {
          console.log(`[Voice] Interpreted: AMBIGUOUS - tied moves: ${ties.map(t => t.move.san).join(', ')}`);
          speakText("Ambiguous move. Please specify the starting square.");
          current.setVoiceStatus("Ambiguous move. Try specifying the starting square.");
        } else {
          // Success! Make the move
          console.log(`[Voice] Interpreted: MOVE ${top.move.san} (from ${top.move.from} to ${top.move.to}, score: ${top.score})`);
          const result = current.makeMove({
            from: top.move.from,
            to: top.move.to,
            promotion: 'q', // Default to Queen for voice promotions
          });
          if (result) {
            speakText(`${top.move.san}`);
            current.setVoiceStatus(`Played move: ${top.move.san}`);
          } else {
            console.log('[Voice] makeMove returned null/false - move may be invalid in current state');
          }
        }
        return;
      }
    }

    // No matching legal move found
    console.log(`[Voice] Interpreted: NO MATCH for "${rawText}"`);
    speakText("Illegal move or not recognized.");
    current.setVoiceStatus(`No legal move matched: "${rawText}"`);
  }, []);

  // 3. Web Speech API Lifecycle — create recognition instance ONCE on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      refs.current.setVoiceStatus("Voice recognition not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const lastIndex = event.results.length - 1;
      const transcript = event.results[lastIndex][0].transcript;
      processVoiceCommand(transcript);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'aborted' errors happen when we intentionally stop/restart — ignore them
      if (event.error === 'aborted') {
        console.log('[Voice] Recognition was aborted (intentional stop/restart)');
        return;
      }
      if (event.error === 'no-speech') {
        console.log('[Voice] No speech detected, will auto-restart');
        return;
      }

      // Fatal errors that should NOT trigger auto-restart
      const fatalErrors = ['network', 'not-allowed', 'service-not-allowed'];
      if (fatalErrors.includes(event.error)) {
        hadFatalErrorRef.current = true;
        console.error(`[Voice] Fatal error: ${event.error} — auto-restart disabled. Toggle mic off/on to retry.`);
        const friendlyMsg = event.error === 'network'
          ? 'Network error — Chrome requires internet for speech recognition. Check your connection and toggle mic to retry.'
          : `Mic access denied (${event.error}). Please allow microphone access and retry.`;
        refs.current.setVoiceStatus(friendlyMsg);
        return;
      }

      // Transient errors — allow restart with backoff
      errorCountRef.current += 1;
      console.error(`[Voice] Speech recognition error: ${event.error} (consecutive: ${errorCountRef.current})`);
      refs.current.setVoiceStatus(`Error: ${event.error}`);
    };

    rec.onend = () => {
      console.log('[Voice] Recognition ended, isVoiceActive:', isVoiceActiveRef.current, 'hadFatalError:', hadFatalErrorRef.current);

      // Don't restart if there was a fatal error (network, permission, etc.)
      if (hadFatalErrorRef.current) {
        console.log('[Voice] Not restarting due to fatal error. Toggle mic off/on to retry.');
        return;
      }

      // Auto-restart if voice control is still toggled active (read from ref, not stale closure)
      if (isVoiceActiveRef.current) {
        // Exponential backoff: 200ms, 400ms, 800ms, 1600ms, capped at 5000ms
        const backoffMs = Math.min(200 * Math.pow(2, errorCountRef.current), 5000);
        console.log(`[Voice] Will auto-restart in ${backoffMs}ms (error count: ${errorCountRef.current})`);

        // Clear any pending restart timer
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
        }

        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (isVoiceActiveRef.current && recognitionRef.current && !hadFatalErrorRef.current) {
            try {
              console.log('[Voice] Auto-restarting recognition');
              recognitionRef.current.start();
            } catch (e) {
              console.log('[Voice] Auto-restart failed (already running)');
            }
          }
        }, backoffMs);
      }
    };

    recognitionRef.current = rec;

    return () => {
      // Clear any pending restart timer
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only create once on mount

  // Toggle listening lifecycle — starts/stops based on isVoiceActive
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isVoiceActive) {
      // Small delay to ensure any previous stop/abort has completed
      const startTimer = setTimeout(() => {
        if (recognitionRef.current) {
          try {
            console.log('[Voice] Starting recognition');
            recognitionRef.current.start();
          } catch (e) {
            console.log('[Voice] Start failed (may already be running)');
          }
        }
      }, 50);
      return () => clearTimeout(startTimer);
    } else {
      try {
        console.log('[Voice] Stopping recognition');
        recognitionRef.current.stop();
      } catch (e) {
        console.log('[Voice] Stop failed (may already be stopped)');
      }
    }
  }, [isVoiceActive]);
};
