/**
 * useMultiplayerSocket.ts
 * ────────────────────────
 * Encapsulates all Socket.IO interactions for online multiplayer.
 *
 * Usage:
 *   const mp = useMultiplayerSocket({ userId, username, userEmail, userRating })
 *
 *   // Matchmaking
 *   mp.joinQueue(timeControl)
 *   mp.cancelQueue()
 *
 *   // In-game
 *   mp.sendMove({ from, to, promotion })
 *   mp.sendResign()
 *   mp.offerDraw()
 *   mp.respondDraw(accepted)
 *
 *   // State
 *   mp.matchState     — 'idle' | 'searching' | 'found' | 'playing' | 'over'
 *   mp.matchInfo      — { roomId, color, opponent }
 *   mp.serverClocks   — { whiteTimeMs, blackTimeMs }
 *   mp.liveFen        — latest FEN from server
 *   mp.liveTurn       — 'w' | 'b'
 *   mp.gameResult     — { result, reason } | null
 *   mp.ratingUpdate   — { white, black } | null
 *   mp.drawOffer      — { by: username } | null
 *   mp.connectionState — 'connected' | 'disconnected'
 *   mp.opponentDisconnected — { message, windowMs } | null
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type MatchState = 'idle' | 'searching' | 'found' | 'playing' | 'over';
export type GameColor = 'white' | 'black';

export interface MatchInfo {
  roomId: string;
  color: GameColor;
  opponent: { username: string; rating: number };
  timeControl: string;
}

export interface ServerClocks {
  whiteTimeMs: number;
  blackTimeMs: number;
}

export interface GameResult {
  result: 'white' | 'black' | 'draw';
  reason: string;
}

export interface RatingUpdate {
  white: { change: number; newRating: number };
  black: { change: number; newRating: number };
}

export interface DrawOffer {
  by: string;
}

export interface OpponentDisconnected {
  message: string;
  windowMs: number;
}

interface MovePayload {
  from: string;
  to: string;
  promotion?: string;
}

interface UseMultiplayerSocketProps {
  userId: string | null;
  username: string;
  userEmail: string | null;
  userRating: number;
}

export function useMultiplayerSocket({
  userId,
  username,
  userEmail,
  userRating,
}: UseMultiplayerSocketProps) {
  const socketRef = useRef<Socket | null>(null);

  const [matchState, setMatchState] = useState<MatchState>('idle');
  const [matchInfo, setMatchInfo] = useState<MatchInfo | null>(null);
  const [serverClocks, setServerClocks] = useState<ServerClocks>({ whiteTimeMs: 0, blackTimeMs: 0 });
  const [liveFen, setLiveFen] = useState<string>('');
  const [liveTurn, setLiveTurn] = useState<'w' | 'b'>('w');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [ratingUpdate, setRatingUpdate] = useState<RatingUpdate | null>(null);
  const [drawOffer, setDrawOffer] = useState<DrawOffer | null>(null);
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected'>('disconnected');
  const [opponentDisconnected, setOpponentDisconnected] = useState<OpponentDisconnected | null>(null);
  const [matchmakingStatus, setMatchmakingStatus] = useState<string>('Searching for a worthy opponent…');
  const [lastAppliedMove, setLastAppliedMove] = useState<{ from: string; to: string; san: string } | null>(null);

  // Keep refs for stable callbacks
  const matchInfoRef = useRef<MatchInfo | null>(null);
  useEffect(() => { matchInfoRef.current = matchInfo; }, [matchInfo]);

  // ── Socket lifecycle ────────────────────────────────────────────────────────

  const getOrCreateSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
    });

    socket.on('connect', () => {
      console.log('[MP] Socket connected:', socket.id);
      setConnectionState('connected');
    });

    socket.on('disconnect', () => {
      console.log('[MP] Socket disconnected');
      setConnectionState('disconnected');
    });

    // ── Matchmaking events ────────────────────────────────────────────────────

    socket.on('matchmaking:widening', ({ message }: { message: string }) => {
      setMatchmakingStatus(message);
    });

    socket.on('matchmaking:expanded', ({ message }: { message: string }) => {
      setMatchmakingStatus(message);
    });

    socket.on('matchmaking:found', (data: MatchInfo) => {
      console.log('[MP] Match found:', data);
      setMatchInfo(data);
      setMatchState('found');
      // Join the game room
      socket.emit('game:join', { roomId: data.roomId });
    });

    // ── Game events ───────────────────────────────────────────────────────────

    socket.on('game:state', (data: {
      fen: string;
      turn: 'w' | 'b';
      whiteTimeMs: number;
      blackTimeMs: number;
    }) => {
      setLiveFen(data.fen);
      setLiveTurn(data.turn);
      setServerClocks({ whiteTimeMs: data.whiteTimeMs, blackTimeMs: data.blackTimeMs });
      setMatchState('playing');
    });

    socket.on('game:move-applied', (data: {
      fen: string;
      san: string;
      from: string;
      to: string;
      promotion?: string;
      whiteTimeMs: number;
      blackTimeMs: number;
      turn: 'w' | 'b';
    }) => {
      setLiveFen(data.fen);
      setLiveTurn(data.turn);
      setServerClocks({ whiteTimeMs: data.whiteTimeMs, blackTimeMs: data.blackTimeMs });
      setLastAppliedMove({ from: data.from, to: data.to, san: data.san });
    });

    socket.on('game:move-rejected', ({ reason }: { reason: string }) => {
      console.warn('[MP] Move rejected:', reason);
    });

    socket.on('game:over', (data: GameResult & { whiteTimeMs: number; blackTimeMs: number }) => {
      setGameResult({ result: data.result, reason: data.reason });
      setServerClocks({ whiteTimeMs: data.whiteTimeMs, blackTimeMs: data.blackTimeMs });
      setMatchState('over');
    });

    socket.on('game:rating-update', (data: RatingUpdate) => {
      setRatingUpdate(data);
    });

    socket.on('game:draw-offered', (data: DrawOffer) => {
      setDrawOffer(data);
    });

    socket.on('game:draw-declined', () => {
      setDrawOffer(null);
    });

    socket.on('game:opponent-disconnected', (data: OpponentDisconnected) => {
      setOpponentDisconnected(data);
    });

    socket.on('game:opponent-reconnected', () => {
      setOpponentDisconnected(null);
    });

    socket.on('game:error', ({ message }: { message: string }) => {
      console.error('[MP] Game error:', message);
    });

    socketRef.current = socket;
    return socket;
  }, []);

  // ── Public API ──────────────────────────────────────────────────────────────

  const joinQueue = useCallback((timeControl: string) => {
    const socket = getOrCreateSocket();
    if (!socket.connected) socket.connect();

    setMatchState('searching');
    setMatchmakingStatus('Searching for a worthy opponent…');
    setGameResult(null);
    setRatingUpdate(null);
    setDrawOffer(null);
    setOpponentDisconnected(null);

    // Wait for connection then emit
    const doJoin = () => {
      socket.emit('matchmaking:join', {
        rating: userRating,
        timeControl,
        userId,
        username,
        email: userEmail,
      });
    };

    if (socket.connected) {
      doJoin();
    } else {
      socket.once('connect', doJoin);
    }
  }, [getOrCreateSocket, userId, username, userEmail, userRating]);

  const cancelQueue = useCallback(() => {
    socketRef.current?.emit('matchmaking:cancel');
    setMatchState('idle');
    setMatchmakingStatus('Searching for a worthy opponent…');
  }, []);

  const sendMove = useCallback(({ from, to, promotion }: MovePayload) => {
    const info = matchInfoRef.current;
    if (!info) return;
    socketRef.current?.emit('game:move', { roomId: info.roomId, from, to, promotion });
  }, []);

  const sendResign = useCallback(() => {
    const info = matchInfoRef.current;
    if (!info) return;
    socketRef.current?.emit('game:resign', { roomId: info.roomId });
  }, []);

  const offerDraw = useCallback(() => {
    const info = matchInfoRef.current;
    if (!info) return;
    socketRef.current?.emit('game:draw-offer', { roomId: info.roomId });
  }, []);

  const respondDraw = useCallback((accepted: boolean) => {
    const info = matchInfoRef.current;
    if (!info) return;
    setDrawOffer(null);
    socketRef.current?.emit('game:draw-response', { roomId: info.roomId, accepted });
  }, []);

  const reconnectToRoom = useCallback((roomId: string) => {
    const socket = getOrCreateSocket();
    if (!socket.connected) socket.connect();
    socket.emit('game:reconnect', { roomId, userId });
  }, [getOrCreateSocket, userId]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    // State
    matchState,
    matchInfo,
    serverClocks,
    liveFen,
    liveTurn,
    gameResult,
    ratingUpdate,
    drawOffer,
    connectionState,
    opponentDisconnected,
    matchmakingStatus,
    lastAppliedMove,
    // Actions
    joinQueue,
    cancelQueue,
    sendMove,
    sendResign,
    offerDraw,
    respondDraw,
    reconnectToRoom,
  };
}
