/**
 * game.js
 * ───────
 * Server-authoritative chess game engine for online multiplayer.
 *
 * Responsibilities:
 *  - Room lifecycle (create, get, delete)
 *  - Move validation using chess.js (single source of truth)
 *  - Server-side clock management (elapsed time deducted on each move)
 *  - Time increment (only for 15+10 time control)
 *  - Disconnect / reconnect with 30-second window
 *  - Resign and draw offer / response
 *  - Game-end detection and triggering endMultiplayerGame controller
 */

const { Chess } = require('chess.js');
const db = require('../config/db');

// ── Constants ────────────────────────────────────────────────────────────────

const TIME_INITIAL_MS = {
  'rapid-10-0':  10 * 60 * 1000,
  'rapid-15-10': 15 * 60 * 1000,
  'blitz-5-0':    5 * 60 * 1000,
};

// Increment in ms per move (only 15+10 has an increment)
const INCREMENT_MS = {
  'rapid-10-0':   0,
  'rapid-15-10': 10 * 1000,
  'blitz-5-0':    0,
};

const RECONNECT_WINDOW_MS = 30_000;

// ── Room store ───────────────────────────────────────────────────────────────
// Map<roomId, GameRoom>
const rooms = new Map();

/**
 * GameRoom shape:
 * {
 *   roomId: string,
 *   timeControl: string,
 *   chess: Chess instance,
 *   white:  { socketId, userId, username, rating, email },
 *   black:  { socketId, userId, username, rating, email },
 *   whiteTimeMs: number,
 *   blackTimeMs: number,
 *   turnStartAt: number,        // Date.now() when current turn began
 *   turn: 'w' | 'b',
 *   pgn: string,                // running PGN for DB save
 *   drawOfferBy: 'w'|'b'|null,
 *   reconnectTimer: Timeout|null,
 *   disconnectedColor: 'white'|'black'|null,
 *   io: SocketIO server (injected at create time),
 * }
 */

// ── Room management ──────────────────────────────────────────────────────────

