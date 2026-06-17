require('dotenv').config();
const db = require('./config/db');

async function runMigrations() {
  console.log('🔄 Starting database migrations...');

  try {
    // 1. Add columns to users table if they don't exist
    console.log('✏️ Updating users table...');
    await db.none(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS rating_rapid INTEGER DEFAULT 1200,
      ADD COLUMN IF NOT EXISTS rating_blitz INTEGER DEFAULT 1200,
      ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);
    console.log('✅ Users table updated successfully.');

    // 2. Create games table
    console.log('✏️ Creating games table...');
    await db.none(`
      CREATE TABLE IF NOT EXISTS games (
          id SERIAL PRIMARY KEY,
          white_player_id UUID REFERENCES users(id) ON DELETE SET NULL,
          black_player_id UUID REFERENCES users(id) ON DELETE SET NULL,
          game_type VARCHAR(20) NOT NULL,
          result VARCHAR(10) NOT NULL,
          pgn TEXT,
          blindfold_moves INTEGER DEFAULT 0,
          total_moves INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_games_players ON games(white_player_id, black_player_id);
      
      -- Ensure columns exist in case the table was already created
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS blindfold_moves INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_moves INTEGER DEFAULT 0;
    `);
    console.log('✅ Games table created/updated successfully.');

    // 3. Create rating_history table
    console.log('✏️ Creating rating_history table...');
    await db.none(`
      CREATE TABLE IF NOT EXISTS rating_history (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          game_id INTEGER REFERENCES games(id) ON DELETE SET NULL,
          game_type VARCHAR(20) NOT NULL,
          rating_after INTEGER NOT NULL,
          change_amount INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_rating_history_user ON rating_history(user_id);
    `);
    console.log('✅ Rating history table created successfully.');

    console.log('🎉 All migrations completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigrations();
