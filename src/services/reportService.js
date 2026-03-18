import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  onSnapshot,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { firestore } from '../../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPORTS_COLLECTION = 'crimeReports';
const LOCAL_STORAGE_KEY = '@safelink_local_reports';

// Base static counts for community reports (subdivided from 457)
const BASE_STATS = {
  assault: 121,
  robbery: 98,
  harassment: 67,
  suspicious: 89,
  sexual_attack: 82,
  other: 0,
};

export const ReportService = {
  // Submit a new anonymous report
  submitReport: async (reportData) => {
    try {
      const report = {
        title: reportData.title || `${reportData.category} incident`,
        description: reportData.description || '',
        category: reportData.category,
        location: {
          address: reportData.location || 'Location not provided',
          latitude: reportData.latitude || null,
          longitude: reportData.longitude || null,
          city: reportData.city || null,
        },
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        isAnonymous: true,
        status: 'active',
      };

      // Save to Firebase
      const docRef = await addDoc(collection(firestore, REPORTS_COLLECTION), report);
      
      // Save to local storage as backup
      await ReportService.saveLocalReport({
        ...report,
        id: docRef.id,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        reportId: docRef.id,
        message: 'Report submitted successfully',
      };
    } catch (error) {
      console.error('Error submitting report:', error);
      
      // Fallback: Save only locally if Firebase fails
      try {
        const localReport = {
          ...reportData,
          id: `local_${Date.now()}`,
          timestamp: new Date().toISOString(),
          isAnonymous: true,
          status: 'active',
          location: {
            address: reportData.location || 'Location not provided',
            latitude: reportData.latitude || null,
            longitude: reportData.longitude || null,
            city: reportData.city || null,
          },
        };
        
        await ReportService.saveLocalReport(localReport);
        
        return {
          success: true,
          reportId: localReport.id,
          message: 'Report saved locally (offline mode)',
          isLocal: true,
        };
      } catch (localError) {
        return {
          success: false,
          message: 'Failed to submit report',
          error: localError.message,
        };
      }
    }
  },

  // Get latest reports (limit to specified number)
  getLatestReports: async (limitCount = 3) => {
    try {
      const reportsQuery = query(
        collection(firestore, REPORTS_COLLECTION),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(reportsQuery);
      const reports = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reports.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date(data.createdAt),
        });
      });

      return reports;
    } catch (error) {
      console.error('Error fetching reports:', error);
      
      // Fallback to local storage
      const localReports = await ReportService.getLocalReports();
      return localReports.slice(0, limitCount);
    }
  },

  // Get reports by category
  getReportsByCategory: async (category) => {
    try {
      const reportsQuery = query(
        collection(firestore, REPORTS_COLLECTION),
        where('category', '==', category),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(reportsQuery);
      const reports = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reports.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate?.() || new Date(data.createdAt),
        });
      });

      return reports;
    } catch (error) {
      console.error('Error fetching reports by category:', error);
      return [];
    }
  },

  // Subscribe to real-time updates
  subscribeToReports: (limitCount = 3, callback) => {
    try {
      const reportsQuery = query(
        collection(firestore, REPORTS_COLLECTION),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const unsubscribe = onSnapshot(
        reportsQuery,
        (snapshot) => {
          const reports = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            reports.push({
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate?.() || new Date(data.createdAt),
            });
          });
          callback(reports);
        },
        (error) => {
          console.error('Error in real-time listener:', error);
          // Fallback to local reports
          ReportService.getLocalReports().then((localReports) => {
            callback(localReports.slice(0, limitCount));
          });
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up real-time listener:', error);
      return () => {}; // Return empty unsubscribe function
    }
  },

  // Get total report count (457 base + database count)
  getTotalReportCount: async () => {
    try {
      const reportsQuery = query(collection(firestore, REPORTS_COLLECTION));
      const querySnapshot = await getDocs(reportsQuery);
      const baseTotal = Object.values(BASE_STATS).reduce((a, b) => a + b, 0);
      return baseTotal + querySnapshot.size;
    } catch (error) {
      console.error('Error getting report count:', error);
      const localReports = await ReportService.getLocalReports();
      const baseTotal = Object.values(BASE_STATS).reduce((a, b) => a + b, 0);
      return baseTotal + localReports.length;
    }
  },

  // Generate dynamic heatmap from user reports (with proper severity calculation)
  generateDynamicHeatmap: async () => {
    try {
      const reportsQuery = query(collection(firestore, REPORTS_COLLECTION));
      const querySnapshot = await getDocs(reportsQuery);
      
      // Group reports by location with radius tolerance
      const locationGroups = {};
      const RADIUS_TOLERANCE = 0.02; // Approximately 2km
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.location?.latitude && data.location?.longitude) {
          const lat = data.location.latitude;
          const lng = data.location.longitude;
          
          // Find existing nearby group
          let found = false;
          for (const key in locationGroups) {
            const [groupLat, groupLng] = key.split(',').map(Number);
            const distance = Math.sqrt(
              Math.pow(lat - groupLat, 2) + Math.pow(lng - groupLng, 2)
            );
            
            if (distance <= RADIUS_TOLERANCE) {
              locationGroups[key].count++;
              found = true;
              break;
            }
          }
          
          // Create new group if not found
          if (!found) {
            const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
            locationGroups[key] = { lat, lng, count: 1 };
          }
        }
      });
      
      // Convert to heatmap format with proper weight calculation
      // 1 report = weight 1 (low/green)
      // 2-3 reports = weight 2 (medium/orange) 
      // 4+ reports = weight 3 (high/red)
      const heatmapData = Object.values(locationGroups).map(group => {
        let weight = 1;
        if (group.count >= 4) {
          weight = 3;
        } else if (group.count >= 2) {
          weight = 2;
        }
        
        return {
          latitude: group.lat,
          longitude: group.lng,
          weight: weight,
        };
      });
      
      return heatmapData;
    } catch (error) {
      console.error('Error generating dynamic heatmap:', error);
      return [];
    }
  },

  // Get statistics by category (BASE_STATS + new reports)
  getStatsByCategory: async () => {
    try {
      const reportsQuery = query(collection(firestore, REPORTS_COLLECTION));
      const querySnapshot = await getDocs(reportsQuery);
      
      const dynamicStats = {
        assault: 0,
        robbery: 0,
        harassment: 0,
        suspicious: 0,
        sexual_attack: 0,
        other: 0,
      };
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const category = data.category;
        if (dynamicStats.hasOwnProperty(category)) {
          dynamicStats[category]++;
        }
      });
      
      // Combine base stats with dynamic stats
      const combinedStats = {};
      for (const key in BASE_STATS) {
        combinedStats[key] = BASE_STATS[key] + dynamicStats[key];
      }
      
      return combinedStats;
    } catch (error) {
      console.error('Error getting stats by category:', error);
      return BASE_STATS;
    }
  },

  // Save report to local storage
  saveLocalReport: async (report) => {
    try {
      const existingReports = await ReportService.getLocalReports();
      const updatedReports = [report, ...existingReports];
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedReports));
      return true;
    } catch (error) {
      console.error('Error saving local report:', error);
      return false;
    }
  },

  // Get reports from local storage
  getLocalReports: async () => {
    try {
      const reportsJson = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
      if (reportsJson) {
        const reports = JSON.parse(reportsJson);
        return reports.map((report) => ({
          ...report,
          timestamp: new Date(report.timestamp || report.createdAt),
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting local reports:', error);
      return [];
    }
  },

  // Format time ago
  getTimeAgo: (timestamp) => {
    const now = new Date();
    const reportTime = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const diffMs = now - reportTime;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  },

  // Get category icon and color
  getCategoryStyle: (category) => {
    const styles = {
      assault: {
        icon: 'hand-back-left',
        color: '#EF4444',
        bgColor: '#EF444415',
      },
      robbery: {
        icon: 'cash-remove',
        color: '#F59E0B',
        bgColor: '#F59E0B15',
      },
      harassment: {
        icon: 'account-alert',
        color: '#8B5CF6',
        bgColor: '#8B5CF615',
      },
      suspicious: {
        icon: 'eye-outline',
        color: '#3B82F6',
        bgColor: '#3B82F615',
      },
      sexual_attack: {
        icon: 'alert-octagon',
        color: '#DC2626',
        bgColor: '#DC262615',
      },
      other: {
        icon: 'alert-circle-outline',
        color: '#6B7280',
        bgColor: '#6B728015',
      },
    };

    return styles[category] || styles.other;
  },
};