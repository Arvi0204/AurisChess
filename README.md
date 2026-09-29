# AurisChess ♟️🎙️

AurisChess is an accessible, voice-first chess platform that combines online multiplayer play, engine practice, blindfold visualization training, and natural spoken move control.

Powered by Groq's high-speed Whisper AI (`whisper-large-v3-turbo`) with real-time audio talkback, AurisChess allows visually impaired players and blindfold practitioners to play chess hands-free.

---

## 🌟 Core Features

- **Voice Command Move Input**: Speak moves naturally in English (e.g., *"Knight to f3"*, *"e4"*, *"Bishop captures c6"*).
- **Blindfold Visualization Mode**: Completely hide the chessboard and play relying solely on spoken move input and auditory narrations.
- **Board State Voice Queries**: Query piece coordinates mid-game (e.g., *"Where are my knights?"*, *"What was their last move?"*) to build and verify your mental board representation.
- **Real-Time Text-to-Speech (TTS) Talkback**: Dynamic audio announcements for opponent moves, captures, check/checkmate alerts, and ambiguous move clarification prompts.
- **Real-Time Multiplayer**: Low-latency matchmaking and gameplay synchronization powered by Socket.IO.
- **Engine Play & Analysis**: Practice against offline/local engine bots and review past games.
- **Player Stats & Ratings**: Elo tracking across rapid and blitz formats with competitive leaderboards.
- **Empirical Research & Telemetry**: Built-in voice telemetry logging, Move Recognition Rate (MRR) tracking, and CSV data export for academic evaluation.

---

## 🏗️ Tech Stack & Architecture

```text
AurisChess/
├── backend/            # Node.js + Express 5 API & Socket.IO game server
│   ├── config/         # PostgreSQL connection pool (pg-promise)
│   ├── controllers/    # User, leaderboard, telemetry handlers
│   ├── middleware/     # Supabase JWT authentication
│   ├── routes/         # REST endpoints (/api/user, /api/voice, /api/voice/telemetry)
│   ├── socket/         # Real-time WebSocket game room coordinator
│   └── migrate.js      # Database schema migrations
├── web/                # React 19 + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/ # Chessboard, voice HUD, clocks, modals
│   │   ├── hooks/      # useChessVoiceControl, useMultiplayerSocket
│   │   ├── pages/      # Play, Review, Learn, Leaderboard, Profile
│   │   └── utils/      # Move parsing, phonetic homophone matching, SAN converters
└── docs/               # Evaluation protocols, latency benchmarks, research study guide
```

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [react-chessboard](https://github.com/Clariity/react-chessboard), [chess.js](https://github.com/jhlywa/chess.js), [Lucide React](https://lucide.dev/)
- **Backend**: [Node.js](https://nodejs.org/), [Express 5](https://expressjs.com/), [Socket.IO](https://socket.io/), [pg-promise](https://vitaly-t.github.io/pg-promise/)
- **Voice / AI**: [Groq Cloud SDK](https://console.groq.com) (`whisper-large-v3-turbo`) with browser Web Speech API fallback
- **Auth & Database**: Supabase (JWT Auth) + PostgreSQL

---

## 🎤 Spoken Command Cheat Sheet

| Category | Example Voice Commands | Resulting Action / SAN |
|---|---|---|
| **Pawn Moves** | `"e4"`, `"d four"`, `"pawn to c5"` | `e4`, `d4`, `c5` |
| **Piece Moves** | `"Knight to f3"`, `"Bishop c4"`, `"Queen d2"` | `Nf3`, `Bc4`, `Qd2` |
| **Captures** | `"e takes d5"`, `"Bishop captures c6"` | `exd5`, `Bxc6` |
| **Castling** | `"Castle kingside"`, `"Short castle"`, `"Castle queenside"` | `O-O`, `O-O-O` |
| **Promotions** | `"e8 promotes to Queen"`, `"promote to Knight"` | `e8=Q`, `e8=N` |
| **Disambiguation** | `"Rook from a1 to e1"`, `"Knight on b to d2"` | `Rae1`, `Nbd2` |
| **Blindfold Queries** | `"Where are white knights?"`, `"What was their last move?"` | Auditory TTS response |
| **Board / Game Control** | `"Toggle board"`, `"Blindfold"`, `"Resign"` | UI toggle or game forfeit |

---

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: Local instance or hosted Supabase database
- **Supabase Project**: For user authentication
- **Groq API Key**: For ultra-fast Whisper speech transcription ([Get one here](https://console.groq.com))

---

## ⚙️ Environment Variables

### Backend (`/backend/.env`)

```env
PORT=3000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/<dbname>
GROQ_API_KEY=gsk_your_groq_api_key_here
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
# or JWT_SECRET=your_jwt_secret_here
```

### Frontend (`/web/.env`)

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

---

## 🚀 Installation & Setup

### 1. Install Dependencies

Install packages for both the backend and frontend:

```bash
# In the root repository
cd backend && npm install
cd ../web && npm install
```

### 2. Database Migrations

Run database migrations to ensure the `users` and `games` tables are initialized:

```bash
cd backend
node migrate.js
```

---

## 💻 Running Locally

### Start Backend Server

```bash
cd backend
npm run run    # Runs with nodemon for hot-reloading
# or: npm start
```
The backend API and Socket.IO will listen on `http://localhost:3000`.

### Start Frontend Application

Open a second terminal window:

```bash
cd web
npm run dev
```

Navigate to `http://localhost:5173` in your browser.

---

## 📦 Available Scripts

### Backend (`/backend`)

- `npm start`: Start production server
- `npm run run`: Start development server with `nodemon`
- `node migrate.js`: Run schema and table migrations

### Frontend (`/web`)

- `npm run dev`: Start Vite development server
- `npm run build`: Type-check with `tsc` and produce production build
- `npm run lint`: Run ESLint code checks
- `npm run preview`: Preview production build locally

---

## 🌐 API Surface (High Level)

- **Authentication & User**:
  - `GET /api/me`: Authenticated user profile lookup
  - `GET /api/user/:id`: Public profile stats & recent games
  - `GET /api/user/leaderboard`: Top players by blitz and rapid Elo
  - `POST /api/user/game-result`: Save completed game and update Elo
- **Voice Transcription**:
  - `POST /api/voice/transcribe`: Ingest audio blobs (WebM/WAV) $\rightarrow$ Groq Whisper transcription
- **Telemetry & Research**:
  - `POST /api/voice/telemetry`: Log move latency, recognition success, and WER metrics
  - `GET /api/voice/telemetry/export`: Export research trial data to CSV

---

## 🔬 Research & Evaluation Protocols

For academic research, usability evaluations, and Move Recognition Rate (MRR) benchmarks, refer to:
- [`docs/evaluation_protocol.md`](docs/evaluation_protocol.md): Detailed 25-move standardized benchmark suite, noise-level stress testing, NASA-TLX cognitive load testing, and SUS scoring framework.

---

## 📄 License

This project is licensed under the [ISC License](backend/package.json).