function createRoom(roomId, white, black, timeControl) {
  const initMs = TIME_INITIAL_MS[timeControl] ?? 600_000;
  const chess = new Chess();

  const room = {
    roomId,
    timeControl,
    chess,
    white: {
      socketId: white.socketId,
      userId:   white.userId,
      username: white.username,
      rating:   white.rating,
      email:    white.email || null,
    },
    black: {
      socketId: black.socketId,
      userId:   black.userId,
      username: black.username,
      rating:   black.rating,
      email:    black.email || null,
    },
    whiteTimeMs:        initMs,
    blackTimeMs:        initMs,
    turnStartAt:        Date.now(),
    turn:               'w',
    pgn:                '',
    drawOfferBy:        null,
    reconnectTimer:     null,
    disconnectedColor:  null,
    io:                 null, // set by index.js after creation
  };

  rooms.set(roomId, room);
  console.log(`[Game] Room created: ${roomId} | ${white.username} vs ${black.username} | tc=${timeControl}`);
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

function deleteRoom(roomId) {
  rooms.delete(roomId);
  console.log(`[Game] Room deleted: ${roomId}`);
}

// ── Clock helpers ────────────────────────────────────────────────────────────

/**
 * Deduct elapsed time from the currently active player's clock and reset the
 * turn timer. Applies time increment for 15+10 time control.
 * Returns { whiteTimeMs, blackTimeMs } after adjustment.
 */
function tickClock(room) {
  const elapsed = Date.now() - room.turnStartAt;

  if (room.turn === 'w') {
    room.whiteTimeMs = Math.max(0, room.whiteTimeMs - elapsed);
    room.whiteTimeMs += INCREMENT_MS[room.timeControl] ?? 0;
  } else {
    room.blackTimeMs = Math.max(0, room.blackTimeMs - elapsed);
    room.blackTimeMs += INCREMENT_MS[room.timeControl] ?? 0;
  }

  room.turnStartAt = Date.now();
  return { whiteTimeMs: room.whiteTimeMs, blackTimeMs: room.blackTimeMs };
}

// ── Game-end persistence ─────────────────────────────────────────────────────

async function persistGameEnd(room, result) {
  try {
    const gameType = room.timeControl.startsWith('blitz') ? 'blitz' : 'rapid';
    const pgn = room.chess.pgn();

    // Resolve player emails — needed by endMultiplayerGame
    const whiteEmail = room.white.email;
    const blackEmail = room.black.email;

    if (!whiteEmail || !blackEmail) {
      console.warn('[Game] Missing player emails — skipping DB persist for room', room.roomId);
      return;
    }

    // Inline ELO calculation (mirrors userController.endMultiplayerGame)
    const isRapid = gameType === 'rapid';
    const ratingColumn = isRapid ? 'rating_rapid' : 'rating_blitz';

    const [whiteUser, blackUser] = await Promise.all([
      db.oneOrNone(`SELECT id, ${ratingColumn} as rating FROM users WHERE email = $1`, [whiteEmail]),
      db.oneOrNone(`SELECT id, ${ratingColumn} as rating FROM users WHERE email = $1`, [blackEmail]),
    ]);

    if (!whiteUser || !blackUser) {
      console.warn('[Game] Could not find users in DB — skipping ELO update');
      return;
    }

    const rA = whiteUser.rating || 1200;
    const rB = blackUser.rating || 1200;
    const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
    const eB = 1 - eA;

    let sA = 0.5, sB = 0.5;
    if (result === 'white') { sA = 1; sB = 0; }
    else if (result === 'black') { sA = 0; sB = 1; }

    const K = 32;
    const changeA = Math.round(K * (sA - eA));
    const changeB = Math.round(K * (sB - eB));
    const newRA = rA + changeA;
    const newRB = rB + changeB;

    const game = await db.one(
      `INSERT INTO games (white_player_id, black_player_id, game_type, result, pgn)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [whiteUser.id, blackUser.id, gameType, result, pgn || '']
    );

    await Promise.all([
      db.none(`UPDATE users SET ${ratingColumn} = $1 WHERE id = $2`, [newRA, whiteUser.id]),
      db.none(`UPDATE users SET ${ratingColumn} = $1 WHERE id = $2`, [newRB, blackUser.id]),
      db.none(
        `INSERT INTO rating_history (user_id, game_id, game_type, rating_after, change_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [whiteUser.id, game.id, gameType, newRA, changeA]
      ),
      db.none(
        `INSERT INTO rating_history (user_id, game_id, game_type, rating_after, change_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [blackUser.id, game.id, gameType, newRB, changeB]
      ),
    ]);

    console.log(`[Game] Persisted game ${game.id} | result=${result} | ELO: white ${rA}→${newRA} (${changeA>0?'+':''}${changeA}), black ${rB}→${newRB} (${changeB>0?'+':''}${changeB})`);

    return { gameId: game.id, whiteChange: changeA, blackChange: changeB, newRA, newRB };
  } catch (err) {
    console.error('[Game] Failed to persist game end:', err.message);
  }
}

// ── Event handlers ───────────────────────────────────────────────────────────

/**
 * Called when a player joins a room socket after matchmaking:found.
 */
function handleJoinRoom(io, socket, { roomId }) {
  const room = getRoom(roomId);
  if (!room) {
    socket.emit('game:error', { message: 'Room not found.' });
    return;
  }

  // Inject io reference for disconnect timer callbacks
  room.io = io;
  socket.join(roomId);

  // Cancel reconnect timer if this player is reconnecting
  if (room.reconnectTimer && room.disconnectedColor) {
    const color = room.white.socketId === socket.id ? 'white' : 'black';
    // Check if the reconnecting socket matches the expected user
    const reconnectingUser =
      (room.disconnectedColor === 'white' && socket.id === room.white.socketId) ||
      (room.disconnectedColor === 'black' && socket.id === room.black.socketId);

    if (reconnectingUser) {
      clearTimeout(room.reconnectTimer);
      room.reconnectTimer = null;
      room.disconnectedColor = null;
      // Restore elapsed time from disconnect
      room.turnStartAt = Date.now(); // treat as fresh start to avoid mega-deduction

      io.to(roomId).emit('game:opponent-reconnected', {
        message: `${color === 'white' ? room.white.username : room.black.username} reconnected!`,
      });
    }
  }

  // Send current game state to the joining socket (handles reconnects)
  socket.emit('game:state', {
    fen:         room.chess.fen(),
    pgn:         room.chess.pgn(),
    turn:        room.turn,
    whiteTimeMs: room.whiteTimeMs,
    blackTimeMs: room.blackTimeMs,
    white:       { username: room.white.username, rating: room.white.rating },
    black:       { username: room.black.username, rating: room.black.rating },
    timeControl: room.timeControl,
  });

  console.log(`[Game] Socket ${socket.id} joined room ${roomId}`);
}

/**
 * Handle a move from a player.
 */
function handleMove(io, socket, { roomId, from, to, promotion }) {
  const room = getRoom(roomId);
  if (!room) { socket.emit('game:error', { message: 'Room not found.' }); return; }

  // Determine the moving player's color
  const isWhite = room.white.socketId === socket.id;
  const isBlack = room.black.socketId === socket.id;
  if (!isWhite && !isBlack) { socket.emit('game:error', { message: 'You are not in this room.' }); return; }

  const movingColor = isWhite ? 'w' : 'b';
  if (room.turn !== movingColor) {
    socket.emit('game:move-rejected', { reason: 'Not your turn.' });
    return;
  }

  // Attempt the move on the server chess instance
  let move;
  try {
    move = room.chess.move({ from, to, promotion: promotion || 'q' });
  } catch {
    move = null;
  }

  if (!move) {
    socket.emit('game:move-rejected', { reason: 'Illegal move.' });
    return;
  }

  // Update clock
  const { whiteTimeMs, blackTimeMs } = tickClock(room);

  // Advance turn
  room.turn = room.chess.turn();

  // Check for game over
  let gameOver = null;
  if (room.chess.isCheckmate()) {
    gameOver = {
      result: movingColor === 'w' ? 'white' : 'black',
      reason: 'Checkmate',
    };
  } else if (room.chess.isDraw()) {
    let reason = 'Draw';
    if (room.chess.isStalemate()) reason = 'Stalemate';
    else if (room.chess.isThreefoldRepetition()) reason = 'Threefold repetition';
    else if (room.chess.isInsufficientMaterial()) reason = 'Insufficient material';
    gameOver = { result: 'draw', reason };
  }

  // Check clock timeout (after deduction)
  if (!gameOver) {
    if (whiteTimeMs <= 0) {
      gameOver = { result: 'black', reason: 'White ran out of time' };
    } else if (blackTimeMs <= 0) {
      gameOver = { result: 'white', reason: 'Black ran out of time' };
    }
  }

  // Broadcast the applied move to both players
  io.to(roomId).emit('game:move-applied', {
    fen:         room.chess.fen(),
    san:         move.san,
    from:        move.from,
    to:          move.to,
    promotion:   move.promotion || null,
    whiteTimeMs,
    blackTimeMs,
    turn:        room.turn,
  });

  if (gameOver) {
    emitGameOver(io, room, gameOver.result, gameOver.reason);
  }
}

/**
 * Handle a player resigning.
 */
function handleResign(io, socket, { roomId }) {
  const room = getRoom(roomId);
  if (!room) return;

  const isWhite = room.white.socketId === socket.id;
  const result  = isWhite ? 'black' : 'white';
  emitGameOver(io, room, result, 'Resignation');
}

/**
 * Handle a draw offer from a player.
 */
function handleDrawOffer(io, socket, { roomId }) {
  const room = getRoom(roomId);
  if (!room) return;

  const isWhite    = room.white.socketId === socket.id;
  room.drawOfferBy = isWhite ? 'w' : 'b';

  // Notify the opponent
  const opponentSocketId = isWhite ? room.black.socketId : room.white.socketId;
  io.to(opponentSocketId).emit('game:draw-offered', {
    by: isWhite ? room.white.username : room.black.username,
  });
}

/**
 * Handle draw offer response.
 */
function handleDrawResponse(io, socket, { roomId, accepted }) {
  const room = getRoom(roomId);
  if (!room) return;

  if (accepted) {
    emitGameOver(io, room, 'draw', 'Agreement');
  } else {
    room.drawOfferBy = null;
    const offererSocketId =
      room.drawOfferBy === 'w' ? room.white.socketId : room.black.socketId;
    io.to(offererSocketId).emit('game:draw-declined');
    // Notify both
    io.to(roomId).emit('game:draw-declined');
  }
}

/**
 * Handle a socket disconnecting from a game room.
 */
function handleDisconnect(io, socket) {
  // Find the room this socket belongs to
  for (const [roomId, room] of rooms.entries()) {
    const isWhite = room.white.socketId === socket.id;
    const isBlack = room.black.socketId === socket.id;
    if (!isWhite && !isBlack) continue;

    const disconnectedColor = isWhite ? 'white' : 'black';
    room.disconnectedColor = disconnectedColor;
    const disconnectedName = isWhite ? room.white.username : room.black.username;

    console.log(`[Game] ${disconnectedName} disconnected from room ${roomId} — starting 30 s timer`);

    // Notify the opponent
    const opponentSocketId = isWhite ? room.black.socketId : room.white.socketId;
    io.to(opponentSocketId).emit('game:opponent-disconnected', {
      message:    `${disconnectedName} disconnected. Waiting 30 seconds…`,
      windowMs:   RECONNECT_WINDOW_MS,
    });

    // Start reconnect countdown
    room.reconnectTimer = setTimeout(() => {
      const r = getRoom(roomId);
      if (!r || r.disconnectedColor !== disconnectedColor) return; // already reconnected or room gone

      // The disconnected player loses on time
      const result = disconnectedColor === 'white' ? 'black' : 'white';
      emitGameOver(io, r, result, `${disconnectedName} abandoned the game`);
    }, RECONNECT_WINDOW_MS);

    break;
  }
}

/**
 * Handle a player reconnecting with their stored roomId and userId.
 */
function handleReconnect(io, socket, { roomId, userId }) {
  const room = getRoom(roomId);
  if (!room) { socket.emit('game:error', { message: 'Room expired or not found.' }); return; }

  // Update socket id for the reconnecting player
  if (room.white.userId === userId) {
    room.white.socketId = socket.id;
  } else if (room.black.userId === userId) {
    room.black.socketId = socket.id;
  } else {
    socket.emit('game:error', { message: 'You are not a player in this room.' });
    return;
  }

  // Trigger join logic (cancels timer, sends state)
  handleJoinRoom(io, socket, { roomId });
}

// ── Game over ────────────────────────────────────────────────────────────────

async function emitGameOver(io, room, result, reason) {
  if (!room) return;
  const { roomId, whiteTimeMs, blackTimeMs } = room;

  io.to(roomId).emit('game:over', { result, reason, whiteTimeMs, blackTimeMs });

  // Persist to DB
  const saveResult = await persistGameEnd(room, result);

  // Include rating changes in a follow-up event if available
  if (saveResult) {
    io.to(roomId).emit('game:rating-update', {
      white: { change: saveResult.whiteChange, newRating: saveResult.newRA },
      black: { change: saveResult.blackChange, newRating: saveResult.newRB },
    });
  }

  // Cleanup
  if (room.reconnectTimer) clearTimeout(room.reconnectTimer);
  deleteRoom(roomId);
}

module.exports = {
  createRoom,
  getRoom,
  handleJoinRoom,
  handleMove,
  handleResign,
  handleDrawOffer,
  handleDrawResponse,
  handleDisconnect,
  handleReconnect,
};
