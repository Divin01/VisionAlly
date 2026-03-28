// src/screens/main/InterviewRoomScreen.js
// The live interview room. Full-screen camera + Gemini Live API bidirectional audio.
// Token-optimisation strategies applied throughout (1 FPS JPEG, 16 kHz PCM chunks,
// context window compression, concise system instructions).

import React, {
  useState, useRef, useEffect, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Platform, StatusBar, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Audio }         from 'expo-av';
import * as FileSystem   from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons }      from '@expo/vector-icons';
import {
  GeminiLiveService,
  buildSystemInstruction,
} from '../../services/GeminiLiveService';
import { InterviewStorageService } from '../../services/InterviewStorageService';

const { width: W, height: H } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  primary:     '#8B5CF6',
  primaryDark: '#7C3AED',
  white:       '#FFFFFF',
  black:       '#000000',
  error:       '#EF4444',
  warning:     '#F59E0B',
  success:     '#10B981',
  glass:       'rgba(255,255,255,0.12)',
  glassDark:   'rgba(0,0,0,0.45)',
  liveRed:     '#EF4444',
};

// ─── Interview State Machine ──────────────────────────────────────────────────
const STATE = {
  LOADING:       'loading',      // Connecting + analysing documents
  READY:         'ready',        // AI intro playing, waiting for user Start tap
  INTERVIEWING:  'interviewing', // Active question-answer loop
  AI_SPEAKING:   'ai_speaking',  // AI is playing audio
  USER_SPEAKING: 'user_speaking',// Mic is open
  ENDED:         'ended',        // All 4 questions done, session saved
};

