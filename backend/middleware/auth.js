const jwt = require('jsonwebtoken');

/**
 * Middleware to protect routes.
 * Extracts the Supabase JWT from the Authorization header, verifies it,
 * and attaches the decoded user payload to `req.user`.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Supabase JWTs are signed with the project's JWT Secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Map Supabase JWT properties to standard req.user format
    req.user = {
      id: decoded.sub, // Supabase UUID is stored in the 'sub' claim
      email: decoded.email,
      username: decoded.user_metadata?.username || decoded.email?.split('@')[0] || 'Player'
    };
    
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

module.exports = authenticate;
