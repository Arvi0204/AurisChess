const express = require('express');
const router = express.Router();
const multer = require('multer');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Store audio in memory (max 10MB — chess voice clips are tiny)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// POST /api/voice/transcribe
// Accepts: multipart/form-data with field "audio" (webm/ogg/wav blob)
// Returns: { transcript: "e4" }
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No audio file received.' });
  }

  // Write buffer to a temp file — Groq SDK needs a file path or stream
  const tmpPath = path.join(os.tmpdir(), `chess_voice_${Date.now()}.webm`);

  try {
    fs.writeFileSync(tmpPath, req.file.buffer);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: 'whisper-large-v3-turbo', // fastest Whisper model on Groq
      language: 'en',
      response_format: 'json',
      // IMPORTANT: Whisper treats `prompt` as prior transcript context, not a
      // vocabulary hint list. Including example moves (e.g. "Rd1") causes Whisper
      // to hallucinate those moves at the start of every transcription.
      // Use only a short domain descriptor — no example move notation.
      prompt: 'Chess voice command. Piece names: pawn, knight, bishop, rook, queen, king. Actions: castle kingside, castle queenside, resign, blindfold.',
    });

    const transcript = (transcription.text || '').trim();
    console.log(`[Voice] Groq transcribed: "${transcript}"`);

    return res.json({ success: true, transcript });
  } catch (err) {
    console.error('[Voice] Groq transcription error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(tmpPath); } catch (_) {}
  }
});

module.exports = router;
