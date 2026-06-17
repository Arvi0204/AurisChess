const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  getUserStats,
  updateProfile,
  endMultiplayerGame,
  saveEngineGame,
  getUserGames
} = require('../controllers/userController');

// All routes here are protected and require JWT authentication
router.get('/stats', authenticate, getUserStats);
router.get('/games', authenticate, getUserGames);
router.put('/profile', authenticate, updateProfile);
router.post('/game-end', authenticate, endMultiplayerGame);
router.post('/game-end-engine', authenticate, saveEngineGame);

module.exports = router;