// ─── Pulse Animation Helper ───────────────────────────────────────────────────
function usePulse(active) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.18, duration: 700, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1,    duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      anim.stopAnimation();
      anim.setValue(1);
    }
  }, [active]);
  return anim;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InterviewRoomScreen({ navigation, route }) {
  const { profile, jobText, jobRole, jobCompany } = route.params ?? {};

  // ── Permissions ──────────────────────────────────────────────────────────────
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [micPermission,    requestMic]    = useMicrophonePermissions();

  // ── UI State ─────────────────────────────────────────────────────────────────
  const [roomState,     setRoomState]     = useState(STATE.LOADING);
  const [isMuted,       setIsMuted]       = useState(false);
  const [isCameraOff,   setIsCameraOff]   = useState(false);
  const [loadingMsg,    setLoadingMsg]    = useState('Connecting to AI…');
  const [questionIndex, setQuestionIndex] = useState(0); // 0 = not started, 1-4 = active
  const [statusLabel,   setStatusLabel]   = useState('');

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const cameraRef           = useRef(null);
  const geminiSvc           = useRef(null);
  const recordingRef        = useRef(null);
  const playbackSoundRef    = useRef(null);
  const chunkIntervalRef    = useRef(null);
  const videoIntervalRef    = useRef(null);
  const sessionStartRef     = useRef(null);
  const transcriptRef       = useRef([]);  // QAExchange[]
  const currentQRef         = useRef('');  // current question text
  const currentAnswerRef    = useRef('');  // accumulated user answer text (for storage)
  const currentFeedbackRef  = useRef('');  // accumulated AI feedback
  const aiTurnBufferRef     = useRef('');  // AI text buffer for transcript
  const isMutedRef          = useRef(false);

  // Sync isMuted ref
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // ── Animations ────────────────────────────────────────────────────────────────
  const startPulse   = usePulse(roomState === STATE.READY);
  const micPulse     = usePulse(roomState === STATE.USER_SPEAKING);
  const fadeAnim     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // ─── Initialise on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // 1. Request permissions
      if (!cameraPermission?.granted)  await requestCamera();
      if (!micPermission?.granted)     await requestMic();

      // 2. Configure expo-av audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS:              true,
        playsInSilentModeIOS:            true,
        staysActiveInBackground:         false,
        interruptionModeIOS:             Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid:         Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        shouldDuckAndroid:               false,
        playThroughEarpieceAndroid:      false,
      });

      setLoadingMsg('Building your personalised session…');

      // 3. Build system instruction from profile + job context
      const sysInstruction = buildSystemInstruction(profile ?? {}, jobText ?? '');

      setLoadingMsg('Connecting to VisionAlly AI…');

      // 4. Create and connect Gemini Live service
      geminiSvc.current = new GeminiLiveService();

      geminiSvc.current.onSetupComplete = () => {
        setLoadingMsg('Almost ready…');
        // Trigger the AI intro speech
        geminiSvc.current.sendTextPrompt(
          `Hello, please greet the user by their first name (${profile?.firstName ?? 'there'}) ` +
          `and introduce yourself as VisionAlly in 2-3 warm sentences. ` +
          `Tell them you will begin the mock interview when they tap Start. Keep it under 15 seconds.`
        );
      };

      geminiSvc.current.onAudioReady = async (wavUri) => {
        await playAudio(wavUri);
      };

      geminiSvc.current.onTurnComplete = () => {
        // After AI finishes speaking in LOADING → transition to READY
        if (roomState === STATE.LOADING) {
          setRoomState(STATE.READY);
          setStatusLabel('Tap "Start" to begin');
        }
        // During interview → enable mic for user response
        if (roomState === STATE.AI_SPEAKING || roomState === STATE.INTERVIEWING) {
          setRoomState(STATE.USER_SPEAKING);
          setStatusLabel('Your turn — speak now');
          if (!isMutedRef.current) startMicCapture();
        }
      };

      geminiSvc.current.onInterrupted = () => {
        stopPlayback();
        if (!isMutedRef.current) startMicCapture();
        setRoomState(STATE.USER_SPEAKING);
        setStatusLabel('Listening…');
      };

      geminiSvc.current.onSessionEnded = () => {
        handleSessionEnd(false);
      };

      geminiSvc.current.onError = (err) => {
        console.error('[InterviewRoom] Gemini error:', err);
        Alert.alert('Connection Issue', 'Could not connect to the AI. Please check your internet and try again.');
        navigation.goBack();
      };

      try {
        await geminiSvc.current.connect(sysInstruction);
        sessionStartRef.current = Date.now();
      } catch (err) {
        console.error('[InterviewRoom] connect failed:', err);
        Alert.alert('Connection Failed', 'Could not reach the AI service. Please try again.');
        navigation.goBack();
      }
    })();

    return () => cleanup();
  }, []);

  // ─── Audio Playback ──────────────────────────────────────────────────────────
  const playAudio = useCallback(async (wavUri) => {
    try {
      await stopPlayback();
      setRoomState(STATE.AI_SPEAKING);
      setStatusLabel('VisionAlly is speaking…');

      const { sound } = await Audio.Sound.createAsync(
        { uri: wavUri },
        { shouldPlay: true, volume: 1.0 },
      );
      playbackSoundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          playbackSoundRef.current = null;
          // Clean up temp WAV file
          FileSystem.deleteAsync(wavUri, { idempotent: true }).catch(() => {});
        }
      });
    } catch (err) {
      console.error('[InterviewRoom] playAudio error:', err);
    }
  }, []);

  const stopPlayback = useCallback(async () => {
    if (playbackSoundRef.current) {
      try {
        await playbackSoundRef.current.stopAsync();
        await playbackSoundRef.current.unloadAsync();
      } catch { /* ignore */ }
      playbackSoundRef.current = null;
    }
  }, []);

  // ─── Mic Capture (chunked recording) ─────────────────────────────────────────
  /**
   * Record in 200 ms segments, strip the WAV header (44 bytes),
   * and send raw PCM to Gemini Live. Re-starts automatically for continuous streaming.
   */
  const startMicCapture = useCallback(async () => {
    if (recordingRef.current) return; // already recording
    try {
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        android: {
          extension:       '.wav',
          outputFormat:    Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder:    Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate:      16000,
          numberOfChannels:1,
          bitRate:         128000,
        },
        ios: {
          extension:          '.wav',
          outputFormat:       Audio.IOSOutputFormat.LINEARPCM,
          audioQuality:       Audio.IOSAudioQuality.HIGH,
          sampleRate:         16000,
          numberOfChannels:   1,
          bitRate:            256000,
          linearPCMBitDepth:  16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat:   false,
        },
        web: {},
      });
      await rec.startAsync();
      recordingRef.current = rec;

      // Send chunks every 200 ms (per best practices: 20ms–100ms; 200ms is good for prototype)
      chunkIntervalRef.current = setInterval(async () => {
        if (!recordingRef.current || isMutedRef.current) return;
        try {
          // Stop → read → restart cycle for chunked streaming
          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();
          if (uri) {
            const b64Full = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            // Strip 44-byte WAV header to get raw PCM, then re-encode
            // WAV header = 44 bytes → in base64 ≈ ceil(44/3)*4 = 60 chars
            // We slice raw bytes; decode → strip → re-encode
            const raw     = atob(b64Full);
            const pcmRaw  = raw.slice(44);  // remove WAV header bytes
            const pcmB64  = btoa(pcmRaw);
            geminiSvc.current?.sendAudioChunk(pcmB64);
            // Clean up temp file
            FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
          }
          // Restart recording for next chunk
          const newRec = new Audio.Recording();
          await newRec.prepareToRecordAsync({
            android: {
              extension: '.wav', outputFormat: Audio.AndroidOutputFormat.DEFAULT,
              audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
              sampleRate: 16000, numberOfChannels: 1, bitRate: 128000,
            },
            ios: {
              extension: '.wav', outputFormat: Audio.IOSOutputFormat.LINEARPCM,
              audioQuality: Audio.IOSAudioQuality.HIGH,
              sampleRate: 16000, numberOfChannels: 1, bitRate: 256000,
              linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false,
            },
            web: {},
          });
          await newRec.startAsync();
          recordingRef.current = newRec;
        } catch (err) {
          console.warn('[InterviewRoom] chunk send error:', err);
        }
      }, 200);

    } catch (err) {
      console.error('[InterviewRoom] startMicCapture error:', err);
    }
  }, []);

  const stopMicCapture = useCallback(async () => {
    clearInterval(chunkIntervalRef.current);
    chunkIntervalRef.current = null;
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch { /* ignore */ }
      recordingRef.current = null;
    }
  }, []);

  // ─── Video Frame Capture (1 FPS) ─────────────────────────────────────────────
  const startVideoCapture = useCallback(() => {
    if (videoIntervalRef.current) return;
    videoIntervalRef.current = setInterval(async () => {
      if (!cameraRef.current || isCameraOff) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality:  0.4,   // low quality = smaller JPEG = fewer tokens
          base64:   true,
          skipProcessing: true,
        });
        if (photo.base64) {
          geminiSvc.current?.sendVideoFrame(photo.base64);
        }
      } catch { /* camera might not be ready */ }
    }, 1000); // 1 FPS per best practices
  }, [isCameraOff]);

  const stopVideoCapture = useCallback(() => {
    clearInterval(videoIntervalRef.current);
    videoIntervalRef.current = null;
  }, []);

  // ─── Close Loading State (user exits during connection) ────────────────────────
  const handleCloseLoading = useCallback(async () => {
    Alert.alert(
      'Exit Interview Setup?',
      'Are you sure you want to exit? Your audio and video will be disconnected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: async () => {
            await cleanup();
            navigation.goBack();
          },
        },
      ]
    );
  }, [cleanup]);

  // ─── Start Interview (user taps "Start") ─────────────────────────────────────
  const handleStart = useCallback(async () => {
    if (roomState !== STATE.READY) return;
    setRoomState(STATE.INTERVIEWING);
    setQuestionIndex(1);
    setStatusLabel('Starting…');

    // Begin video capture for non-verbal analysis
    startVideoCapture();

    // Prompt AI to start the interview (Q1)
    geminiSvc.current?.sendTextPrompt(
      'The user has clicked Start. Begin the interview immediately with Question 1. Do not re-introduce yourself.'
    );
    setRoomState(STATE.AI_SPEAKING);
  }, [roomState, startVideoCapture]);

  // ─── Toggle Mute ─────────────────────────────────────────────────────────────
  const handleToggleMute = useCallback(async () => {
    const nowMuted = !isMuted;
    setIsMuted(nowMuted);
    if (nowMuted) {
      await stopMicCapture();
      setStatusLabel('Microphone muted');
    } else if (roomState === STATE.USER_SPEAKING) {
      await startMicCapture();
      setStatusLabel('Listening…');
    }
  }, [isMuted, roomState, stopMicCapture, startMicCapture]);

  // ─── Toggle Camera ────────────────────────────────────────────────────────────
  const handleToggleCamera = useCallback(() => {
    setIsCameraOff(prev => !prev);
  }, []);

  // ─── End Session ─────────────────────────────────────────────────────────────
  const handleEndPress = useCallback(() => {
    Alert.alert(
      'End Interview?',
      'Are you sure you want to end this session? Your progress will be saved.',
      [
        { text: 'Continue', style: 'cancel' },
        { text: 'End Session', style: 'destructive', onPress: () => handleSessionEnd(true) },
      ]
    );
  }, []);

  const handleSessionEnd = useCallback(async (manual = false) => {
    setRoomState(STATE.ENDED);
    setStatusLabel('Saving session…');

    await stopMicCapture();
    await stopPlayback();
    stopVideoCapture();
    geminiSvc.current?.disconnect();

    const durationMs = sessionStartRef.current ? Date.now() - sessionStartRef.current : 0;
    const completed  = !manual && transcriptRef.current.length >= 4;

    try {
      const savedId = await InterviewStorageService.saveSession({
        exchanges:   transcriptRef.current,
        profile:     profile ?? {},
        jobRole:     jobRole ?? '',
        jobCompany:  jobCompany ?? '',
        systemPrompt:'',
        durationMs,
        status:      completed ? 'completed' : 'incomplete',
      });
      console.log('[InterviewRoom] Session saved:', savedId);
    } catch (err) {
      console.error('[InterviewRoom] Save error:', err);
    }

    // Navigate back with a refresh flag
    navigation.replace('Main', { refreshInterviews: true });
  }, [stopMicCapture, stopPlayback, stopVideoCapture, profile, jobRole, jobCompany, navigation]);

  // ─── Cleanup ──────────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    stopMicCapture();
    stopPlayback();
    stopVideoCapture();
    geminiSvc.current?.disconnect();
  }, [stopMicCapture, stopPlayback, stopVideoCapture]);

  // ─── Render ───────────────────────────────────────────────────────────────────
  const isLoading = roomState === STATE.LOADING;
  const isReady   = roomState === STATE.READY;
  const isEnded   = roomState === STATE.ENDED;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Camera or Black Background ─────────────────────────────────────── */}
      {!isCameraOff && cameraPermission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mirror
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cameraOff]}>
          <Ionicons name="videocam-off" size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.cameraOffText}>Camera off</Text>
        </View>
      )}

      {/* ── Full-screen dark overlay ─────────────────────────────────────────── */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent', 'transparent', 'rgba(0,0,0,0.70)']}
        locations={[0, 0.25, 0.65, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <Animated.View style={[styles.topBar, { opacity: fadeAnim }]}>
        {/* LIVE Indicator */}
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        {/* Title */}
        <Text style={styles.topBarTitle}>VisionAlly</Text>

        {/* Q counter */}
        {questionIndex > 0 && (
          <View style={styles.qCounter}>
            <Text style={styles.qCounterText}>Q {questionIndex}/4</Text>
          </View>
        )}
      </Animated.View>

      {/* ── LOADING OVERLAY ─────────────────────────────────────────────────── */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          {/* Close Button (top right) */}
          <TouchableOpacity
            style={styles.loadingCloseBtn}
            onPress={handleCloseLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={32} color={C.white} />
          </TouchableOpacity>

          {/* Loading Indicator & Message */}
          <ActivityIndicator size="large" color={C.white} />
          <Text style={styles.loadingText}>{loadingMsg}</Text>
          <Text style={styles.loadingHint}>Tap the close button if this is taking too long</Text>
        </View>
      )}

      {/* ── START BUTTON (shown after AI intro) ─────────────────────────────── */}
      {isReady && (
        <View style={styles.startContainer}>
          {/* Outer glow rings */}
          <Animated.View style={[styles.startRing, styles.startRingOuter,
            { transform: [{ scale: startPulse }], opacity: 0.25 }]} />
          <Animated.View style={[styles.startRing, styles.startRingInner,
            { transform: [{ scale: startPulse }], opacity: 0.40 }]} />
          {/* Button */}
          <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
            <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.startBtnGradient}>
              <Ionicons name="play" size={28} color={C.white} />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.startLabel}>Tap to Start</Text>
        </View>
      )}

      {/* ── AI SPEAKING Waveform hint ────────────────────────────────────────── */}
      {roomState === STATE.AI_SPEAKING && !isLoading && (
        <View style={styles.speakingIndicator}>
          <View style={styles.speakingDots}>
            {[0, 1, 2, 3, 4].map(i => (
              <Animated.View key={i} style={[styles.speakingDot, { height: 6 + (i % 3) * 8 }]} />
            ))}
          </View>
          <Text style={styles.speakingLabel}>VisionAlly is speaking…</Text>
        </View>
      )}

      {/* ── USER SPEAKING indicator ──────────────────────────────────────────── */}
      {roomState === STATE.USER_SPEAKING && (
        <View style={styles.speakingIndicator}>
          <Animated.View style={[styles.micRing, { transform: [{ scale: micPulse }] }]}>
            <Ionicons name="mic" size={20} color={C.white} />
          </Animated.View>
          <Text style={styles.speakingLabel}>Listening…</Text>
        </View>
      )}

      {/* ── STATUS LABEL ────────────────────────────────────────────────────── */}
      {statusLabel.length > 0 && !isLoading && !isReady && (
        <View style={styles.statusLabelContainer}>
          <Text style={styles.statusLabelText}>{statusLabel}</Text>
        </View>
      )}

      {/* ── BOTTOM CONTROLS ─────────────────────────────────────────────────── */}
      {!isLoading && !isEnded && (
        <Animated.View style={[styles.controls, { opacity: fadeAnim }]}>
          {/* Camera Toggle */}
          <TouchableOpacity style={styles.ctrlBtn} onPress={handleToggleCamera} activeOpacity={0.8}>
            <View style={[styles.ctrlBtnInner, isCameraOff && styles.ctrlBtnActive]}>
              <Ionicons
                name={isCameraOff ? 'videocam-off' : 'videocam'}
                size={22}
                color={C.white}
              />
            </View>
            <Text style={styles.ctrlLabel}>{isCameraOff ? 'Camera Off' : 'Camera'}</Text>
          </TouchableOpacity>

          {/* End Session (centre, red) */}
          <TouchableOpacity style={styles.endBtn} onPress={handleEndPress} activeOpacity={0.85}>
            <View style={styles.endBtnInner}>
              <Ionicons name="close" size={28} color={C.white} />
            </View>
            <Text style={styles.ctrlLabel}>End</Text>
          </TouchableOpacity>

          {/* Mute / Unmute */}
          <TouchableOpacity style={styles.ctrlBtn} onPress={handleToggleMute} activeOpacity={0.8}>
            <View style={[styles.ctrlBtnInner, isMuted && styles.ctrlBtnActive]}>
              <Ionicons
                name={isMuted ? 'mic-off' : 'mic'}
                size={22}
                color={C.white}
              />
            </View>
            <Text style={styles.ctrlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── ENDED STATE ─────────────────────────────────────────────────────── */}
      {isEnded && (
        <View style={styles.endedOverlay}>
          <Ionicons name="checkmark-circle" size={64} color={C.success} />
          <Text style={styles.endedTitle}>Session Complete</Text>
          <Text style={styles.endedSub}>Saving your results…</Text>
          <ActivityIndicator size="small" color={C.white} style={{ marginTop: 16 }} />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CTRL_SIZE  = 60;
const END_SIZE   = 72;

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.black },

  // Camera off
  cameraOff: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0F0F0F',
  },
  cameraOffText: { color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 10 },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 14,
    paddingHorizontal: 20, paddingBottom: 14, gap: 10,
    zIndex: 10,
  },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.85)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  liveDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: C.white },
  liveText: { fontSize: 11, fontWeight: '800', color: C.white, letterSpacing: 1 },

  topBarTitle: { fontSize: 18, fontWeight: '800', color: C.white, flex: 1, textAlign: 'center' },

  qCounter: {
    backgroundColor: C.glass, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  qCounterText: { fontSize: 12, fontWeight: '700', color: C.white },

  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.70)', gap: 16,
  },
  loadingText: { color: C.white, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  loadingHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 8 },
  loadingCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    padding: 8,
    zIndex: 10,
  },

  // Start button
  startContainer: {
    position: 'absolute',
    top: H * 0.40, left: 0, right: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  startRing: {
    position: 'absolute',
    borderRadius: 1000, backgroundColor: C.primary,
  },
  startRingOuter: { width: 160, height: 160 },
  startRingInner: { width: 120, height: 120 },
  startBtn: {
    width: 90, height: 90, borderRadius: 45, overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: C.primary, shadowOffset:{width:0,height:8}, shadowOpacity:0.5, shadowRadius:16 },
      android: { elevation: 12 },
    }),
  },
  startBtnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  startLabel: {
    marginTop: 58, color: C.white, fontSize: 15, fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset:{width:0,height:1}, textShadowRadius:4,
  },

  // Speaking indicators
  speakingIndicator: {
    position: 'absolute', bottom: 160, left: 0, right: 0,
    alignItems: 'center', gap: 10,
  },
  speakingDots: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  speakingDot:  {
    width: 4, borderRadius: 2, backgroundColor: C.primary,
    opacity: 0.9,
  },
  speakingLabel: {
    color: C.white, fontSize: 13, fontWeight: '600',
    textShadowColor:'rgba(0,0,0,0.6)', textShadowOffset:{width:0,height:1}, textShadowRadius:4,
  },
  micRing: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },

  // Status label
  statusLabelContainer: {
    position: 'absolute', bottom: 148, left: 0, right: 0, alignItems: 'center',
  },
  statusLabelText: {
    color: 'rgba(255,255,255,0.80)', fontSize: 13, fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },

  // Bottom controls
  controls: {
    position: 'absolute', bottom: Platform.OS === 'ios' ? 44 : 24,
    left: 0, right: 0,
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'center', gap: 28, paddingHorizontal: 30,
  },
  ctrlBtn:      { alignItems: 'center', gap: 6 },
  ctrlBtnInner: {
    width: CTRL_SIZE, height: CTRL_SIZE, borderRadius: CTRL_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  ctrlBtnActive: { backgroundColor: 'rgba(139,92,246,0.55)', borderColor: C.primary },
  ctrlLabel:     { color: C.white, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // End button (red)
  endBtn:      { alignItems: 'center', gap: 6 },
  endBtnInner: {
    width: END_SIZE, height: END_SIZE, borderRadius: END_SIZE / 2,
    backgroundColor: C.error, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: C.error, shadowOffset:{width:0,height:6}, shadowOpacity:0.45, shadowRadius:12 },
      android: { elevation: 10 },
    }),
  },

  // Ended overlay
  endedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.80)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  endedTitle: { color: C.white, fontSize: 24, fontWeight: '800' },
  endedSub:   { color: 'rgba(255,255,255,0.70)', fontSize: 14, fontWeight: '500' },
});