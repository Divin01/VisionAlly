// src/screens/main/InterviewerScreen.js
import React, { useState, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width: screenWidth } = Dimensions.get('window');

const COLORS = {
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryVeryLight: '#EDE9FE',
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

// ─── Mock Past Interview Data ──────────────────────────────────────────────────
const MOCK_INTERVIEWS = [
  {
    id: '1',
    role: 'UX/UI Designer',
    company: 'Creative Studios Inc.',
    date: 'Today, 10:30 AM',
    duration: '18 min',
    score: 87,
    status: 'completed',
    tags: ['Portfolio Review', 'Design Thinking'],
    feedback: 'Strong visual communication. Work on pacing.',
    isFavorite: true,
    scoreColor: '#10B981',
  },
  {
    id: '2',
    role: 'Customer Support Manager',
    company: 'RetailPro Solutions',
    date: 'Yesterday, 3:15 PM',
    duration: '22 min',
    score: 73,
    status: 'completed',
    tags: ['Conflict Resolution', 'Leadership'],
    feedback: 'Great empathy shown. Structure answers with STAR.',
    isFavorite: false,
    scoreColor: '#F59E0B',
  },
  {
    id: '3',
    role: 'Junior Data Analyst',
    company: 'FinTech Dynamics',
    date: '25 Mar, 9:00 AM',
    duration: '14 min',
    score: 91,
    status: 'completed',
    tags: ['SQL', 'Data Storytelling'],
    feedback: 'Excellent clarity and confidence throughout.',
    isFavorite: true,
    scoreColor: '#10B981',
  },
  {
    id: '4',
    role: 'Front-End Developer',
    company: 'Startup Nexus',
    date: '22 Mar, 2:45 PM',
    duration: '—',
    score: null,
    status: 'incomplete',
    tags: ['React', 'Accessibility'],
    feedback: 'Session ended early. Resume anytime.',
    isFavorite: false,
    scoreColor: '#6B7280',
  },
];



// ─── Coming Soon Alert ─────────────────────────────────────────────────────────
const showComingSoon = (feature = 'This feature') => {
  Alert.alert(
    '🚧 Coming Soon',
    `${feature} is currently under development and will be available very soon. Stay tuned!`,
    [{ text: 'Got it', style: 'default' }]
  );
};

// ─── About Info Alert ─────────────────────────────────────────────────────────
const showAboutInfo = () => {
  Alert.alert(
    '🤖 VisionAlly AI Interviewer',
    `The VisionAlly AI Interviewer is your personal, real-time mock interview coach — powered by Google Gemini 2.5 Flash Live API.\n\nHow it helps you:\n\n🎙️ Conducts live video & audio mock interviews tailored to your target role.\n\n📊 Analyses your vocal tone, pacing, confidence, and non-verbal cues in real time.\n\n♿ Adapts its coaching style to your accessibility profile and disability disclosure preferences.\n\n💡 Provides instant, actionable feedback after every answer.\n\n🧠 Learns from your past sessions to track growth and highlight improvement areas.\n\nEvery session brings you one step closer to interview success.`,
    [{ text: 'Close', style: 'cancel' }]
  );
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

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={styles.card}
      onPress={() => showComingSoon('Replay & detailed feedback')}
    >
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
          {item.tags.map((tag, idx) => (
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
          <ScoreRing score={item.score} color={item.scoreColor} />
        </View>
      </View>

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => showComingSoon('Replay interview')}
        >
          <Ionicons name="play-circle-outline" size={15} color={COLORS.primary} />
          <Text style={styles.footerBtnText}>
            {isIncomplete ? 'Resume' : 'Replay'}
          </Text>
        </TouchableOpacity>
        <View style={styles.footerSep} />
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => showComingSoon('Full feedback report')}
        >
          <Ionicons name="bar-chart-outline" size={15} color={COLORS.primary} />
          <Text style={styles.footerBtnText}>Feedback</Text>
        </TouchableOpacity>
        <View style={styles.footerSep} />
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => onDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={15} color={COLORS.error} />
          <Text style={[styles.footerBtnText, { color: COLORS.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function InterviewerScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [interviews, setInterviews] = useState(MOCK_INTERVIEWS);

  const toggleFavorite = (id) => {
    setInterviews((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  };

  const deleteInterview = (id) => {
    Alert.alert(
      'Delete Interview',
      'Are you sure you want to delete this interview session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setInterviews((prev) => prev.filter((item) => item.id !== id));
          },
        },
      ]
    );
  };

  const filteredInterviews = (() => {
    let filtered = interviews.filter((item) => {
      const matchesSearch =
        item.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFav = favoritesOnly ? item.isFavorite : true;
      return matchesSearch && matchesFav;
    });
    
    if (sortBy === 'oldest') {
      filtered = filtered.reverse();
    }
    
    return filtered;
  })();

  const completedCount = interviews.filter((i) => i.status === 'completed').length;
  const avgScore = Math.round(
    interviews
      .filter((i) => i.score)
      .reduce((acc, i) => acc + i.score, 0) /
      interviews.filter((i) => i.score).length
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Gradient Overlay ─────────────────────────────────── */}
      <LinearGradient
        colors={['rgba(139,92,246,0.10)', 'rgba(139,92,246,0.02)', 'transparent']}
        style={styles.gradientOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* ── Header ───────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>
            <Text style={styles.headerTitleBold}>AI </Text>
            <Text style={styles.headerTitleAccent}>Interviewer</Text>
          </Text>
          <Text style={styles.headerSubtitle}>
            Practice smarter. Interview with confidence.
          </Text>
        </View>

        <TouchableOpacity style={styles.infoBtn} onPress={showAboutInfo}>
          <LinearGradient
            colors={[`${COLORS.primary}22`, `${COLORS.primaryLight}33`]}
            style={styles.infoBtnGradient}
          >
            <Text style={styles.infoBtnIcon}>i</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

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
              Complete your "About Me" profile so the AI can tailor every mock interview to your specific disability, role, and experience level.
            </Text>
          </View>
        </LinearGradient>

      {/* ── CTA Buttons ──────────────────────────────────────── */}
      <View style={styles.ctaRow}>
        {/* About Me Info */}
        <TouchableOpacity
          style={styles.ctaSecondary}
          onPress={() => showComingSoon('About Me profile setup')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.primaryVeryLight, '#F5F3FF']}
            style={styles.ctaSecondaryGradient}
          >
            <Ionicons name="person-circle-outline" size={18} color={COLORS.primaryDark} />
            <Text style={styles.ctaSecondaryText}>About Me Info</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Start New Interview */}
        <TouchableOpacity
          style={styles.ctaPrimary}
          onPress={() => showComingSoon('AI Interview session')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.ctaPrimaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="videocam" size={18} color={COLORS.white} />
            <Text style={styles.ctaPrimaryText}>Start Interview</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Section: Past Interviews ────────────────────────── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleAccentBar} />
          <Text style={styles.sectionTitle}>Past Interviews</Text>
        </View>
        <Text style={styles.sectionCount}>{filteredInterviews.length} session{filteredInterviews.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* ── Search Bar ─────────────────────────────────────── */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color={COLORS.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by role, company or skill..."
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
            <Text style={styles.emptyStateTitle}>No sessions found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery.length > 0
                ? `No results for "${searchQuery}"`
                : 'Start your first AI mock interview to see your history here.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyStateCta}
              onPress={() => showComingSoon('AI Interview session')}
            >
              <Text style={styles.emptyStateCtaText}>Start First Interview</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 260 : 240,
    zIndex: 0,
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 58 : (StatusBar.currentHeight || 0) + 18,
    paddingHorizontal: 20,
    paddingBottom: 6,
    zIndex: 1,
  },
  headerTextBlock: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },

  headerTitleAccent: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  infoBtn: {
    marginTop: 4,
  },
  infoBtnGradient: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  infoBtnIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    fontStyle: 'italic',
  },

  // ── Stats Strip ─────────────────────────────────────────
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 14,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
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

  // ── Scroll ───────────────────────────────────────────────
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 2 },

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

  // ── Interview Card ───────────────────────────────────────
card: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black, 
        shadowOffset: { width: 0, height: 3 }, // Slight vertical drop
        shadowOpacity: 0.12, // Medium visibility
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
  // Score Ring
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
  // Card Footer
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
  tipBannerContent: { flex: 1 },
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
});