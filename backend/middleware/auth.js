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
    const decodedToken = jwt.decode(token, { complete: true });
    
    let decoded;
    if (decodedToken && decodedToken.header.alg === 'ES256') {
      if (process.env.JWT_PUBLIC_KEY) {
        // Secure cryptographic verification using the project's public key
        decoded = jwt.verify(token, process.env.JWT_PUBLIC_KEY, { algorithms: ['ES256'] });
      } else {
        // Fallback for local development if JWT_PUBLIC_KEY is not defined in .env
        console.warn('⚠️ WARNING: JWT_PUBLIC_KEY is not set. Decoding ES256 token without verification.');
        decoded = decodedToken.payload;
      }
    } else {
      // HS256 / Symmetric Verification
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        try {
          decoded = jwt.verify(token, Buffer.from(process.env.JWT_SECRET, 'base64'));
        } catch (base64Err) {
          throw err;
        }
      }
    }
    
    // Map Supabase JWT properties to standard req.user format
    req.user = {
      id: decoded.sub, // Supabase UUID is stored in the 'sub' claim
      email: decoded.email,
      username: decoded.user_metadata?.username || decoded.email?.split('@')[0] || 'Player'
    };
    
    next();
  } catch (err) {
    console.error('❌ JWT Verification failed:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

module.exports = authenticate;
