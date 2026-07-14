const express = require('express');
const router = express.Router();
const db = require('../config/db');



// Helper to escape CSV fields
function escapeCSV(val) {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// POST /api/voice/telemetry
// Logs telemetry data into database
router.post('/', async (req, res) => {
  try {
    const {
      gameSessionId,
      username,
      commandIndex,
      rawText,
      resolvedMove,
      isSuccess,
      silenceBufferMs,
      networkWhisperMs,
      executionMs,
      systemLatencyMs,
      userPerceivedLatencyMs
    } = req.body;

    await db.none(`
      INSERT INTO voice_telemetry (
        game_session_id, username, command_index, raw_text, resolved_move, is_success,
        silence_buffer_ms, network_whisper_ms, execution_ms, system_latency_ms, user_perceived_latency_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      gameSessionId,
      username || 'Player',
      commandIndex,
      rawText,
      resolvedMove,
      isSuccess,
      silenceBufferMs,
      networkWhisperMs,
      executionMs,
      systemLatencyMs,
      userPerceivedLatencyMs
    ]);

    return res.json({ success: true });
  } catch (err) {
    console.error('[Telemetry] Database log failed:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/voice/telemetry/download
// Downloads consolidated CSV file from database
router.get('/download', async (req, res) => {
  try {
    // Basic secret query key protection
    const { secret } = req.query;
    if (secret !== 'auris123') {
      return res.status(403).send('Unauthorized. Please provide the correct ?secret= passcode.');
    }

    const rows = await db.any('SELECT * FROM voice_telemetry ORDER BY timestamp ASC');

    const headers = [
      'Timestamp',
      'GameSessionId',
      'Username',
      'CommandIndex',
      'RawText',
      'ResolvedMove',
      'IsSuccess',
      'SilenceBufferMs',
      'NetworkWhisperMs',
      'ExecutionMs',
      'SystemLatencyMs',
      'UserPerceivedLatencyMs'
    ];

    let csv = headers.join(',') + '\n';

    for (const row of rows) {
      csv += [
        escapeCSV(row.timestamp),
        escapeCSV(row.game_session_id),
        escapeCSV(row.username),
        escapeCSV(row.command_index),
        escapeCSV(row.raw_text),
        escapeCSV(row.resolved_move),
        escapeCSV(row.is_success ? 1 : 0),
        escapeCSV(row.silence_buffer_ms),
        escapeCSV(row.network_whisper_ms),
        escapeCSV(row.execution_ms),
        escapeCSV(row.system_latency_ms),
        escapeCSV(row.user_perceived_latency_ms)
      ].join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=voice_telemetry.csv');
    return res.send(csv);
  } catch (err) {
    console.error('[Telemetry] CSV generation failed:', err.message);
    return res.status(500).send('Error generating telemetry file: ' + err.message);
  }
});

module.exports = router;
