const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const {
  getUserStats,
  updateProfile,
  endMultiplayerGame
} = require('../controllers/userController');

// All routes here are protected and require JWT authentication
router.get('/stats', authenticate, getUserStats);
router.put('/profile', authenticate, updateProfile);
router.post('/game-end', authenticate, endMultiplayerGame);

module.exports = router;
