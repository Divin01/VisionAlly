// src/services/GeminiLiveService.js
// Manages the WebSocket connection to Google Gemini Live API.
// Client-side direct connection — no backend required for prototype.
// Follows best practices from: https://ai.google.dev/gemini-api/docs/live-api

import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

// ─── Config ───────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE'; // Replace before running
const GEMINI_MODEL   = 'gemini-live-2.5-flash';
const WS_URL         = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

// Audio settings (must match Gemini Live requirements)
const INPUT_SAMPLE_RATE  = 16000;  // Gemini expects 16 kHz input
const OUTPUT_SAMPLE_RATE = 24000;  // Gemini outputs at 24 kHz
const CHUNK_INTERVAL_MS  = 200;    // Chunked recording interval

// Video optimisation (per best practices — 1 FPS, JPEG, low token cost)
const VIDEO_FPS_INTERVAL_MS = 1000; // 1 frame per second

// ─── WAV Header Utility ───────────────────────────────────────────────────────
/**
 * Prepends a standard WAV header to raw PCM bytes so expo-av can play them.
 */
function buildWavHeader(pcmByteLength, sampleRate = OUTPUT_SAMPLE_RATE, channels = 1, bitsPerSample = 16) {
  const byteRate   = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const buf  = new ArrayBuffer(44);
  const view = new DataView(buf);

  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0,  'RIFF');
  view.setUint32(4,  36 + pcmByteLength, true);
  writeStr(8,  'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16,            true);  // chunk size
  view.setUint16(20,  1,            true);  // PCM = 1
  view.setUint16(22,  channels,     true);
  view.setUint32(24,  sampleRate,   true);
  view.setUint32(28,  byteRate,     true);
  view.setUint16(32,  blockAlign,   true);
  view.setUint16(34,  bitsPerSample,true);
  writeStr(36, 'data');
  view.setUint32(40,  pcmByteLength,true);

  return buf;
}

