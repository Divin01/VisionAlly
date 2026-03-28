// src/services/GeminiLiveService.js
// ─────────────────────────────────────────────────────────────────────────────
// BUGS FIXED IN THIS VERSION:
//
// ROOT CAUSE — ALL prior crashes / "goes back to home" were caused by this:
//
//   The Gemini Live API requires camelCase JSON keys.
//   The previous version sent snake_case throughout, which the API silently
//   rejected. The WebSocket closed immediately, onSessionEnded fired before
//   sessionStartedRef was set to true, so safeGoBack() was called → home.
//
//   Specific snake_case → camelCase fixes:
//     generation_config        → generationConfig
//     response_modalities      → responseModalities
//     speech_config            → speechConfig
//     voice_config             → voiceConfig
//     prebuilt_voice_config    → prebuiltVoiceConfig
//     voice_name               → voiceName
//     system_instruction       → systemInstruction
//     context_window_compression → contextWindowCompression
//     trigger_tokens           → triggerTokens
//     sliding_window           → slidingWindow
//     target_tokens            → targetTokens
//     realtime_input           → realtimeInput
//     media_chunks             → (removed — wrong format entirely)
//     mime_type                → mimeType
//     client_content           → (removed — use realtimeInput.text instead)
//     turn_complete            → turnComplete
//
//   Audio message format was also completely wrong:
//     OLD (broken):  { realtime_input: { media_chunks: [{ mime_type, data }] } }
//     NEW (correct): { realtimeInput: { audio: { mimeType: "audio/pcm", data } } }
//
//   Text message format was also wrong:
//     OLD (broken):  { client_content: { turns: [...], turn_complete: true } }
//     NEW (correct): { realtimeInput: { text: "..." } }
//                    — matches the working geminilive.js reference implementation
//
//   Model name: 'gemini-2.0-flash-exp' is deprecated.
//     Use 'gemini-2.0-flash-live-001' (stable) or check AI Studio for latest.
//
// ─────────────────────────────────────────────────────────────────────────────

import * as FileSystem from 'expo-file-system';
import CONFIG from '../../config';

// ─── Config ───────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = CONFIG.GEMINI_API_KEY;

// ✅ Valid Live API model names (as of mid-2025):
//    'gemini-2.0-flash-live-001'       ← stable, recommended
//    'gemini-live-2.5-flash-preview'   ← latest preview
// ❌ 'gemini-2.0-flash-exp'            ← DEPRECATED, causes 1008 close
const GEMINI_MODEL = 'gemini-3.1-flash-live-preview';

const WS_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const WS_URL  = `${WS_BASE}?key=${GEMINI_API_KEY}`;

const OUTPUT_SAMPLE_RATE = 24000; // Gemini outputs 24 kHz PCM

// ─── WAV Header ───────────────────────────────────────────────────────────────
function buildWavHeader(pcmLen, sr = OUTPUT_SAMPLE_RATE, ch = 1, bits = 16) {
  const byteRate = sr * ch * (bits / 8);
  const blkAlign = ch * (bits / 8);
  const buf  = new ArrayBuffer(44);
  const v    = new DataView(buf);
  const s    = (off, str) => {
    for (let i = 0; i < str.length; i++) v.setUint8(off + i, str.charCodeAt(i));
  };
  s(0, 'RIFF');  v.setUint32(4, 36 + pcmLen, true);
  s(8, 'WAVE');  s(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, ch, true); v.setUint32(24, sr, true);
  v.setUint32(28, byteRate, true); v.setUint16(32, blkAlign, true);
  v.setUint16(34, bits, true); s(36, 'data'); v.setUint32(40, pcmLen, true);
  return buf;
}

function b64ToU8(b64) {
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function u8ToB64(arr) {
  let s = '';
  arr.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s);
}

