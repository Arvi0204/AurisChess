/**
 * matchmaking.js
 * ──────────────
 * In-memory matchmaking queue with ELO-based pairing and progressive
 * rating-window expansion:
 *
 *   Phase 1 (0–30 s):  ±100 ELO
 *   Phase 2 (30–60 s): ±200 ELO  → emits matchmaking:widening to client
 *   Phase 3 (60 s+):   any ELO   → emits matchmaking:expanded to client
 *
 * On match: creates a room entry and emits matchmaking:found to both sockets.
 */

const { v4: uuidv4 } = require('uuid');
const { createRoom } = require('./game');

// Map<timeControl, Entry[]>
// Entry: { socketId, userId, username, rating, timeControl, joinedAt, socket }
const queue = new Map();

const PHASE_WINDOWS = [
  { after: 0,  window: 100, event: null },
  { after: 30, window: 200, event: 'matchmaking:widening' },
  { after: 60, window: Infinity, event: 'matchmaking:expanded' },
];

/**
 * Determine the current rating window for an entry based on how long it has
 * been in the queue.
 */
function getRatingWindow(entry) {
  const elapsed = (Date.now() - entry.joinedAt) / 1000;
  let phase = PHASE_WINDOWS[0];
  for (const p of PHASE_WINDOWS) {
    if (elapsed >= p.after) phase = p;
  }
  return phase;
}

/**
 * Try to find a matching opponent for `candidate` among queued entries.
 * Returns the best match or null.
 */
function findOpponent(candidate, entries) {
  const candidateWindow = getRatingWindow(candidate);
  let best = null;
  let bestDiff = Infinity;

  for (const entry of entries) {
    if (entry.socketId === candidate.socketId) continue;

    const diff = Math.abs(entry.rating - candidate.rating);
    const opponentWindow = getRatingWindow(entry);

    // Both players must fit within each other's current window
    const maxWindow = Math.max(candidateWindow.window, opponentWindow.window);
    if (diff <= maxWindow && diff < bestDiff) {
      best = entry;
      bestDiff = diff;
    }
  }
  return best;
}

/**
 * Run one scan of the queue for a given timeControl bucket.
 * Matched pairs are removed from the queue and handed off to createRoom().
 */
function scanBucket(io, timeControl) {
  const entries = queue.get(timeControl);
  if (!entries || entries.length < 2) return;

  const matched = new Set();

  for (const candidate of entries) {
    if (matched.has(candidate.socketId)) continue;

    const remaining = entries.filter(
      (e) => !matched.has(e.socketId) && e.socketId !== candidate.socketId
    );
    const opponent = findOpponent(candidate, remaining);

    if (opponent) {
      matched.add(candidate.socketId);
      matched.add(opponent.socketId);

      // Assign colors randomly
      const [white, black] =
        Math.random() < 0.5
          ? [candidate, opponent]
          : [opponent, candidate];

      const roomId = uuidv4();
      createRoom(roomId, white, black, timeControl);

      // Notify both players
      io.to(white.socketId).emit('matchmaking:found', {
        roomId,
        color: 'white',
        opponent: { username: black.username, rating: black.rating },
        timeControl,
      });
      io.to(black.socketId).emit('matchmaking:found', {
        roomId,
        color: 'black',
        opponent: { username: white.username, rating: white.rating },
        timeControl,
      });

      console.log(
        `[Matchmaking] Matched ${white.username}(${white.rating}) vs ${black.username}(${black.rating}) | room=${roomId} | tc=${timeControl}`
      );
    }
  }

  // Remove matched entries from the queue
  if (matched.size > 0) {
    queue.set(
      timeControl,
      entries.filter((e) => !matched.has(e.socketId))
    );
  }
}

/**
 * Handle a player joining the matchmaking queue.
 */
function handleJoin(io, socket, { rating, timeControl, userId, username, email }) {
  // Remove any existing entry for this socket (safety guard)
  handleCancel(socket);

  const entry = {
    socketId: socket.id,
    userId,
    username,
    email,
    rating: rating || 1200,
    timeControl,
    joinedAt: Date.now(),
    socket,
  };

  if (!queue.has(timeControl)) queue.set(timeControl, []);
  queue.get(timeControl).push(entry);

  console.log(`[Matchmaking] ${username}(${rating}) joined queue | tc=${timeControl}`);

  // Immediate scan — might match right away
  scanBucket(io, timeControl);

  // Progressive window expansion — re-scan at each phase threshold
  const timers = [];

  timers.push(
    setTimeout(() => {
      if (!isInQueue(socket.id, timeControl)) return;
      socket.emit('matchmaking:widening', { message: 'Expanding search range…' });
      scanBucket(io, timeControl);
    }, 30_000)
  );

  timers.push(
    setTimeout(() => {
      if (!isInQueue(socket.id, timeControl)) return;
      socket.emit('matchmaking:expanded', { message: 'Accepting any opponent…' });
      scanBucket(io, timeControl);
    }, 60_000)
  );

  // Store timers so we can clear them on cancel
  socket._matchmakingTimers = timers;
}

/**
 * Remove a player from the matchmaking queue (cancel search).
 */
function handleCancel(socket) {
  // Clear expansion timers
  if (socket._matchmakingTimers) {
    socket._matchmakingTimers.forEach(clearTimeout);
    socket._matchmakingTimers = null;
  }

  // Remove from every time-control bucket
  for (const [tc, entries] of queue.entries()) {
    const filtered = entries.filter((e) => e.socketId !== socket.id);
    if (filtered.length !== entries.length) {
      queue.set(tc, filtered);
      console.log(`[Matchmaking] ${socket.id} removed from queue (tc=${tc})`);
    }
  }
}

function isInQueue(socketId, timeControl) {
  const entries = queue.get(timeControl);
  return entries ? entries.some((e) => e.socketId === socketId) : false;
}

module.exports = { handleJoin, handleCancel };
