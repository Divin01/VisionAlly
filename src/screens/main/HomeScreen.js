import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
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
  transparent: 'transparent',
};
const API_BASE_URL = 'https://eventregistry.org/api/v1';

export default function HomeScreen({ navigation, onNavigateToReports }) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate a small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      
      {/* Gradient Background Header */}
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.08)', 'transparent']}
        style={styles.gradientOverlay}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Custom Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIconWrapper}>
              <Ionicons name="eye" size={30} color={COLORS.primary} />
            </View>
            <View style={styles.appNameContainer}>
              <Text style={styles.appName}>
                <Text style={styles.visionText}>Vision</Text>
                <Text style={styles.allyText}>Ally</Text>
              </Text>
              <View style={styles.tagline}>
                <Text style={styles.taglineText}>Your Employment Companion</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notificationIcon}>
            <Ionicons name="notifications-outline" size={26} color={COLORS.textPrimary} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Featured Banner */}
        {/* <View style={styles.bannerSection}>
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerContent}>
              <View>
                <Text style={styles.bannerSubtitle}>Hot Opportunity</Text>
                <Text style={styles.bannerTitle}>Remote Senior Developer Needed</Text>
                <Text style={styles.bannerDescription}>
                  TechCorp Solutions is hiring experienced developers with inclusive workplace policies
                </Text>
              </View>
              <View style={styles.bannerIconContainer}>
                <Ionicons name="rocket" size={48} color={COLORS.white} />
              </View>
            </View>
            <TouchableOpacity style={styles.bannerButton}>
              <Text style={styles.bannerButtonText}>View Details →</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View> */}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.actionCardSmall}>
              <View style={[styles.actionIconSmall, { backgroundColor: `${COLORS.primary}20` }]}>
                <Ionicons name="briefcase" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.actionCardText}>Browse Jobs</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCardSmall}>
              <View style={[styles.actionIconSmall, { backgroundColor: `${COLORS.success}20` }]}>
                <Ionicons name="document" size={18} color={COLORS.success} />
              </View>
              <Text style={styles.actionCardText}>My CV</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCardSmall}>
              <View style={[styles.actionIconSmall, { backgroundColor: `${COLORS.warning}20` }]}>
                <Ionicons name="videocam" size={18} color={COLORS.warning} />
              </View>
              <Text style={styles.actionCardText}>Interview Prep</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCardSmall}>
              <View style={[styles.actionIconSmall, { backgroundColor: `${COLORS.error}20` }]}>
                <Ionicons name="heart" size={18} color={COLORS.error} />
              </View>
              <Text style={styles.actionCardText}>Saved Jobs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Job Trends Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Job Market Trends</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <View>
                <Text style={styles.trendTitle}>Most Demanded Skills in 2025</Text>
                <Text style={styles.trendSubtitle}>Top skills employers are seeking</Text>
              </View>
              <View style={styles.trendBadge}>
                <Text style={styles.trendBadgeText}>↑ 12%</Text>
              </View>
            </View>
            <View style={styles.skillsList}>
              <View style={styles.skillItem}>
                <Text style={styles.skillName}>Full Stack Development</Text>
                <View style={styles.skillBar}>
                  <View style={[styles.skillFill, { width: '92%' }]} />
                </View>
              </View>
              <View style={styles.skillItem}>
                <Text style={styles.skillName}>Data Analysis</Text>
                <View style={styles.skillBar}>
                  <View style={[styles.skillFill, { width: '88%' }]} />
                </View>
              </View>
              <View style={styles.skillItem}>
                <Text style={styles.skillName}>Cloud Computing</Text>
                <View style={styles.skillBar}>
                  <View style={[styles.skillFill, { width: '85%' }]} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Featured Opportunities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>For You</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>See More</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.jobCard}>
            <View style={styles.jobCardHeader}>
              <View style={styles.jobCardIconContainer}>
                <Ionicons name="business" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobCardTitle}>UX/UI Designer</Text>
                <Text style={styles.jobCardCompany}>Creative Studios Inc.</Text>
              </View>
              <Ionicons name="heart-outline" size={22} color={COLORS.textSecondary} />
            </View>
            <View style={styles.jobCardDetails}>
              <View style={styles.jobDetailTag}>
                <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                <Text style={styles.jobDetailText}>Johannesburg, SA</Text>
              </View>
              <View style={styles.jobDetailTag}>
                <Ionicons name="briefcase-outline" size={14} color={COLORS.primary} />
                <Text style={styles.jobDetailText}>3 years experience</Text>
              </View>
              <View style={styles.jobDetailTag}>
                <Ionicons name="cash-outline" size={14} color={COLORS.primary} />
                <Text style={styles.jobDetailText}>R 45,000 - R 65,000</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.applyButton}>
              <Text style={styles.applyButtonText}>Apply Now</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.jobCard}>
            <View style={styles.jobCardHeader}>
              <View style={styles.jobCardIconContainer}>
                <Ionicons name="business" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobCardTitle}>Customer Support Manager</Text>
                <Text style={styles.jobCardCompany}>RetailPro Solutions</Text>
              </View>
              <Ionicons name="heart-outline" size={22} color={COLORS.textSecondary} />
            </View>
            <View style={styles.jobCardDetails}>
              <View style={styles.jobDetailTag}>
                <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                <Text style={styles.jobDetailText}>Cape Town, SA</Text>
              </View>
              <View style={styles.jobDetailTag}>
                <Ionicons name="briefcase-outline" size={14} color={COLORS.primary} />
                <Text style={styles.jobDetailText}>2+ years experience</Text>
              </View>
              <View style={styles.jobDetailTag}>
                <Ionicons name="cash-outline" size={14} color={COLORS.primary} />
                <Text style={styles.jobDetailText}>R 32,000 - R 48,000</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.applyButton}>
              <Text style={styles.applyButtonText}>Apply Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Interview Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interview Tips</Text>
          
          <View style={styles.tipCard}>
            <View style={[styles.tipIconContainer, { backgroundColor: `${COLORS.primary}20` }]}>
              <Ionicons name="bulb" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Body Language Matters</Text>
              <Text style={styles.tipDescription}>
                Maintain eye contact, sit upright, and smile naturally
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </View>

          <View style={styles.tipCard}>
            <View style={[styles.tipIconContainer, { backgroundColor: `${COLORS.success}20` }]}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Research the Company</Text>
              <Text style={styles.tipDescription}>
                Know about the company's mission, culture, and recent news
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </View>

          <View style={styles.tipCard}>
            <View style={[styles.tipIconContainer, { backgroundColor: `${COLORS.warning}20` }]}>
              <Ionicons name="help-circle" size={24} color={COLORS.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Prepare Your Answers</Text>
              <Text style={styles.tipDescription}>
                Practice common questions and your STAR method responses
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </View>
        </View>

        {/* Accessibility Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility</Text>
          
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.02)']}
            style={styles.accessibilityCard}
          >
            <View style={styles.accessibilityContent}>
              <View>
                <Text style={styles.accessibilityTitle}>Accommodations Support</Text>
                <Text style={styles.accessibilityDescription}>
                  Filter jobs with specific accessibility features and workplace accommodations
                </Text>
              </View>
              <Ionicons name="accessibility" size={32} color={COLORS.success} />
            </View>
            <TouchableOpacity style={styles.accessibilityButton}>
              <Text style={styles.accessibilityButtonText}>Learn More</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

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
    height: Platform.OS === 'ios' ? 220 : 200,
    zIndex: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 55 : (StatusBar.currentHeight || 0) + 16,
    paddingHorizontal: 20,
    paddingBottom: 15,
    zIndex: 1,
  },
  headerLeft: {
    flex: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${COLORS.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 10, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  appNameContainer: {
    flexDirection: 'column',
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 30,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  visionText: {
    color: 'black',
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.14)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  allyText: {
    color: COLORS.primary,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.14)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tagline: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  taglineText: {
    fontSize: 9,
    color: COLORS.primaryDark,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -40,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  bannerSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  banner: {
    padding: 20,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 200,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flex: 1,
  },
  bannerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
    lineHeight: 28,
  },
  bannerDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
    marginRight: 20,
  },
  bannerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  bannerButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  bannerButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  actionCardSmall: {
    width: '48%',
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  actionIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionCardText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  trendCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  trendSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  trendBadge: {
    backgroundColor: `${COLORS.success}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trendBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
  },
  skillsList: {
    gap: 12,
  },
  skillItem: {
    gap: 6,
  },
  skillName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  skillBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  skillFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobCardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  jobCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  jobCardCompany: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  jobCardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  jobDetailTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  jobDetailText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  tipIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  tipDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  accessibilityCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  accessibilityContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  accessibilityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: 4,
  },
  accessibilityDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginRight: 12,
    flex: 1,
  },
  accessibilityButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.success,
    borderRadius: 8,
    alignItems: 'center',
  },
  accessibilityButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  reportCountBadge: {
  backgroundColor: COLORS.primary,
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
  minWidth: 32,
  alignItems: 'center',
  },
  reportCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  emptyReportsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  emptyReportsText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyReportsSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  carouselContent: {
    paddingRight: 20,
  },
  newsCard: {
    marginRight: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  newsGradient: {
    padding: 20,
    minHeight: 280,
    justifyContent: 'flex-end',
  },
  newsImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  newsImage: {
    width: '100%',
    height: '100%',
  },
  newsImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  newsContent: {
    marginTop: 120,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  newsTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  newsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 6,
    lineHeight: 26,
  },
  newsDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  sourceText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 6,
    fontWeight: '500',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  paginationDotActive: {
    width: 20,
    backgroundColor: COLORS.primary,
  },
  activityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    marginBottom: 10,
    borderLeftColor: '#EF4444',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  activityIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF444415',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  activityLocation: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444415',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  activeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
    textTransform: 'uppercase',
  },
  activityDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.primary}10`,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  viewMapText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  resourceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  resourceDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});