// ─── System Instruction Builder ───────────────────────────────────────────────
export function buildSystemInstruction(profile = {}, jobText = '') {
  const {
    firstName     = 'Candidate',
    disability    = 'None disclosed',
    accommodation = '',
    field         = 'General',
    experience    = '0',
    education     = 'Not specified',
    skills        = [],
    careerGoal    = 'Full-time employment',
  } = profile;

  const jobCtx = jobText
    ? `\n\nJob Context:\n${jobText}\nBase technical questions strictly on these requirements.`
    : '\n\nNo specific job provided — use general industry questions.';

  const accNote = accommodation
    ? `\nAccommodation: ${accommodation}. Respect this in pacing and style.`
    : '';

  return `
**Persona:**
You are VisionAlly, a warm professional AI interview coach for people with disabilities. Speak clearly at a measured pace. ONLY respond in English.

**Candidate:**
- Name: ${firstName}
- Disability: ${disability}${accNote}
- Field: ${field} | Experience: ${experience} yr(s)
- Education: ${education}
- Skills: ${skills.filter(Boolean).join(', ') || 'Not specified'}
- Goal: ${careerGoal}
${jobCtx}

**Interview Flow (exact order):**
1. INTRO — already done externally. When user taps Start, go straight to Q1. No re-greeting.
2. QUESTIONS — Exactly 4 questions, one at a time. Wait silently until user is completely done. NEVER interrupt.
   Q1 (always): "Can you start by telling me a bit about yourself and your background?"
   Q2–Q4: Relevant questions increasing in depth based on profile and job context.
3. FEEDBACK — After EACH answer: 2 sentences (one strength + one tip). Then next question immediately.
4. CLOSE — After Q4 feedback: "That wraps up today's session, ${firstName}. Well done! Your summary is being prepared." Then stop.

**Rules (non-negotiable):**
- Max 60 words per response (~15 seconds speech).
- Never speak while user speaks.
- Always supportive. Never discouraging.
- If user struggles: "Take your time."
`.trim();
}

// ─── GeminiLiveService ────────────────────────────────────────────────────────
export class GeminiLiveService {
  constructor() {
    this._ws              = null;
    this._isConnected     = false;
    this._isSetupComplete = false;
    this._audioBuffer     = [];
    this._resumptionToken = null;

    // Set these before calling connect()
    this.onSetupComplete = null; // ()
    this.onAudioReady    = null; // (wavUri: string)
    this.onTurnComplete  = null; // ()
    this.onInterrupted   = null; // ()
    this.onSessionEnded  = null; // (code, reason)
    this.onError         = null; // (Error)
  }

