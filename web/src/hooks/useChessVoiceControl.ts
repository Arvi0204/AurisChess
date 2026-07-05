import { useEffect, useRef, useCallback } from 'react';
import { Chess, Move } from 'chess.js';
import { API_BASE } from '../config/api';

const BACKEND_TRANSCRIBE_URL = `${API_BASE}/api/voice/transcribe`;

// How long a continuous silence (ms) triggers transcription
const SILENCE_THRESHOLD_MS = 1200;
// Minimum recording duration before we bother sending (ms)
const MIN_RECORDING_MS = 400;
// RMS volume below which we consider audio "silent"
const SILENCE_RMS_CUTOFF = 0.01;

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
  gameResult: { type: 'win' | 'loss' | 'draw' | 'aborted'; reason: string } | null;
  offerDraw?: () => void;
  drawOffer?: { by: string } | null;
  respondDraw?: (accepted: boolean) => void;
  promotionSetting: 'auto-queen' | 'selective';
  handlePromotionSelect: (from: string, to: string) => void;
  hasPendingPromotion?: boolean;
  handlePromotionChoice?: (pieceType: string) => void;
  handleCancelPromotion?: () => void;
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
  gameResult,
  offerDraw,
  drawOffer,
  respondDraw,
  promotionSetting,
  handlePromotionSelect,
  hasPendingPromotion,
  handlePromotionChoice,
  handleCancelPromotion,
}: VoiceControlProps) => {
  // Refs for the audio pipeline
  const mediaStreamRef    = useRef<MediaStream | null>(null);
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const audioContextRef   = useRef<AudioContext | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const silenceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingChunks   = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);
  const isActiveRef       = useRef(isVoiceActive);
  const isSendingRef      = useRef(false);
  // Block transcription for N ms after TTS plays (prevents mic picking up speaker output)
  const ttsBlockUntilRef  = useRef<number>(0);
  // Did we detect real speech in the current recording window?
  const speechDetectedInCycleRef = useRef(false);

  // Ref mirror of all props to avoid stale closures
  const refs = useRef({
    game, makeMove, setBlindfoldMode, setShowResignConfirm,
    showResignConfirm, handleResign, isPlayerTurn, setVoiceStatus, volume, gameResult,
    offerDraw, drawOffer, respondDraw, promotionSetting, handlePromotionSelect,
    hasPendingPromotion, handlePromotionChoice, handleCancelPromotion,
  });
  useEffect(() => {
    refs.current = {
      game, makeMove, setBlindfoldMode, setShowResignConfirm,
      showResignConfirm, handleResign, isPlayerTurn, setVoiceStatus, volume, gameResult,
      offerDraw, drawOffer, respondDraw, promotionSetting, handlePromotionSelect,
      hasPendingPromotion, handlePromotionChoice, handleCancelPromotion,
    };
  }, [game, makeMove, setBlindfoldMode, setShowResignConfirm, showResignConfirm, handleResign, isPlayerTurn, setVoiceStatus, volume, gameResult, offerDraw, drawOffer, respondDraw, promotionSetting, handlePromotionSelect, hasPendingPromotion, handlePromotionChoice, handleCancelPromotion]);

  useEffect(() => { isActiveRef.current = isVoiceActive; }, [isVoiceActive]);

  // ─── TTS helper ───────────────────────────────────────────────────────────
  const speakText = (text: string) => {
    const vol = refs.current.volume;
    if ('speechSynthesis' in window && vol > 0) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      u.volume = vol;
      // Block mic transcription for the duration of TTS + 1s buffer
      // to prevent the mic picking up what the speaker says
      u.onstart = () => {
        // Estimate block: 200ms/word + 1000ms buffer minimum
        const estimatedMs = Math.max(text.split(' ').length * 400 + 1000, 2500);
        ttsBlockUntilRef.current = Date.now() + estimatedMs;
      };
      u.onend = () => {
        // Keep block for 800ms after TTS ends to catch speaker reverb
        ttsBlockUntilRef.current = Date.now() + 800;
      };
      window.speechSynthesis.speak(u);
    }
  };

  // ─── SAN → natural spoken English ─────────────────────────────────────────────
  const sanToSpeech = (san: string): string => {
    const pieceNames: Record<string, string> = {
      K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight',
    };
    if (san === 'O-O-O') return 'Castles queenside';
    if (san === 'O-O')   return 'Castles kingside';
    const isCheckmate = san.endsWith('#');
    const isCheck     = !isCheckmate && san.endsWith('+');
    const base        = san.replace(/[+#]/g, '');
    const suffix      = isCheckmate ? ', checkmate' : isCheck ? ', check' : '';
    // Promotion: e8=Q
    const promoMatch = base.match(/^([a-h][1-8])=([QRBN])$/);
    if (promoMatch) return `${promoMatch[1]} promotes to ${pieceNames[promoMatch[2]] ?? promoMatch[2]}${suffix}`;
    // Piece capture: Nxf3
    const pieceCapture = base.match(/^([KQRBN])([a-h]?[1-8]?)x([a-h][1-8])$/);
    if (pieceCapture) return `${pieceNames[pieceCapture[1]] ?? pieceCapture[1]} captures on ${pieceCapture[3]}${suffix}`;
    // Pawn capture: exd5
    const pawnCapture = base.match(/^([a-h])x([a-h][1-8])$/);
    if (pawnCapture) return `Pawn captures on ${pawnCapture[2]}${suffix}`;
    // Piece move: Nf3, Rhe1
    const pieceMove = base.match(/^([KQRBN])([a-h]?[1-8]?)([a-h][1-8])$/);
    if (pieceMove) return `${pieceNames[pieceMove[1]] ?? pieceMove[1]} to ${pieceMove[3]}${suffix}`;
    // Pawn push: e4
    const pawnMove = base.match(/^([a-h][1-8])$/);
    if (pawnMove) return `${pawnMove[1]}${suffix}`;
    return san;
  };

  // ─── Text normalisation ───────────────────────────────────────────────────
  const normalizeTranscript = (text: string): string => {
    let clean = text.toLowerCase().trim();
    const numberMap: Record<string, string> = {
      one: '1', two: '2', three: '3', four: '4', for: '4',
      five: '5', six: '6', seven: '7', eight: '8', ate: '8',
      to: '2', too: '2', free: '3', tree: '3',
    };
    const homophones: Record<string, string> = {
      see: 'c', sea: 'c', bee: 'b', be: 'b', gee: 'g',
      de: 'd', day: 'd', easy: 'e', night: 'knight', horse: 'knight',
    };
    clean = clean.replace(/[^a-z0-9\s]/g, '');
    return clean.split(/\s+/).map(t => numberMap[t] ?? homophones[t] ?? t).join(' ');
  };

  const getPieceFullName = (char: string): string => {
    const map: Record<string, string> = {
      p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
    };
    return map[char] ?? 'pawn';
  };

  // ─── Move processor (unchanged logic) ─────────────────────────────────────
  const processVoiceCommand = useCallback((rawText: string) => {
    const current = refs.current;
    const cleanText = normalizeTranscript(rawText);

    console.log(`[Voice] Raw: "${rawText}"`);
    console.log(`[Voice] Normalized: "${cleanText}"`);
    current.setVoiceStatus(`Heard: "${rawText}"`);

    // ── Pending Promotion Flow ──────────────────────────────────────────────
    if (current.hasPendingPromotion && current.handlePromotionChoice && current.handleCancelPromotion) {
      const namedPieces = ['knight','bishop','rook','queen'];
      const spokenPiece = namedPieces.find(p => cleanText.includes(p)) ?? null;
      if (spokenPiece) {
        const promoChar = spokenPiece === 'knight' ? 'n' : spokenPiece[0];
        speakText(`Promoting to ${spokenPiece}.`);
        current.handlePromotionChoice(promoChar);
        return;
      }
      if (cleanText.match(/\b(cancel|no|stop|reject|back)\b/)) {
        speakText('Promotion cancelled.');
        current.handleCancelPromotion();
        return;
      }
      speakText('Please say Queen, Rook, Bishop, Knight, or Cancel.');
      current.setVoiceStatus('Waiting for piece: say Queen, Rook, Bishop, Knight, or Cancel');
      return;
    }

    // ── Chess-intent check ──────────────────────────────────────────────────
    // Only fire TTS feedback if the transcript contains something chess-like.
    // Ambient noise / random words like "the" or "okay" should be silently ignored.
    const chessIndicators = [
      /[a-h][1-8]/,                              // square coordinate
      /\b(knight|bishop|rook|queen|king|pawn|castle|resign|blindfold|forfeit|give up|draw|accept|decline)\b/,
    ];
    const hasChessIntent = chessIndicators.some(r => r.test(cleanText));
    const silentFail = (msg: string) => {
      // No TTS, just update status quietly
      console.log(`[Voice] Ignored (no chess intent): "${rawText}" — ${msg}`);
      current.setVoiceStatus("Listening... Speak your move");
    };

    // Draw offer flow
    if (current.drawOffer && current.respondDraw) {
      if (cleanText.match(/\b(yes|accept|agree|confirm)\b/)) {
        speakText('Accepting draw offer.');
        current.respondDraw(true);
        return;
      }
      if (cleanText.match(/\b(no|decline|reject|cancel)\b/)) {
        speakText('Declining draw offer.');
        current.respondDraw(false);
        return;
      }
    }

    // Offer draw trigger
    if (cleanText.match(/\b(offer draw|propose draw|request draw|draw offer)\b/)) {
      if (current.offerDraw) {
        speakText('Offering a draw.');
        current.offerDraw();
      } else {
        speakText('Draw offers are only available in online mode.');
      }
      return;
    }

    // Resign flow
    if (current.showResignConfirm) {
      if (!hasChessIntent && !cleanText.match(/\b(yes|no|confirm|cancel|sure|dont)\b/)) {
        return silentFail('resign confirm — no chess or confirm word');
      }
      if (cleanText.match(/\b(yes|confirm|sure|resign)\b/)) {
        speakText('Resigning the game.');
        current.handleResign();
        return;
      }
      if (cleanText.match(/\b(no|cancel|keep playing|dont)\b/)) {
        speakText('Resignation cancelled.');
        current.setShowResignConfirm(false);
        current.setVoiceStatus('Resignation cancelled. Speak your move.');
        return;
      }
      speakText('Please confirm resignation. Say yes or no.');
      return;
    }
    if (cleanText.match(/\b(resign|give up|forfeit)\b/)) {
      current.setShowResignConfirm(true);
      const resignPrompt = 'Are you sure you want to resign? Say yes to confirm or no to keep playing.';
      // Block mic for the full TTS duration + 3s extra buffer so the speaker
      // output (which contains the word "yes") is not picked up by the mic.
      const estimatedBlockMs = resignPrompt.split(' ').length * 400 + 3000;
      ttsBlockUntilRef.current = Date.now() + estimatedBlockMs;
      speakText(resignPrompt);
      current.setVoiceStatus("Confirm resignation by saying 'yes' or 'no'");
      return;
    }

    // Blindfold toggle
    if (cleanText.match(/\b(blindfold|hide pieces|show pieces|toggle board|toggle blindfold)\b/)) {
      current.setBlindfoldMode(prev => {
        const next = !prev;
        speakText(next ? 'Blindfold mode enabled.' : 'Blindfold mode disabled.');
        current.setVoiceStatus(next ? 'Blindfold mode enabled' : 'Blindfold mode disabled');
        return next;
      });
      return;
    }

    if (!current.isPlayerTurn) {
      // Don't spam TTS — just silently log
      console.log('[Voice] Ignored — not player turn');
      current.setVoiceStatus('Not your turn. Wait for the opponent.');
      return;
    }

    // If no chess indicators at all, silently ignore
    if (!hasChessIntent) {
      return silentFail('no chess coordinates or piece names found');
    }

    // Move matching
    const legalMoves = current.game.moves({ verbose: true });
    const scored: Array<{ move: Move; score: number }> = [];

    const coordRegex = /[a-h][1-8]/g;
    const coords = cleanText.replace(/\s+/g, '').match(coordRegex);
    const spokenTo   = coords ? coords[coords.length - 1] : null;
    const spokenFrom = coords && coords.length >= 2 ? coords[0] : null;

    for (const move of legalMoves) {
      let score = 0;
      const pieceName = getPieceFullName(move.piece);
      const isCapture = move.flags.includes('c') || move.san.includes('x');

      // ── Piece name matching ─────────────────────────────────────────────────
      // Determine whether the user explicitly named a piece in their command.
      const namedPieces = ['knight','bishop','rook','queen','king','pawn'];
      const spokenPiece = namedPieces.find(p => cleanText.includes(p)) ?? null;

      if (spokenPiece) {
        const promotionPieceName = move.promotion ? getPieceFullName(move.promotion) : null;
        // User named a piece — hard-filter: wrong piece type gets eliminated
        // Allow match if it matches the moving piece type OR the promotion piece type
        const matchesPiece = pieceName === spokenPiece || (promotionPieceName && promotionPieceName === spokenPiece);
        const isCastlingException = spokenPiece === 'castle' && (move.san === 'O-O' || move.san === 'O-O-O');

        if (!matchesPiece && !isCastlingException) {
          continue; // skip entirely — user said a different piece name
        } else {
          score += 8; // correct piece name bonus
        }
      } else if (pieceName === 'pawn') {
        score += 3; // slight pawn preference when no piece name spoken
      }

      if (cleanText.replace(/\s+/g, '') === move.san.toLowerCase()) score += 20;
      if (spokenTo && spokenTo === move.to)       score += 10;
      else if (cleanText.includes(move.to))        score += 8;

      if (isCapture && (cleanText.includes('take') || cleanText.includes('capture') || cleanText.includes('x'))) score += 3;
      if ((spokenFrom && spokenFrom === move.from) ||
          (!spokenFrom && (cleanText.includes(move.from) || cleanText.includes(`from ${move.from[0]}`)))) score += 5;

      if (move.san === 'O-O' && cleanText.match(/\b(castle kingside|short castle)\b/)) score += 15;
      else if (move.san === 'O-O' && cleanText.match(/\bcastle\b/) && !spokenTo) score += 15;
      if (move.san === 'O-O-O' && cleanText.match(/\b(castle queenside|long castle)\b/)) score += 18;

      if (score > 0) scored.push({ move, score });
    }

    // Filter out duplicate promotion candidates for the exact same source/target squares
    // to prevent coordinates-tie ambiguities in promotion.
    const uniqueCandidates: typeof scored = [];
    for (const item of scored) {
      const isDuplicate = uniqueCandidates.some(
        u => u.move.from === item.move.from && u.move.to === item.move.to
      );
      if (!isDuplicate) {
        // Find all candidates for this same from -> to
        const matches = scored.filter(
          s => s.move.from === item.move.from && s.move.to === item.move.to
        );

        if (matches.length === 1) {
          uniqueCandidates.push(item);
        } else {
          // It's a promotion move with multiple candidates.
          // Let's see if any matches the spoken piece (if specified).
          const spokenPiece = ['knight','bishop','rook','queen'].find(p => cleanText.includes(p)) ?? null;
          let selected = matches.find(m => {
            const promo = m.move.promotion;
            if (!promo) return false;
            const fullName = getPieceFullName(promo);
            return fullName === spokenPiece;
          });

          // If no spoken piece matches, default to Queen ('q')
          if (!selected) {
            selected = matches.find(m => m.move.promotion === 'q');
          }

          if (selected) {
            uniqueCandidates.push(selected);
          } else {
            uniqueCandidates.push(item); // fallback
          }
        }
      }
    }

    uniqueCandidates.sort((a, b) => b.score - a.score);

    if (uniqueCandidates.length > 0) {
      console.log('[Voice] Candidates:', uniqueCandidates.map(c => `${c.move.san}(${c.score})`).join(', '));
    } else {
      console.log('[Voice] No candidates matched');
    }

    if (uniqueCandidates.length > 0 && uniqueCandidates[0].score >= 10) {
      const top = uniqueCandidates[0];
      const ties = uniqueCandidates.filter(c => c.score === top.score);
      if (ties.length > 1) {
        // Only speak ambiguity if there was genuine chess intent
        if (hasChessIntent) {
          const ambigMsg = 'Ambiguous move. Please specify the starting square.';
          // Pre-block mic so the spoken phrase is not picked up and re-transcribed
          ttsBlockUntilRef.current = Date.now() + ambigMsg.split(' ').length * 400 + 1500;
          speakText(ambigMsg);
          current.setVoiceStatus('Ambiguous move. Try specifying the starting square.');
        }
      } else {
        console.log(`[Voice] Move: ${top.move.san}`);
        // If it is a promotion move, handle the promotion preference:
        if (top.move.promotion) {
          // Check if the user specified a promotion piece in their voice command
          const spokenPiece = ['knight','bishop','rook','queen'].find(p => cleanText.includes(p)) ?? null;
          if (spokenPiece) {
            // User explicitly requested a piece, execute immediately
            const promoChar = spokenPiece === 'knight' ? 'n' : spokenPiece[0];
            const result = current.makeMove({ from: top.move.from, to: top.move.to, promotion: promoChar });
            if (result) {
              speakText(sanToSpeech(top.move.san));
              current.setVoiceStatus(`Played: ${top.move.san}`);
            }
          } else {
            // No piece specified in voice command. Use setting preference.
            if (current.promotionSetting === 'selective') {
              // Trigger screen selection overlay
              current.handlePromotionSelect(top.move.from, top.move.to);
              speakText('Please select promotion piece on screen.');
              current.setVoiceStatus('Select promotion piece on screen.');
            } else {
              // Auto-queen
              const result = current.makeMove({ from: top.move.from, to: top.move.to, promotion: 'q' });
              if (result) {
                speakText(sanToSpeech(top.move.san));
                current.setVoiceStatus(`Played: ${top.move.san}`);
              }
            }
          }
        } else {
          // Standard non-promotion move
          const result = current.makeMove({ from: top.move.from, to: top.move.to });
          if (result) {
            speakText(sanToSpeech(top.move.san));
            current.setVoiceStatus(`Played: ${top.move.san}`);
          }
        }
      }
      return;
    }

    // Only say "illegal move" if there was genuine chess intent, not random words
    if (hasChessIntent) {
      const illegalMsg = 'Illegal move or not recognized.';
      // Pre-block mic so the spoken phrase is not picked up and re-transcribed
      ttsBlockUntilRef.current = Date.now() + illegalMsg.split(' ').length * 400 + 1500;
      speakText(illegalMsg);
      current.setVoiceStatus(`No legal move matched: "${rawText}"`);
    } else {
      silentFail('scored candidates below threshold');
    }

  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Send audio blob to backend for Groq transcription ───────────────────
  const sendForTranscription = useCallback(async (blob: Blob) => {
    // Skip if TTS is currently playing (prevents mic echo loop)
    if (Date.now() < ttsBlockUntilRef.current) {
      console.log('[Voice] Skipping transcription — TTS block active');
      if (isActiveRef.current) {
        refs.current.setVoiceStatus("Listening... Speak your move (e.g. 'e4', 'Knight f3')");
      }
      return;
    }
    // Skip if speech was not detected in this cycle (just ambient noise)
    if (!speechDetectedInCycleRef.current) {
      console.log('[Voice] Skipping transcription — no speech detected in cycle');
      return;
    }

    if (isSendingRef.current) return;
    isSendingRef.current = true;
    refs.current.setVoiceStatus('Transcribing...');

    const form = new FormData();
    form.append('audio', blob, 'voice.webm');

    try {
      const res = await fetch(BACKEND_TRANSCRIBE_URL, { method: 'POST', body: form });
      const data = await res.json();
      if (data.success && data.transcript) {
        processVoiceCommand(data.transcript);
      } else {
        console.warn('[Voice] Empty transcript from Groq');
        refs.current.setVoiceStatus('Listening... Speak your move');
      }
    } catch (err) {
      console.error('[Voice] Transcription fetch error:', err);
      refs.current.setVoiceStatus('Transcription error — check backend');
    } finally {
      isSendingRef.current = false;
      if (isActiveRef.current) {
        refs.current.setVoiceStatus("Listening... Speak your move (e.g. 'e4', 'Knight f3')");
      }
    }
  }, [processVoiceCommand]);

  // ─── Silence detector using AnalyserNode ─────────────────────────────────
  const startSilenceDetection = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = ctx;
    analyserRef.current = analyser;

    const buf = new Float32Array(analyser.fftSize);
    let speechDetected = false;

    const tick = () => {
      if (!isActiveRef.current) return;

      analyser.getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((sum, v) => sum + v * v, 0) / buf.length);
      const isSpeaking = rms > SILENCE_RMS_CUTOFF;

      if (isSpeaking) {
        speechDetected = true;
        speechDetectedInCycleRef.current = true; // mark that real speech occurred
        // Cancel any pending silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else if (speechDetected) {
        // We were speaking, now silent — start the silence window
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            speechDetected = false;

            const recorder = mediaRecorderRef.current;
            if (!recorder || recorder.state !== 'recording') return;

            const elapsed = Date.now() - recordingStartRef.current;
            if (elapsed < MIN_RECORDING_MS) return; // too short — ignore

            console.log(`[Voice] Silence detected after ${elapsed}ms — stopping recorder`);
            recorder.stop(); // triggers ondataavailable → onstop
          }, SILENCE_THRESHOLD_MS);
        }
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Build and start the full recording pipeline ──────────────────────────
  const startPipeline = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;

      // Pick the best supported MIME type
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
        .find(m => MediaRecorder.isTypeSupported(m)) ?? '';

      const startNewRecording = () => {
        if (!isActiveRef.current) return;

        recordingChunks.current = [];
        recordingStartRef.current = Date.now();

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordingChunks.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(recordingChunks.current, { type: mimeType || 'audio/webm' });
          recordingChunks.current = [];

          if (blob.size > 1000) { // ignore near-empty blobs
            sendForTranscription(blob);
          }

          // Reset speech-detected flag for next cycle
          speechDetectedInCycleRef.current = false;

          // Immediately start a new recording cycle if still active
          if (isActiveRef.current) {
            setTimeout(startNewRecording, 100);
          }
        };

        recorder.start();
        console.log('[Voice] Recording cycle started');
      };

      startSilenceDetection(stream);
      startNewRecording();

      refs.current.setVoiceStatus("Listening... Speak your move (e.g. 'e4', 'Knight f3')");
      console.log('[Voice] Pipeline started');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Voice] Failed to start pipeline:', msg);
      refs.current.setVoiceStatus('Microphone access denied. Please allow mic and try again.');
    }
  }, [sendForTranscription, startSilenceDetection]);

  // ─── Tear down the pipeline ───────────────────────────────────────────────
  const stopPipeline = useCallback(() => {
    console.log('[Voice] Stopping pipeline');

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    mediaRecorderRef.current = null;

    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (_) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  // ─── Toggle effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isVoiceActive) {
      startPipeline();
    } else {
      stopPipeline();
      if (gameResult) {
        refs.current.setVoiceStatus('Voice control stopped (game ended)');
      } else {
        refs.current.setVoiceStatus('Voice control stopped');
      }
    }

    return () => {
      // Clean up on unmount or isVoiceActive change
      stopPipeline();
    };
  }, [isVoiceActive, startPipeline, stopPipeline, gameResult]);

  return { speakText, sanToSpeech };
};
