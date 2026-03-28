// src/screens/main/InterviewerScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../../../firebase';
import { analyseJobDocument } from '../../services/GeminiLiveService';
import { InterviewStorageService } from '../../services/InterviewStorageService';

const { width: screenWidth } = Dimensions.get('window');

const COLORS = {
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryVeryLight: '#EDE9FE',
  inkDark: '#0F172A',
  inkSoft: '#1E293B',
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  white: '#FFFFFF',
  black: '#000000',
  gold: '#F59E0B',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const showAboutInfo = () => {
  Alert.alert(
    '🤖 VisionAlly AI Interviewer',
    'The VisionAlly AI Interviewer is your personal, real-time mock interview coach — powered by Google Gemini Live API.\n\n' +
    '🎙️ Live video & audio mock interviews tailored to your role.\n\n' +
    '📊 Analyses vocal tone, pacing, confidence, and non-verbal cues in real time.\n\n' +
    '♿ Adapts to your accessibility profile and communication preferences.\n\n' +
    '💡 Instant, actionable feedback after every answer.\n\n' +
    '🧠 Tracks growth across sessions.',
    [{ text: 'Close', style: 'cancel' }]
  );
};

const scoreToColor = (score) => {
  if (!score) return '#6B7280';
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
};

// ─── Score Ring Component ──────────────────────────────────────────────────────
const ScoreRing = ({ score, color }) => {
  if (!score) {
    return (
      <View style={[styles.scoreRing, { borderColor: COLORS.border }]}>
        <Text style={styles.scoreRingNA}>—</Text>
      </View>
    );
  }
  return (
    <View style={[styles.scoreRing, { borderColor: color }]}>
      <Text style={[styles.scoreRingValue, { color }]}>{score}</Text>
      <Text style={[styles.scoreRingLabel, { color }]}>%</Text>
    </View>
  );
};

// ─── Interview Card Component ──────────────────────────────────────────────────
const InterviewCard = ({ item, onToggleFavorite, onDelete }) => {
  const isIncomplete = item.status === 'incomplete';
  const scoreColor = item.scoreColor ?? scoreToColor(item.score);

  return (
    <TouchableOpacity activeOpacity={0.92} style={styles.card}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrapper}>
          <LinearGradient
            colors={isIncomplete
              ? ['#F3F4F6', '#E5E7EB']
              : [`${COLORS.primary}22`, `${COLORS.primaryLight}33`]}
            style={styles.cardIconGradient}
          >
            <Ionicons
              name={isIncomplete ? 'pause-circle-outline' : 'videocam'}
              size={20}
              color={isIncomplete ? COLORS.textTertiary : COLORS.primary}
            />
          </LinearGradient>
        </View>

        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardRole} numberOfLines={1}>{item.role}</Text>
          <Text style={styles.cardCompany} numberOfLines={1}>{item.company}</Text>
        </View>

        {/* Favorite toggle */}
        <TouchableOpacity
          onPress={() => onToggleFavorite(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={item.isFavorite ? 'star' : 'star-outline'}
            size={20}
            color={item.isFavorite ? COLORS.gold : COLORS.textTertiary}
          />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Card Body */}
      <View style={styles.cardBody}>
        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{item.duration}</Text>
          </View>
          {isIncomplete && (
            <View style={styles.incompletePill}>
              <View style={styles.incompleteDot} />
              <Text style={styles.incompleteText}>Incomplete</Text>
            </View>
          )}
        </View>

        {/* Tags row */}
        <View style={styles.tagsRow}>
          {item.tags?.map((tag, idx) => (
            <View key={idx} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Feedback + Score */}
        <View style={styles.feedbackRow}>
          <View style={styles.feedbackBlock}>
            <Ionicons name="chatbubble-ellipses-outline" size={13} color={COLORS.primary} style={{ marginTop: 1 }} />
            <Text style={styles.feedbackText} numberOfLines={2}>{item.feedback}</Text>
          </View>
          <ScoreRing score={item.score} color={scoreColor} />
        </View>
      </View>

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.footerBtn}>
          <Ionicons name="play-circle-outline" size={15} color={COLORS.primary} />
          <Text style={styles.footerBtnText}>
            {isIncomplete ? 'Resume' : 'Replay'}
          </Text>
        </TouchableOpacity>
        <View style={styles.footerSep} />
        <TouchableOpacity style={styles.footerBtn}>
          <Ionicons name="bar-chart-outline" size={15} color={COLORS.primary} />
          <Text style={styles.footerBtnText}>Feedback</Text>
        </TouchableOpacity>
        <View style={styles.footerSep} />
        <TouchableOpacity style={styles.footerBtn} onPress={() => onDelete(item.id)}>
          <Ionicons name="trash-outline" size={15} color={COLORS.error} />
          <Text style={[styles.footerBtnText, { color: COLORS.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function InterviewerScreen({ navigation, route }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [interviews, setInterviews] = useState([]);
  const [loadingStart, setLoadingStart] = useState(false);

  // ── Load sessions from AsyncStorage ─────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    const sessions = await InterviewStorageService.getAllSessions();
    setInterviews(sessions);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Refresh when coming back from InterviewRoomScreen
  useEffect(() => {
    if (route?.params?.refreshInterviews) {
      loadSessions();
    }
  }, [route?.params?.refreshInterviews, loadSessions]);

  // ── Toggle / Delete ──────────────────────────────────────────────────────────
  const toggleFavorite = async (id) => {
    await InterviewStorageService.toggleFavorite(id);
    loadSessions();
  };

  const deleteInterview = (id) => {
    Alert.alert(
      'Delete Interview',
      'Are you sure you want to delete this session? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await InterviewStorageService.deleteSession(id);
            loadSessions();
          },
        },
      ]
    );
  };

  // ─── START INTERVIEW FLOW ────────────────────────────────────────────────────
  const handleStartInterview = async () => {
    setLoadingStart(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        Alert.alert('Not logged in', 'Please log in to start an interview.');
        return;
      }

      // 1. Check Firestore for About Me profile
      let profile = null;
      try {
        const snap = await getDoc(doc(firestore, 'users', uid, 'profile', 'about_me'));
        profile = snap.exists() ? snap.data() : null;
      } catch {
        // Fallback to local cache
        profile = await InterviewStorageService.getCachedAboutMe();
      }

      // 2. First time / no profile → must complete About Me first
      if (!profile || !profile.firstName || !profile.careerGoal) {
        Alert.alert(
          '👤 Complete Your Profile First',
          'To personalise your AI interview session, please fill in your About Me profile. This only takes 2 minutes!',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Complete Profile',
              onPress: () => {
                navigation.navigate('AboutMe', {
                  onComplete: (savedProfile) => {
                    // After saving, automatically continue the start flow
                    setLoadingStart(false);
                    setTimeout(() => continueStartFlow(savedProfile), 600);
                  },
                });
              },
            },
          ],
        );
        return;
      }

      // 3. Profile exists → ask to confirm + optional document
      setLoadingStart(false);
      await continueStartFlow(profile);

    } catch (err) {
      console.log('[InterviewerScreen] handleStartInterview error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoadingStart(false);
    }
  };

  const continueStartFlow = async (profile) => {
    // Ask user to confirm profile or update it
    Alert.alert(
      `👋 Hi ${profile.firstName}!`,
      `Using your saved profile:\n📋 ${profile.field ?? 'General'} • ${profile.experience ?? '0'} yr(s) exp.\n\nWould you like to add a job offer document so the AI focuses on that specific role?`,
      [
        {
          text: 'Skip, Start Now',
          onPress: () => launchInterviewRoom(profile, '', '', ''),
        },
        {
          text: '📎 Upload Job Offer',
          onPress: () => showDocumentOptions(profile),
        },
        {
          text: 'Update Profile',
          style: 'cancel',
          onPress: () => {
            navigation.navigate('AboutMe', {
              onComplete: (updated) => continueStartFlow(updated),
            });
          },
        },
      ],
    );
  };

  const showDocumentOptions = (profile) => {
    Alert.alert(
      'Upload Job Offer',
      'Choose how to provide the job details:',
      [
        {
          text: '📷 Photo (image)',
          onPress: () => pickImage(profile),
        },
        {
          text: '📄 PDF Document',
          onPress: () => pickPDF(profile),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  };

  const pickImage = async (profile) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a job offer image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const b64 = asset.base64;
      await analyseAndStart(profile, b64, mimeType);
    }
  };

  const pickPDF = async (profile) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const uri = result.assets[0].uri;
      const b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await analyseAndStart(profile, b64, 'application/pdf');
    }
  };

  const analyseAndStart = async (profile, base64Data, mimeType) => {
    setLoadingStart(true);
    Alert.alert(
      '🔍 Analysing Document',
      'VisionAlly is reading your job offer to personalise the interview. This takes a few seconds…',
      [],
    );
    try {
      const jobText = await analyseJobDocument(base64Data, mimeType);
      // Extract role and company from the analysis (simple heuristic)
      const roleMatch = jobText.match(/job title[:\s]+([^\n]+)/i);
      const companyMatch = jobText.match(/company(?:\s+name)?[:\s]+([^\n]+)/i);
      const jobRole = roleMatch?.[1]?.trim() ?? 'Specific Role';
      const jobCompany = companyMatch?.[1]?.trim() ?? '—';

      launchInterviewRoom(profile, jobText, jobRole, jobCompany);
    } catch (err) {
      console.log('[InterviewerScreen] analyse error:', err);
      Alert.alert(
        'Analysis Failed',
        'Could not read the document. Starting without it — you can still have a great practice session!',
        [{ text: 'Continue', onPress: () => launchInterviewRoom(profile, '', '', '') }],
      );
    } finally {
      setLoadingStart(false);
    }
  };

  const launchInterviewRoom = (profile, jobText, jobRole, jobCompany) => {
    navigation.navigate('InterviewRoom', {
      profile, jobText, jobRole, jobCompany,
    });
  };

  // ── Filtered / sorted list ───────────────────────────────────────────────────
  const filteredInterviews = (() => {
    let list = interviews.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        item.role?.toLowerCase().includes(q) ||
        item.company?.toLowerCase().includes(q) ||
        item.tags?.some(t => t.toLowerCase().includes(q));
      const matchFav = favoritesOnly ? item.isFavorite : true;
      return matchSearch && matchFav;
    });
    if (sortBy === 'oldest') list = [...list].reverse();
    return list;
  })();

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.inkDark} translucent />

      {/* ── Fixed Hero Header ─────────────────────────────────── */}
      <LinearGradient
        colors={[COLORS.inkDark, COLORS.inkSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.heroHeader}
      >
        <View style={styles.heroHeaderContent}>
          <View style={styles.heroHeaderTextBlock}>
            <Text style={styles.heroTitle}>AI Interviewer</Text>
            <Text style={styles.heroTitle2}>Mock Practice</Text>
            <Text style={styles.heroSub}>
              Practice smarter · Interview with confidence
            </Text>
          </View>
          <TouchableOpacity style={styles.heroInfoBtn} onPress={showAboutInfo}>
            <Text style={styles.heroInfoBtnIcon}>i</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.heroDeco1} />
        <View style={styles.heroDeco2} />
      </LinearGradient>

      <View style={styles.contentSheet}>

      {/* ── Tips Banner ─────────────────────────────────────── */}
      <LinearGradient
        colors={['rgba(139,92,246,0.08)', 'rgba(167,139,250,0.04)']}
        style={styles.tipBanner}
      >
        <View style={styles.tipBannerIconWrapper}>
          <Ionicons name="bulb" size={22} color={COLORS.primary} />
        </View>
        <View style={styles.tipBannerContent}>
          <Text style={styles.tipBannerTitle}>Pro Tip</Text>
          <Text style={styles.tipBannerText}>
            Upload a real job offer so VisionAlly can ask you the most relevant questions for that exact role.
          </Text>
        </View>
      </LinearGradient>

      {/* ── CTA Buttons ──────────────────────────────────────── */}
      <View style={styles.ctaRow}>
        {/* About Me Info */}
        <TouchableOpacity
          style={styles.ctaSecondary}
          onPress={() => navigation.navigate('AboutMe', {})}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.primaryVeryLight, '#F5F3FF']}
            style={styles.ctaSecondaryGradient}
          >
            <Ionicons name="person-circle-outline" size={18} color={COLORS.primaryDark} />
            <Text style={styles.ctaSecondaryText}>About Me</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Start New Interview */}
        <TouchableOpacity
          style={styles.ctaPrimary}
          onPress={handleStartInterview}
          activeOpacity={0.85}
          disabled={loadingStart}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.ctaPrimaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loadingStart ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="videocam" size={18} color={COLORS.white} />
                <Text style={styles.ctaPrimaryText}>Start Interview</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Section: Past Interviews ────────────────────────── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleAccentBar} />
          <Text style={styles.sectionTitle}>Past Interviews</Text>
        </View>
        <Text style={styles.sectionCount}>
          {filteredInterviews.length} session{filteredInterviews.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* ── Search Bar ─────────────────────────────────────── */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={COLORS.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by role, company or skill…"
            placeholderTextColor={COLORS.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
              <Ionicons name="close-circle" size={16} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Sort + Favourites Row ───────────────────────────── */}
      <View style={styles.filterRow}>
        {/* Sort Button */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
        >
          <Ionicons
            name={sortBy === 'newest' ? 'arrow-down' : 'arrow-up'}
            size={16}
            color={COLORS.primary}
          />
          <Text style={styles.filterButtonText}>
            {sortBy === 'newest' ? 'Newest' : 'Oldest'}
          </Text>
        </TouchableOpacity>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Favourites Switch */}
        <View style={styles.favToggle}>
          <Ionicons
            name="star"
            size={14}
            color={favoritesOnly ? COLORS.gold : COLORS.textTertiary}
          />
          <Switch
            value={favoritesOnly}
            onValueChange={setFavoritesOnly}
            trackColor={{ false: COLORS.border, true: `${COLORS.gold}55` }}
            thumbColor={favoritesOnly ? COLORS.gold : COLORS.textTertiary}
            style={styles.favSwitch}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Interview Cards ─────────────────────────────────── */}
        {filteredInterviews.length > 0 ? (
          filteredInterviews.map((item) => (
            <InterviewCard
              key={item.id}
              item={item}
              onToggleFavorite={toggleFavorite}
              onDelete={deleteInterview}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={[`${COLORS.primary}12`, `${COLORS.primaryLight}08`]}
              style={styles.emptyStateIcon}
            >
              <Ionicons name="videocam-off-outline" size={40} color={COLORS.primaryLight} />
            </LinearGradient>
            <Text style={styles.emptyStateTitle}>No sessions yet</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery.length > 0
                ? `No results for "${searchQuery}"`
                : 'Start your first AI mock interview to see your history here.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyStateCta}
              onPress={handleStartInterview}
            >
              <Text style={styles.emptyStateCtaText}>Start First Interview</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 110 }} />
      </ScrollView>
      </View>
    </View>
  );
}

// ─── Styles (unchanged from original) ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },

  // ── Fixed Hero Header (matching JobTrends) ──────────────
  heroHeader: {
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 20,
    paddingBottom: 44, paddingHorizontal: 24,
    position: 'relative', overflow: 'hidden',
  },
  heroHeaderContent: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    zIndex: 2,
  },
  heroHeaderTextBlock: { flex: 1, marginRight: 12 },
  heroTitle: { fontSize: 30, fontWeight: '900', color: COLORS.white, letterSpacing: -0.5 },
  heroTitle2: { fontSize: 30, fontWeight: '900', color: COLORS.primaryLight, letterSpacing: -0.5 },
  heroSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500', marginTop: 6,
  },
  heroInfoBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
    marginTop: 4,
  },
  heroInfoBtnIcon: {
    fontSize: 16, fontWeight: '800', color: COLORS.white, fontStyle: 'italic',
  },
  heroDeco1: {
    position: 'absolute', right: -30, top: -30,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  heroDeco2: {
    position: 'absolute', right: 50, bottom: -50,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  // Content sheet with rounded top corners
  contentSheet: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderTopRightRadius: 28,
    marginTop: -20,
    overflow: 'hidden',
  },

  // ── Tip Banner ───────────────────────────────────────────
  tipBanner: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: `${COLORS.primary}18`,
  },
  tipBannerIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipBannerContent: {
    flex: 1,
  },
  tipBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  tipBannerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontWeight: '500',
  },

  // ── CTA Buttons ─────────────────────────────────────────
  ctaRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  ctaSecondary: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: `${COLORS.primary}30`,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  ctaSecondaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 7,
  },
  ctaSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
    letterSpacing: 0.1,
  },
  ctaPrimary: {
    flex: 1.2,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  ctaPrimaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 7,
  },
  ctaPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.1,
  },

  // ── Section Header ───────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitleAccentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  // ── Search Bar ───────────────────────────────────────────
  searchRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 48,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    paddingVertical: 0,
  },
  searchClear: { padding: 4 },

  // ── Filter / Sort Row ────────────────────────────────────
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 4,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  favToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 20,
    gap: 4,
  },
  favSwitch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },

  // ── Scroll ───────────────────────────────────────────────
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 2 },

  // ── Interview Card ───────────────────────────────────────
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    gap: 12,
  },
  cardIconWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardIconGradient: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  cardTitleBlock: { flex: 1 },
  cardRole: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  cardCompany: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 16,
  },
  cardBody: {
    padding: 16,
    paddingBottom: 12,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  incompletePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
  },
  incompleteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.warning,
  },
  incompleteText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: `${COLORS.primary}12`,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  feedbackBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 10,
    padding: 10,
  },
  feedbackText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    fontWeight: '500',
  },
  scoreRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  scoreRingValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scoreRingLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: -2,
  },
  scoreRingNA: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textTertiary,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 5,
  },
  footerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  footerSep: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
    backgroundColor: COLORS.border,
  },

  // ── Empty State ──────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateCta: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateCtaText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
});