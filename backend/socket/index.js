/**
 * socket/index.js
 * ───────────────
 * Central Socket.IO handler. Wires all socket events and delegates to
 * matchmaking.js and game.js.
 */

const { handleJoin, handleCancel }         = require('./matchmaking');
const {
  handleJoinRoom,
  handleMove,
  handleResign,
  handleDrawOffer,
  handleDrawResponse,
  handleDisconnect,
  handleReconnect,
} = require('./game');

/**
 * @param {import('socket.io').Server} io
 */
function initSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── Matchmaking ─────────────────────────────────────────────────────────

    socket.on('matchmaking:join', (data) => {
      console.log(`[Socket] matchmaking:join from ${socket.id}`, data);
      handleJoin(io, socket, data);
    });

    socket.on('matchmaking:cancel', () => {
      console.log(`[Socket] matchmaking:cancel from ${socket.id}`);
      handleCancel(socket);
    });

    // ── Game room ────────────────────────────────────────────────────────────

    socket.on('game:join', (data) => {
      console.log(`[Socket] game:join from ${socket.id}`, data);
      handleJoinRoom(io, socket, data);
    });

    socket.on('game:move', (data) => {
      handleMove(io, socket, data);
    });

    socket.on('game:resign', (data) => {
      console.log(`[Socket] game:resign from ${socket.id}`, data);
      handleResign(io, socket, data);
    });

    socket.on('game:draw-offer', (data) => {
      console.log(`[Socket] game:draw-offer from ${socket.id}`, data);
      handleDrawOffer(io, socket, data);
    });

    socket.on('game:draw-response', (data) => {
      console.log(`[Socket] game:draw-response from ${socket.id}`, data);
      handleDrawResponse(io, socket, data);
    });

    socket.on('game:reconnect', (data) => {
      console.log(`[Socket] game:reconnect from ${socket.id}`, data);
      handleReconnect(io, socket, data);
    });

    // ── Disconnect ───────────────────────────────────────────────────────────

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} — ${reason}`);
      handleCancel(socket);      // remove from matchmaking queue if present
      handleDisconnect(io, socket); // handle in-game disconnect
    });
  });
}

module.exports = { initSocket };