  async connect(systemInstruction) {
    return new Promise((resolve, reject) => {
    if (this._ws) {
      try { this._ws.close(); } catch { /* ignore */ }
      this._ws = null;
    }
      if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('YOUR_')) {
        const e = new Error('GEMINI_API_KEY not configured in config.js');
        console.error('[GeminiLive]', e.message);
        if (this.onError) this.onError(e);
        reject(e);
        return;
      }

      console.log('[GeminiLive] Connecting, model:', GEMINI_MODEL);
      try {
        this._ws = new WebSocket(WS_URL);
      } catch (e) {
        reject(e);
        return;
      }

this._ws.send(JSON.stringify({
  setup: {
    model: `models/${GEMINI_MODEL}`,
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: 'Aoede',
          },
        },
      },
    },
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    // ❌ REMOVE THIS ENTIRE BLOCK — causes clean 1000 close on v1beta
    // contextWindowCompression: {
    //   triggerTokens: 25600,
    //   slidingWindow: { targetTokens: 12800 },
    // },
  },
}));
      this._ws.onmessage = async (evt) => {
        await this._handleMessage(evt.data, resolve);
      };
      let settled = false;

      this._ws.onerror = (err) => {
        if (settled) return;
        settled = true;
        console.error('[GeminiLive] WS error:', err);
        const e = new Error('WebSocket error — verify API key and internet connection');
        if (this.onError) this.onError(e);
        reject(e);
      };

      this._ws.onclose = (evt) => {
        console.log('[GeminiLive] WS closed:', evt.code, evt.reason);
        this._isConnected     = false;
        this._isSetupComplete = false;
        if (!settled && evt.code !== 1000 && evt.code !== 1001) {
          settled = true;
          if (this.onSessionEnded) this.onSessionEnded(evt.code, evt.reason);
        } else if (evt.code !== 1000 && evt.code !== 1001) {
          if (this.onSessionEnded) this.onSessionEnded(evt.code, evt.reason);
        }
      };
    });
  }

  // ✅ FIXED: correct camelCase format + correct audio field structure
  //    OLD (broken): { realtime_input: { media_chunks: [{ mime_type, data }] } }
  //    NEW (correct): { realtimeInput: { audio: { mimeType, data } } }
  sendAudioChunk(b64Pcm) {
    if (!this.isReady) return;
    this._send({
      realtimeInput: {                               // ✅ was: realtime_input
        audio: {                                     // ✅ was: media_chunks array (wrong)
          mimeType: 'audio/pcm',                     // ✅ was: mime_type inside chunk object
          data: b64Pcm,
        },
      },
    });
  }

  // ✅ FIXED: use realtimeInput.text (matches geminilive.js reference)
  //    OLD (broken): { client_content: { turns: [...], turn_complete: true } }
  //    NEW (correct): { realtimeInput: { text: "..." } }
  sendTextPrompt(text) {
    if (!this.isReady) return;
    this._send({
      realtimeInput: {                               // ✅ was: client_content (wrong key + format)
        text: text,
      },
    });
  }

  // ✅ FIXED: for cases where you need a full turn (e.g. kicking off the interview)
  //    Use clientContent with turnComplete (camelCase) when you need a hard turn boundary.
  sendClientTurn(text) {
    if (!this.isReady) return;
    this._send({
      clientContent: {                               // camelCase ✅
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,                          // camelCase ✅ was: turn_complete
      },
    });
  }

  sendVideoFrame(b64Jpeg) {
    if (!this.isReady) return;
    this._send({
      realtimeInput: {                               // ✅ was: realtime_input
        video: {                                     // ✅ was: media_chunks array (wrong)
          mimeType: 'image/jpeg',                    // ✅ was: mime_type inside chunk object
          data: b64Jpeg,
        },
      },
    });
  }

  disconnect() {
    if (this._ws) {
      try { this._ws.close(1000, 'Session ended by user'); } catch { /* ignore */ }
      this._ws = null;
    }
    this._isConnected = this._isSetupComplete = false;
    this._audioBuffer = [];
  }

  async _handleMessage(raw, resolveSetup) {
    let msg;
    try { msg = JSON.parse(typeof raw === 'string' ? raw : await raw.text()); } catch { return; }

    if (msg.setupComplete !== undefined) {
      console.log('[GeminiLive] ✅ setupComplete');
      this._isSetupComplete = true;
      if (this.onSetupComplete) this.onSetupComplete();
      if (resolveSetup)         resolveSetup();
      return;
    }

    if (msg.sessionResumptionUpdate?.newHandle) {
      this._resumptionToken = msg.sessionResumptionUpdate.newHandle;
    }

    if (msg.goAway) {
      console.warn('[GeminiLive] GoAway received');
      if (this.onSessionEnded) this.onSessionEnded(0, 'GoAway');
      return;
    }

    const c = msg.serverContent;
    if (!c) return;

    if (c.interrupted) {
      this._audioBuffer = [];
      if (this.onInterrupted) this.onInterrupted();
      return;
    }

    for (const p of (c.modelTurn?.parts ?? [])) {
      if (p.inlineData?.mimeType?.startsWith('audio/pcm') && p.inlineData.data) {
        this._audioBuffer.push(p.inlineData.data);
      }
    }

    if (c.turnComplete) {
      if (this._audioBuffer.length > 0) {
        const wavUri = await this._flushToWav();
        if (wavUri && this.onAudioReady) this.onAudioReady(wavUri);
        this._audioBuffer = [];
      }
      if (this.onTurnComplete) this.onTurnComplete();
    }
  }

  async _flushToWav() {
    try {
      const chunks = this._audioBuffer.map(b => b64ToU8(b));
      const total  = chunks.reduce((s, a) => s + a.length, 0);
      const pcm    = new Uint8Array(total);
      let   off    = 0;
      chunks.forEach(c => { pcm.set(c, off); off += c.length; });

      const hdr = new Uint8Array(buildWavHeader(pcm.length));
      const wav = new Uint8Array(hdr.length + pcm.length);
      wav.set(hdr, 0);
      wav.set(pcm, hdr.length);

      const uri = `${FileSystem.cacheDirectory}va_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(uri, u8ToB64(wav), {
        encoding: FileSystem.EncodingType.Base64,
      });
      return uri;
    } catch (e) {
      console.error('[GeminiLive] _flushToWav:', e);
      return null;
    }
  }

  _send(payload) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      try { this._ws.send(JSON.stringify(payload)); } catch (e) {
        console.error('[GeminiLive] _send error:', e);
      }
    }
  }

  get isReady() { return this._isConnected && this._isSetupComplete; }
  get resumptionToken() { return this._resumptionToken; }
}

// ─── Document Analyser ────────────────────────────────────────────────────────
export async function analyseJobDocument(base64Data, mimeType) {
  const url  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: 'Extract in plain text (no markdown): Job title, Company, Key responsibilities, Required skills, Nice-to-haves. Be concise.' },
      ],
    }],
    generationConfig: { maxOutputTokens: 500 },
  };
  const res  = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}