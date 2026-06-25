const db = require('../config/db');

/**
 * Helper to fetch or synchronize a local user based on their authenticated token.
 * This bridges Supabase Auth and our Postgres schema.
 */
async function getOrCreateUser(email, username) {
  let user = await db.oneOrNone(
    'SELECT id, username, email, rating_rapid, rating_blitz, avatar_url, created_at FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  if (!user) {
    // If the user doesn't exist locally, create a record.
    // Use a default ELO of 1200 and a mock password hash since they authenticate via Supabase.
    user = await db.one(
      `INSERT INTO users (username, email, password_hash, rating_rapid, rating_blitz)
       VALUES ($1, $2, $3, 1200, 1200)
       RETURNING *`,
      [username.toLowerCase(), email.toLowerCase(), 'supabase_auth']
    );
  }
  return user;
}

/**
 * GET /api/user/stats
 * Fetches user profile, rating progression chart points, and win/loss/draw records.
 */
const getUserStats = async (req, res) => {
  try {
    const dbUser = await getOrCreateUser(req.user.email, req.user.username);

    // Fetch rating history and game stats in parallel to reduce database latency (round-trips)
    const [rapidHistoryRes, blitzHistoryRes, statsResult] = await Promise.all([
      db.any(
        `SELECT rating_after as rating, change_amount as change, created_at as date 
         FROM rating_history 
         WHERE user_id = $1 AND game_type = $2 
         ORDER BY created_at ASC`,
        [dbUser.id, 'rapid']
      ),
      db.any(
        `SELECT rating_after as rating, change_amount as change, created_at as date 
         FROM rating_history 
         WHERE user_id = $1 AND game_type = $2 
         ORDER BY created_at ASC`,
        [dbUser.id, 'blitz']
      ),
      db.one(
        `SELECT 
          COUNT(*) FILTER (WHERE (white_player_id = $1 AND result = 'white') OR (black_player_id = $1 AND result = 'black')) as wins,
          COUNT(*) FILTER (WHERE (white_player_id = $1 AND result = 'black') OR (black_player_id = $1 AND result = 'white')) as losses,
          COUNT(*) FILTER (WHERE result = 'draw') as draws
        FROM games
        WHERE (white_player_id = $1 OR black_player_id = $1) AND game_type IN ('rapid', 'blitz')`,
        [dbUser.id]
      )
    ]);

    let rapidHistory = rapidHistoryRes;
    let blitzHistory = blitzHistoryRes;

    const now = new Date();

    // If history is empty, return virtual mock data so the progression chart works on first load
    // but DO NOT insert it into the database. This keeps the database clean and makes the mock data
    // disappear automatically as soon as the user plays their first real game.
    if (rapidHistory.length === 0) {
      rapidHistory = [
        { rating: 1200, change: 0, date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString() },
        { rating: 1215, change: 15, date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString() },
        { rating: 1205, change: -10, date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString() },
        { rating: 1230, change: 25, date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString() },
        { rating: 1242, change: 12, date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() }
      ];
    }

    if (blitzHistory.length === 0) {
      blitzHistory = [
        { rating: 1200, change: 0, date: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString() },
        { rating: 1190, change: -10, date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() },
        { rating: 1212, change: 22, date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString() },
        { rating: 1202, change: -10, date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() },
        { rating: 1225, change: 23, date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() }
      ];
    }

    // Determine if user has any real games recorded
    const totalRealGames = parseInt(statsResult.wins) + parseInt(statsResult.losses) + parseInt(statsResult.draws);

    // If no games played, display mock totals matching the mock progression.
    // Otherwise, show their real record.
    const wins = totalRealGames > 0 ? parseInt(statsResult.wins) : 3;
    const losses = totalRealGames > 0 ? parseInt(statsResult.losses) : 2;
    const draws = totalRealGames > 0 ? parseInt(statsResult.draws) : 0;

    return res.json({
      success: true,
      data: {
        user: {
          id: dbUser.id,
          username: dbUser.username,
          email: dbUser.email,
          rating_rapid: dbUser.rating_rapid,
          rating_blitz: dbUser.rating_blitz,
          avatar_url: dbUser.avatar_url,
          created_at: dbUser.created_at,
        },
        rapidHistory,
        blitzHistory,
        stats: { wins, losses, draws },
      },
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * PUT /api/user/profile
 * Updates details in the database (username and/or avatar_url).
 */
const updateProfile = async (req, res) => {
  const { username, avatar_url } = req.body;

  try {
    const dbUser = await getOrCreateUser(req.user.email, req.user.username);

    // Build update fields declaratively to avoid fragile string concatenation
    const updates = []; // [{ col: string, val: any }]

    if (username !== undefined && username.trim() !== '') {
      const sanitizedUsername = username.trim().toLowerCase();
      if (sanitizedUsername !== dbUser.username) {
        const taken = await db.oneOrNone('SELECT id FROM users WHERE username = $1', [sanitizedUsername]);
        if (taken) {
          return res.status(409).json({ success: false, message: 'Username is already taken.' });
        }
      }
      updates.push({ col: 'username', val: sanitizedUsername });
    }

    if (avatar_url !== undefined) {
      updates.push({ col: 'avatar_url', val: avatar_url });
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    // e.g. "username = $1, avatar_url = $2"
    const setClauses = updates.map((u, i) => `${u.col} = $${i + 1}`).join(', ');
    const values     = updates.map(u => u.val);
    const idIndex    = updates.length + 1;

    const query = `UPDATE users SET ${setClauses} WHERE id = $${idIndex} RETURNING id, username, email, rating_rapid, rating_blitz, avatar_url`;
    const updatedUser = await db.one(query, [...values, dbUser.id]);

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: updatedUser },
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * POST /api/games/end
 * End a multiplayer game, calculate rating adjustments, and log match.
 */
const endMultiplayerGame = async (req, res) => {
  const { whitePlayerEmail, blackPlayerEmail, result, gameType, pgn } = req.body;

  if (!whitePlayerEmail || !blackPlayerEmail || !result || !gameType) {
    return res.status(400).json({ success: false, message: 'Missing required parameters.' });
  }

  try {
    const whiteUser = await getOrCreateUser(whitePlayerEmail, whitePlayerEmail.split('@')[0]);
    const blackUser = await getOrCreateUser(blackPlayerEmail, blackPlayerEmail.split('@')[0]);

    const isRapid = gameType === 'rapid';
    const rA = isRapid ? whiteUser.rating_rapid : whiteUser.rating_blitz;
    const rB = isRapid ? blackUser.rating_rapid : blackUser.rating_blitz;

    // Elo expectations
    const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
    const eB = 1 / (1 + Math.pow(10, (rA - rB) / 400));

    // Actual score values
    let sA = 0.5;
    let sB = 0.5;
    if (result === 'white') {
      sA = 1;
      sB = 0;
    } else if (result === 'black') {
      sA = 0;
      sB = 1;
    }

    const K = 32;
    const changeA = Math.round(K * (sA - eA));
    const changeB = Math.round(K * (sB - eB));

    const newRA = rA + changeA;
    const newRB = rB + changeB;

    // Log the game record
    const game = await db.one(
      `INSERT INTO games (white_player_id, black_player_id, game_type, result, pgn)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [whiteUser.id, blackUser.id, gameType, result, pgn || '']
    );

    // Save ratings and record history in parallel
    const ratingColumn = isRapid ? 'rating_rapid' : 'rating_blitz';
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

    return res.json({
      success: true,
      message: 'Game recorded and ELO ratings updated.',
      data: {
        gameId: game.id,
        white: { id: whiteUser.id, ratingBefore: rA, ratingAfter: newRA, change: changeA },
        black: { id: blackUser.id, ratingBefore: rB, ratingAfter: newRB, change: changeB },
      },
    });
  } catch (err) {
    console.error('Error ending game:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * POST /api/user/game-end-engine
 * Save a practice game played against the computer.
 */
const saveEngineGame = async (req, res) => {
  const { playerColor, result, pgn, blindfoldMoves, totalMoves } = req.body;

  if (!playerColor || !result) {
    return res.status(400).json({ success: false, message: 'Missing required parameters.' });
  }

  try {
    const dbUser = await getOrCreateUser(req.user.email, req.user.username);

    // Save the game record, with the computer player set to NULL
    const whitePlayerId = playerColor === 'white' ? dbUser.id : null;
    const blackPlayerId = playerColor === 'black' ? dbUser.id : null;

    const game = await db.one(
      `INSERT INTO games (white_player_id, black_player_id, game_type, result, pgn, blindfold_moves, total_moves)
       VALUES ($1, $2, 'engine', $3, $4, $5, $6)
       RETURNING id`,
      [
        whitePlayerId,
        blackPlayerId,
        result, // 'white', 'black', or 'draw'
        pgn || '',
        parseInt(blindfoldMoves, 10) || 0,
        parseInt(totalMoves, 10) || 0
      ]
    );

    return res.json({
      success: true,
      message: 'Engine game saved successfully.',
      data: { gameId: game.id },
    });
  } catch (err) {
    console.error('Error saving engine game:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/**
 * GET /api/user/games
 * Fetch recent games played by the user (both multiplayer and engine).
 */
const getUserGames = async (req, res) => {
  try {
    const dbUser = await getOrCreateUser(req.user.email, req.user.username);

    const games = await db.any(
      `SELECT 
        g.id,
        g.game_type,
        g.result,
        g.pgn,
        g.blindfold_moves,
        g.total_moves,
        g.created_at,
        w.username as white_username,
        w.email as white_email,
        b.username as black_username,
        b.email as black_email
      FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      WHERE g.white_player_id = $1 OR g.black_player_id = $1
      ORDER BY g.created_at DESC
      LIMIT 10`,
      [dbUser.id]
    );

    return res.json({
      success: true,
      data: { games },
    });
  } catch (err) {
    console.error('Error fetching user games:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  getUserStats,
  updateProfile,
  endMultiplayerGame,
  saveEngineGame,
  getUserGames,
};
