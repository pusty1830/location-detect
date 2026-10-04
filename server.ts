import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { analyzeLocationWithGemini } from './src/server/geminiService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API route for AI Location & Safety Analysis with Gemini
app.post('/api/ai-analyze-location', async (req, res) => {
  const { lat, lng } = req.body || {};

  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ 
      error: 'Invalid coordinates provided. Latitude and longitude must be valid numbers.' 
    });
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ 
      error: 'Coordinates out of valid geographical range.' 
    });
  }

  try {
    const report = await analyzeLocationWithGemini(req.body);
    return res.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[Server] Uncaught error during location analysis:', message);
    return res.status(500).json({ 
      error: 'AI analysis service encountered an internal error.',
      details: message
    });
  }
});

// Serve frontend build in production
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`BeaconPath server running on port ${PORT}`);
});
