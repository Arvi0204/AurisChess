const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const SALT_ROUNDS = 12;

/**
 * Generate a JWT token for a given user.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * POST /api/auth/signup
 * Register a new user.
 * Body: { username, email, password }
 */
const signup = async (req, res) => {
  const { username, email, password } = req.body;

  // --- Validation ---
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required: username, email, password.',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long.',
    });
  }

  try {
    // Check if user already exists (by email or username)
    const existing = await db.oneOrNone(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username.toLowerCase()]
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email or username already exists.',
      });
    }

    // Hash the password (one-way, salted)
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert the new user
    const newUser = await db.one(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash]
    );

    // Generate JWT
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          created_at: newUser.created_at,
        },
        token,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticate an existing user.
 * Body: { email, password }
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  // --- Validation ---
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
  }

  try {
    // Look up the user by email
    const user = await db.oneOrNone(
      'SELECT id, username, email, password_hash, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare the provided password against the stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate JWT
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.created_at,
        },
        token,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
};

module.exports = { signup, login };
