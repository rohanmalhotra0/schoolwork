/* =========================================================
   rohan.lab — voice module
   Exposes: window.ChatLab.voice = {
     VOICES, DEFAULT_VOICE,
     Recorder,           // class — wraps MediaRecorder + silence detection
     transcribe(blob),   // POSTs base64 → /api/transcribe → text
     speak(text, voice), // POSTs → /api/tts → returns an <audio>
     analyze(transcript, durationMs), // filler words, WPM, signposts
   }
   ========================================================= */
(function(){
  "use strict";

  const VOICES = ["alloy","echo","fable","onyx","nova","shimmer"];
  const DEFAULT_VOICE = "onyx";

  /* ---------- Recorder ---------- */
  // MediaRecorder + an AnalyserNode for level metering and simple silence
  // detection. Caller passes onLevel(rms) for waveform rendering and onStop
  // for the finished Blob.
  class Recorder {
    constructor(opts = {}){
      this.stream = null;
      this.mediaRecorder = null;
      this.chunks = [];
      this.audioContext = null;
      this.analyser = null;
      this.rafId = null;
      this.silenceStart = null;
      this.startTime = 0;
      this.stopping = false;
      this.onLevel = opts.onLevel || (() => {});
      this.onAutoStop = opts.onAutoStop || null;
      this.onStop = opts.onStop || (() => {});
      this.onError = opts.onError || (() => {});
      this.autoStopMs = opts.autoStopMs != null ? opts.autoStopMs : 2000;
      this.silenceRms  = opts.silenceRms  != null ? opts.silenceRms  : 10;
      this.minDurationMs = opts.minDurationMs != null ? opts.minDurationMs : 1200;
      this._autoStopEnabled = opts.autoStop !== false;
    }

    async start(){
      if (!navigator.mediaDevices?.getUserMedia) {
        this.onError(new Error("mic not supported in this browser"));
        return;
      }
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (err) {
        this.onError(err);
        return;
      }

      const mimeType =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
        MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" :
        MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" :
        "";
      this.chunks = [];
      try {
        this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
      } catch (err) {
        this.onError(err);
        return;
      }
      this.mediaRecorder.addEventListener("dataavailable", (e) => {
        if (e.data && e.data.size) this.chunks.push(e.data);
      });
      this.mediaRecorder.addEventListener("stop", () => this._finalize());
      this.mediaRecorder.addEventListener("error", (e) => this.onError(e.error || e));
      this.startTime = Date.now();
      this.mediaRecorder.start(250);
      this._setupAnalyser();
    }

    _setupAnalyser(){
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.audioContext = new Ctx();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);
      const buf = new Uint8Array(this.analyser.frequencyBinCount);

      const loop = () => {
        if (this.stopping) return;
        this.analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = buf[i] - 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        this.onLevel(rms);

        // silence → auto-stop after autoStopMs (if enabled + min duration passed)
        if (this._autoStopEnabled && rms < this.silenceRms) {
          if (!this.silenceStart) this.silenceStart = Date.now();
          else if (
            Date.now() - this.silenceStart > this.autoStopMs &&
            Date.now() - this.startTime   > this.minDurationMs
          ) {
            if (this.onAutoStop) this.onAutoStop();
            this.stop();
            return;
          }
        } else {
          this.silenceStart = null;
        }
        this.rafId = requestAnimationFrame(loop);
      };
      loop();
    }

    stop(){
      if (this.stopping) return;
      this.stopping = true;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
        try { this.mediaRecorder.stop(); } catch {}
      } else {
        this._finalize();
      }
    }

    _finalize(){
      const mime = this.mediaRecorder?.mimeType || "audio/webm";
      const blob = this.chunks.length ? new Blob(this.chunks, { type: mime }) : null;
      const durationMs = Date.now() - this.startTime;
      if (this.stream) this.stream.getTracks().forEach(t => t.stop());
      if (this.audioContext) { try { this.audioContext.close(); } catch {} }
      this.stream = null;
      this.onStop({ blob, durationMs, mimeType: mime });
    }
  }

  /* ---------- Whisper (server) ---------- */
  async function transcribe(blob){
    if (!blob || !blob.size) throw new Error("no audio to transcribe");
    const b64 = await blobToBase64(blob);
    const res = await fetch("/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: b64, mimeType: blob.type || "audio/webm" }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `transcribe HTTP ${res.status}`);
    }
    const json = await res.json();
    return (json.text || "").trim();
  }

  /* ---------- TTS (server) ---------- */
  async function speak(text, voice = DEFAULT_VOICE, signal){
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
      signal,
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `tts HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = "auto";
    // clean up the object URL when audio ends
    audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
    audio.addEventListener("error",  () => URL.revokeObjectURL(url), { once: true });
    return audio;
  }

  /* ---------- Analytics ---------- */
  // Single-line filler words + multi-word phrases. Regex built per word with
  // word boundaries to avoid matching "like" inside "likewise".
  const FILLERS = [
    "um","uh","er","ah","like","you know","i mean","basically",
    "literally","actually","sort of","kind of","right","so","okay","well",
  ];
  const SIGNPOSTS = [
    "first","second","third","next","finally","my recommendation","framework",
    "in summary","in conclusion","the answer","i would","to start","let me",
  ];

  function analyze(transcript, durationMs){
    const text = String(transcript || "").toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const minutes = Math.max(0.05, (durationMs || 0) / 60000);
    const wpm = Math.round(wordCount / minutes);

    const fillers = {};
    let fillerTotal = 0;
    FILLERS.forEach(f => {
      const re = new RegExp(`\\b${f.replace(/\s+/g, "\\s+")}\\b`, "g");
      const n = (text.match(re) || []).length;
      if (n > 0) { fillers[f] = n; fillerTotal += n; }
    });
    const signposts = [];
    SIGNPOSTS.forEach(s => {
      if (text.includes(s)) signposts.push(s);
    });

    let band = "good";
    if (wpm < 110) band = "too-slow";
    else if (wpm > 175) band = "too-fast";

    return { wpm, wordCount, fillers, fillerTotal, signposts, band };
  }

  /* ---------- utils ---------- */
  function blobToBase64(blob){
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => {
        const s = r.result;
        const i = typeof s === "string" ? s.indexOf(",") : -1;
        resolve(i >= 0 ? s.slice(i + 1) : s);
      };
      r.onerror = () => reject(r.error || new Error("FileReader failed"));
      r.readAsDataURL(blob);
    });
  }

  window.ChatLab = window.ChatLab || {};
  window.ChatLab.voice = {
    VOICES,
    DEFAULT_VOICE,
    Recorder,
    transcribe,
    speak,
    analyze,
  };
})();
