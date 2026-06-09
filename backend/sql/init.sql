-- Drop old table if it exists (safe during development only)
DROP TABLE IF EXISTS users;

-- Create the users table for authentication
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups during login
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
