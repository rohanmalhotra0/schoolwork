// Vercel Serverless Function — /api/transcribe
// POST { audio: <base64>, mimeType?: string, language?: string }
// Forwards the audio to OpenAI Whisper and returns { text }.
//
// The browser sends base64 to stay inside Vercel's 4.5MB JSON body cap
// (≈ 3.3MB of actual audio, which is plenty for a single mock-interview turn).

const OpenAI = require("openai");

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
  const { audio, mimeType = "audio/webm", language } = body;
  if (!audio || typeof audio !== "string") {
    res.status(400).json({ error: "audio (base64) required" });
    return;
  }

  let buffer;
  try {
    buffer = Buffer.from(audio, "base64");
  } catch (e) {
    res.status(400).json({ error: "audio must be valid base64" });
    return;
  }
  // Whisper accepts up to 25MB. Our upper bound from Vercel body size is lower,
  // but double-check so a bad payload can't eat memory.
  if (buffer.length > 25 * 1024 * 1024) {
    res.status(413).json({ error: "audio too large (> 25MB)" });
    return;
  }
  if (buffer.length < 500) {
    res.status(400).json({ error: "audio too short" });
    return;
  }

  const ext =
    mimeType.includes("webm") ? "webm" :
    mimeType.includes("ogg")  ? "ogg" :
    mimeType.includes("wav")  ? "wav" :
    mimeType.includes("mp3") || mimeType.includes("mpeg") ? "mp3" :
    mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a" :
    "webm";

  try {
    const openai = new OpenAI({ apiKey });
    // Use the SDK's toFile helper so we don't need a global File/Blob polyfill.
    const file = await OpenAI.toFile(buffer, `audio.${ext}`, { type: mimeType });
    const result = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: language || undefined,
      // prompt biases the transcript toward consulting vocabulary; harmless otherwise
      prompt: "consulting case interview: framework, recommendation, market entry, profitability, NPV, hypothesis",
    });
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      text: (result.text || "").trim(),
      bytes: buffer.length,
    });
  } catch (err) {
    console.error("transcribe error:", err);
    res.status(500).json({ error: err.message || "transcribe failed" });
  }
};
