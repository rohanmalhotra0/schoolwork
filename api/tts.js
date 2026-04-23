// Vercel Serverless Function — /api/tts
// POST { text, voice?, speed? }  →  audio/mpeg (MP3 bytes)
// Returns an MP3 stream from OpenAI's TTS API. The browser can use
// new Audio(URL.createObjectURL(blob)) to play it.

const OpenAI = require("openai");

const VALID_VOICES = new Set(["alloy","echo","fable","onyx","nova","shimmer"]);
const MAX_CHARS = 4000;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "server misconfigured: OPENAI_KEY not set" });
    return;
  }

  const body = req.body || {};
  const rawText = typeof body.text === "string" ? body.text : "";
  const text = rawText.slice(0, MAX_CHARS).trim();
  const voice = VALID_VOICES.has(body.voice) ? body.voice : "onyx";
  const speed = typeof body.speed === "number" && body.speed >= 0.25 && body.speed <= 4
    ? body.speed
    : 1.0;

  if (!text) {
    res.status(400).json({ error: "text required" });
    return;
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.audio.speech.create({
      model: "tts-1",    // fast + cheap; use "tts-1-hd" for higher quality
      voice,
      input: text,
      speed,
      response_format: "mp3",
    });
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", String(buffer.length));
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(buffer);
  } catch (err) {
    console.error("tts error:", err);
    res.status(500).json({ error: err.message || "tts failed" });
  }
};