// ─── Base64 ↔ Binary Helpers ──────────────────────────────────────────────────
function base64ToUint8Array(b64) {
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function uint8ArrayToBase64(arr) {
  let binary = '';
  arr.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

// ─── System Instruction Builder ───────────────────────────────────────────────
/**
 * Builds a concise, optimised system prompt (40-60% shorter than verbose prompts,
 * per Live API best practices) from the user's About Me profile + optional job context.
 *
 * @param {object} profile  - The AboutMe Firestore document
 * @param {string} jobText  - Plain-text summary of the job offer (may be empty)
 */
export function buildSystemInstruction(profile, jobText = '') {
  const {
    firstName        = 'Candidate',
    disability       = 'None disclosed',
    accommodation    = '',
    field            = 'General',
    experience       = '0',
    education        = 'Not specified',
    skills           = [],
    careerGoal       = 'Full-time employment',
  } = profile;

  const jobContext = jobText
    ? `\n\nJob/Opportunity Context:\n${jobText}\nBase all technical questions strictly on the requirements above.`
    : '\n\nNo specific job context provided — use general industry-relevant questions.';

  const accommodationNote = accommodation
    ? `\nAccommodation needs: ${accommodation}. Respect this in pacing and communication style.`
    : '';

  return `
**Persona:**
You are VisionAlly, a warm and professional AI interview coach specialising in supporting people with disabilities. Speak clearly, at a measured pace. ONLY respond in English.

**Candidate Profile:**
- Name: ${firstName}
- Disability: ${disability}${accommodationNote}
- Field: ${field} | Experience: ${experience} year(s)
- Education: ${education}
- Skills: ${skills.filter(Boolean).join(', ') || 'Not specified'}
- Career Goal: ${careerGoal}
${jobContext}

**Interview Flow (follow in exact order):**
1. INTRO — already played externally. When the user clicks "Start", begin Q1 immediately without re-greeting.
2. QUESTIONS — Ask exactly 4 questions, one at a time. Wait until the user is completely finished speaking before responding. Never interrupt.
   - Q1 (always): "Can you start by telling me a bit about yourself and your background?"
   - Q2–Q4: Generate context-relevant questions based on the profile and job context above, increasing in depth.
3. FEEDBACK LOOP — After EACH user answer, give brief feedback (2 sentences max): one strength, one specific tip. Then immediately ask the next question.
4. CLOSE — After Q4 feedback, say: "That wraps up today's session, ${firstName}. You did a great job. Your feedback summary is being prepared now — well done!" Then stop speaking.

**Rules (non-negotiable):**
- Max 60 words per response (approx. 15 seconds of speech).
- Never speak while the user is speaking.
- Never be discouraging. Always be supportive and constructive.
- Assess confidence, clarity, structure (STAR), and pacing silently — mention in feedback only.
- If the user seems to struggle, offer a gentle prompt: "Take your time."
`.trim();
}

// ─── Gemini Live Service Class ────────────────────────────────────────────────
/**
 * Manages a single Gemini Live API WebSocket session.
 *
 * Usage:
 *   const svc = new GeminiLiveService();
 *   await svc.connect(systemInstruction);
 *   svc.onAudioReady = (wavUri) => { playAudio(wavUri); };
 *   svc.onTurnComplete = () => { enableMic(); };
 *   svc.onInterrupted = () => { stopPlayback(); };
 *   svc.sendAudioChunk(base64PcmData);
 *   svc.sendVideoFrame(base64JpegData);
 *   svc.disconnect();
 */
export class GeminiLiveService {
  constructor() {
    this._ws                = null;
    this._isConnected       = false;
    this._isSetupComplete   = false;
    this._audioBuffer       = [];   // accumulated PCM chunks for current turn
    this._currentSound      = null; // expo-av Sound object
    this._resumptionToken   = null;

    // Public callbacks — set these before connecting
    this.onSetupComplete  = null;  // () => void
    this.onAudioReady     = null;  // (wavFileUri: string) => void
    this.onTurnComplete   = null;  // () => void
    this.onInterrupted    = null;  // () => void
    this.onSessionEnded   = null;  // () => void
    this.onError          = null;  // (error: Error) => void
  }

  // ── Public: Connect ──────────────────────────────────────────────────────────
  async connect(systemInstruction) {
    return new Promise((resolve, reject) => {
      try {
        this._ws = new WebSocket(WS_URL);

        this._ws.onopen = () => {
          this._isConnected = true;
          // Send setup message immediately on connection
          const setupMsg = {
            setup: {
              model: `models/${GEMINI_MODEL}`,
              generation_config: {
                response_modalities: ['AUDIO'],
                speech_config: {
                  voice_config: {
                    prebuilt_voice_config: { voice_name: 'Aoede' }, // Clear, professional voice
                  },
                },
              },
              system_instruction: {
                parts: [{ text: systemInstruction }],
              },
              // CRITICAL: Enables sessions longer than 2 minutes (per best practices)
              context_window_compression: {
                trigger_tokens: 25600,
                sliding_window: { target_tokens: 12800 },
              },
            },
          };
          this._ws.send(JSON.stringify(setupMsg));
        };

        this._ws.onmessage = async (event) => {
          await this._handleServerMessage(event.data, resolve);
        };

        this._ws.onerror = (err) => {
          console.error('[GeminiLive] WebSocket error:', err);
          if (this.onError) this.onError(new Error('WebSocket connection error'));
          reject(err);
        };

        this._ws.onclose = (evt) => {
          console.log('[GeminiLive] Connection closed:', evt.code, evt.reason);
          this._isConnected = false;
          if (evt.code !== 1000 && this.onSessionEnded) this.onSessionEnded();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  // ── Public: Send Audio Chunk ─────────────────────────────────────────────────
  /**
   * Send a base64-encoded PCM (16 kHz, 16-bit mono) audio chunk.
   * Call this every ~200 ms while the user is speaking.
   */
  sendAudioChunk(base64Pcm) {
    if (!this._isConnected || !this._isSetupComplete) return;
    this._safeSend({
      realtime_input: {
        media_chunks: [{ mime_type: 'audio/pcm;rate=16000', data: base64Pcm }],
      },
    });
  }

  // ── Public: Send Video Frame ─────────────────────────────────────────────────
  /**
   * Send a base64-encoded JPEG image frame (1 FPS recommended).
   * Gemini uses this for non-verbal cue analysis (eye contact, confidence).
   */
  sendVideoFrame(base64Jpeg) {
    if (!this._isConnected || !this._isSetupComplete) return;
    this._safeSend({
      realtime_input: {
        media_chunks: [{ mime_type: 'image/jpeg', data: base64Jpeg }],
      },
    });
  }

  // ── Public: Send Text Prompt ─────────────────────────────────────────────────
  /**
   * Inject a text prompt (used to trigger the AI intro speech).
   */
  sendTextPrompt(text) {
    if (!this._isConnected || !this._isSetupComplete) return;
    this._safeSend({
      client_content: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turn_complete: true,
      },
    });
  }

  // ── Public: Disconnect ───────────────────────────────────────────────────────
  disconnect() {
    if (this._ws && this._isConnected) {
      this._ws.close(1000, 'Session ended by user');
    }
    this._isConnected     = false;
    this._isSetupComplete = false;
    this._audioBuffer     = [];
    if (this._currentSound) {
      this._currentSound.stopAsync().catch(() => {});
      this._currentSound.unloadAsync().catch(() => {});
      this._currentSound = null;
    }
  }

  // ── Private: Handle Server Messages ─────────────────────────────────────────
  async _handleServerMessage(raw, resolveSetup) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    // 1) Setup complete
    if (msg.setupComplete !== undefined) {
      this._isSetupComplete = true;
      if (this.onSetupComplete) this.onSetupComplete();
      if (resolveSetup) resolveSetup();
      return;
    }

    // 2) Session resumption token (save for reconnects)
    if (msg.sessionResumptionUpdate?.newHandle) {
      this._resumptionToken = msg.sessionResumptionUpdate.newHandle;
    }

    // 3) GoAway — server is about to close, handle gracefully
    if (msg.goAway) {
      console.warn('[GeminiLive] GoAway received, time left:', msg.goAway.timeLeft);
      if (this.onSessionEnded) this.onSessionEnded();
      return;
    }

    // 4) Server content (audio response)
    const content = msg.serverContent;
    if (!content) return;

    // 4a) Interrupted — user barged in, discard buffered audio immediately
    if (content.interrupted) {
      this._audioBuffer = [];
      await this._stopCurrentAudio();
      if (this.onInterrupted) this.onInterrupted();
      return;
    }

    // 4b) Accumulate audio chunks
    const parts = content.modelTurn?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('audio/pcm') && part.inlineData.data) {
        this._audioBuffer.push(part.inlineData.data); // base64 PCM at 24 kHz
      }
    }

    // 4c) Turn complete — flush buffered audio as a WAV and play it
    if (content.turnComplete) {
      if (this._audioBuffer.length > 0) {
        const wavUri = await this._flushAudioBufferToWav();
        if (wavUri && this.onAudioReady) {
          this.onAudioReady(wavUri);
        }
        this._audioBuffer = [];
      }
      if (this.onTurnComplete) this.onTurnComplete();
    }
  }

  // ── Private: Flush PCM Buffer → WAV File ────────────────────────────────────
  async _flushAudioBufferToWav() {
    try {
      // Decode all base64 chunks and concatenate
      const arrays = this._audioBuffer.map(b64 => base64ToUint8Array(b64));
      const totalLen = arrays.reduce((sum, a) => sum + a.length, 0);
      const pcm = new Uint8Array(totalLen);
      let offset = 0;
      arrays.forEach(a => { pcm.set(a, offset); offset += a.length; });

      // Build WAV = 44-byte header + PCM data
      const header    = buildWavHeader(pcm.length, OUTPUT_SAMPLE_RATE);
      const headerArr = new Uint8Array(header);
      const wav       = new Uint8Array(headerArr.length + pcm.length);
      wav.set(headerArr, 0);
      wav.set(pcm, headerArr.length);

      // Write to a temp file that expo-av can play
      const uri = `${FileSystem.cacheDirectory}gemini_audio_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(uri, uint8ArrayToBase64(wav), {
        encoding: FileSystem.EncodingType.Base64,
      });

      return uri;
    } catch (err) {
      console.error('[GeminiLive] Failed to build WAV:', err);
      return null;
    }
  }

  // ── Private: Stop Any Playing Audio ─────────────────────────────────────────
  async _stopCurrentAudio() {
    if (this._currentSound) {
      try {
        await this._currentSound.stopAsync();
        await this._currentSound.unloadAsync();
      } catch { /* ignore */ }
      this._currentSound = null;
    }
  }

  // ── Private: Safe WebSocket Send ────────────────────────────────────────────
  _safeSend(payload) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      try {
        this._ws.send(JSON.stringify(payload));
      } catch (err) {
        console.error('[GeminiLive] Send error:', err);
      }
    }
  }

  get isReady() { return this._isConnected && this._isSetupComplete; }
  get resumptionToken() { return this._resumptionToken; }
}

// ─── Document Analyser (REST — not Live) ─────────────────────────────────────
/**
 * Uses the standard Gemini REST API to extract job requirements from a document
 * (image or PDF). The resulting text is injected into the Live session's system
 * instructions, making the AI highly focused on the real offer.
 *
 * @param {string} base64Data   - base64 content of the file
 * @param {string} mimeType     - 'image/jpeg' | 'image/png' | 'application/pdf'
 * @returns {Promise<string>}   - Plain-text summary of the job offer
 */
export async function analyseJobDocument(base64Data, mimeType) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{
      parts: [
        {
          inline_data: { mime_type: mimeType, data: base64Data },
        },
        {
          text: 'Extract the following from this job/internship posting in plain text (no markdown): Job title, Company name, Key responsibilities (bullet list), Required qualifications, Required skills, Nice-to-have skills, and any other important context for interview preparation. Be concise.',
        },
      ],
    }],
    generation_config: { max_output_tokens: 600 },
  };

  const res  = await fetch(endpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}