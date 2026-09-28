# AurisChess

AurisChess is a voice-first chess platform that combines online play, engine practice, blindfold training, and spoken move control.

## Tech Stack

- **Frontend:** React + TypeScript + Vite (`/web`)
- **Backend:** Node.js + Express + Socket.IO (`/backend`)
- **Auth:** Supabase JWT-based authentication
- **Database:** PostgreSQL
- **Voice Transcription:** Groq Whisper (`whisper-large-v3-turbo`)

## Core Features

- Voice command move input (e.g. “Knight to f3”)
- Blindfold mode with spoken feedback
- Multiplayer matchmaking with real-time sockets
- Rapid/blitz game modes with server-side clock handling
- Engine play mode and game review flow
- Player stats, ratings, and leaderboard APIs
- Voice telemetry logging and CSV export

## Repository Structure

```text
.
├── backend/   # Express API, Socket.IO game server, PostgreSQL integration
├── web/       # React frontend (Vite)
└── docs/      # Evaluation and research protocol docs
```

## Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL database
- Supabase project (for auth)
- Groq API key (for voice transcription)

## Environment Variables

### Backend (`/backend/.env`)

```env
PORT=3000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://...
GROQ_API_KEY=...
JWT_PUBLIC_KEY=...
# or JWT_SECRET=...
```

### Frontend (`/web/.env`)

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## Installation

Install dependencies in both apps:

```bash
cd backend && npm install
cd ../web && npm install
```

## Running Locally

Start backend:

```bash
cd backend
npm start
```

Start frontend (new terminal):

```bash
cd web
npm run dev
```

Open `http://localhost:5173`.

## Available Scripts

### Backend

- `npm start` — run backend server
- `npm run run` — run backend with nodemon

### Frontend

- `npm run dev` — start Vite dev server
- `npm run build` — type-check and build
- `npm run lint` — run ESLint
- `npm run preview` — preview production build

## API Surface (high level)

- `/api/user/*` — profile, stats, games, leaderboard, game result endpoints
- `/api/voice/transcribe` — audio transcription
- `/api/voice/telemetry` — voice telemetry ingestion/export

## Additional Documentation

- `docs/evaluation_protocol.md` — evaluation benchmarks, testing protocol, and telemetry workflow
