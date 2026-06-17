import { useEffect, useRef } from 'react';
import { Chess } from 'chess.js';

interface VoiceControlProps {
  game: Chess;
  makeMove: (moveObj: any) => any;
  setBlindfoldMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  setShowResignConfirm: (val: boolean) => void;
  showResignConfirm: boolean;
  handleResign: () => void;
  isVoiceActive: boolean;
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
  setVoiceStatus,
  volume,
}: VoiceControlProps) => {
  const recognitionRef = useRef<any>(null);

  // Refs to avoid stale closures in persistent event listeners
  const refs = useRef({
    game,
    makeMove,
    setBlindfoldMode,
    setShowResignConfirm,
    showResignConfirm,
    handleResign,
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
    setVoiceStatus,
    volume,
  ]);

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
      horse: 'knight', castle: 'rook'
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
  const processVoiceCommand = (rawText: string) => {
    const current = refs.current;
    const cleanText = normalizeTranscript(rawText);
    current.setVoiceStatus(`Heard: "${rawText}"`);

    // --- Action 1: Resign Confirmation Flow ---
    if (current.showResignConfirm) {
      if (cleanText.match(/\b(yes|confirm|sure|resign)\b/)) {
        speakText("Resigning the game.");
        current.handleResign();
        return;
      }
      if (cleanText.match(/\b(no|cancel|keep playing|dont)\b/)) {
        speakText("Resignation cancelled.");
        current.setShowResignConfirm(false);
        current.setVoiceStatus("Resignation cancelled. Speak your move.");
        return;
      }
      speakText("Please confirm resignation. Say yes or no.");
      return;
    }

    // --- Action 2: Triggering Resignation ---
    if (cleanText.match(/\b(resign|give up|forfeit)\b/)) {
      current.setShowResignConfirm(true);
      speakText("Are you sure you want to resign? Say yes to confirm or no to keep playing.");
      current.setVoiceStatus("Confirm resignation by saying 'yes' or 'no'");
      return;
    }

    // --- Action 3: Toggling Blindfold Mode ---
    if (cleanText.match(/\b(blindfold|hide pieces|show pieces|toggle board|toggle blindfold)\b/)) {
      current.setBlindfoldMode((prev) => {
        const nextState = !prev;
        speakText(nextState ? "Blindfold mode enabled." : "Blindfold mode disabled.");
        current.setVoiceStatus(nextState ? "Blindfold mode enabled" : "Blindfold mode disabled");
        return nextState;
      });
      return;
    }

    // --- Action 4: Match Spoken Text to a Legal Move ---
    const legalMoves = current.game.moves({ verbose: true });
    let bestMove = null;
    let highestScore = 0;
    const scoredCandidates: Array<{ move: any; score: number }> = [];

    // Parse out potential square coordinates in the speech (e.g., e4, f3, c6, etc.)
    const coordinateRegex = /[a-h]\s*[1-8]/;
    const matches = cleanText.replace(/\s+/g, '').match(coordinateRegex);
    const spokenTargetSquare = matches ? matches[0] : null;

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
            !cleanText.includes('rook') && !cleanText.includes('queen') && !cleanText.includes('king')) {
          score += 5;
        }
      } else if (cleanText.includes(pieceName)) {
        score += 5;
      }

      // Check for capture intention
      if (isCapture && (cleanText.includes('take') || cleanText.includes('capture') || cleanText.includes('x'))) {
        score += 3;
      }

      // Source disambiguation (e.g. "knight from f3" -> matches start square)
      if (cleanText.includes(startSq) || cleanText.includes(`from ${startSq[0]}`)) {
        score += 5;
      }

      // Castling rules
      if (move.san === 'O-O' && cleanText.match(/\b(castle kingside|short castle|castle)\b/)) {
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

    if (scoredCandidates.length > 0) {
      const top = scoredCandidates[0];
      // Require a minimum confidence threshold
      if (top.score >= 8) {
        // Check for ambiguous ties
        const ties = scoredCandidates.filter((c) => c.score === top.score);
        if (ties.length > 1) {
          speakText("Ambiguous move. Please specify the starting square.");
          current.setVoiceStatus("Ambiguous move. Try specifying the starting square.");
        } else {
          // Success! Make the move
          const result = current.makeMove({
            from: top.move.from,
            to: top.move.to,
            promotion: 'q', // Default to Queen for voice promotions
          });
          if (result) {
            speakText(`${top.move.san}`);
            current.setVoiceStatus(`Played move: ${top.move.san}`);
          }
        }
        return;
      }
    }

    // No matching legal move found
    speakText("Illegal move or not recognized.");
    current.setVoiceStatus(`No legal move matched: "${rawText}"`);
  };

  // 3. Web Speech API Lifecycle
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      refs.current.setVoiceStatus("Voice recognition not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      const lastIndex = event.results.length - 1;
      const transcript = event.results[lastIndex][0].transcript;
      processVoiceCommand(transcript);
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        return;
      }
      refs.current.setVoiceStatus(`Error: ${event.error}`);
    };

    rec.onend = () => {
      // Auto-restart if voice control is still toggled active
      if (isVoiceActive) {
        try {
          rec.start();
        } catch (e) {
          // already running
        }
      }
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isVoiceActive]);


  // Toggle listening lifecycle
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isVoiceActive) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // already running
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // already stopped
      }
    }
  }, [isVoiceActive]);
};
