import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Heatmap } from 'react-native-maps';
import * as Location from 'expo-location';
import { COLORS } from '../../constants/colors';
import { processPoliceStations } from '../../data/processPoliceData';
import { ReportService } from '../../services/reportService';
import crimeStats from '../../data/crimeStats.json';
import CONFIG from '../../../config';

const { width: screenWidth } = Dimensions.get('window');

export default function ReportsScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState('map');
  const [mapType, setMapType] = useState('standard');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [policeStations, setPoliceStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [userReports, setUserReports] = useState([]);
  const [dynamicHeatmap, setDynamicHeatmap] = useState([]);
  const mapRef = useRef(null);
  const [currentZoom, setCurrentZoom] = useState(10);
  
  // Filter states
  const [showPoliceStations, setShowPoliceStations] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  
  // Stats filter
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userStats, setUserStats] = useState({});
  
  // Report Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [reportCoordinates, setReportCoordinates] = useState(null);
  const [reportCategory, setReportCategory] = useState('');
  const [reportCity, setReportCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);

  // Hardcoded crime heatmap data (for demo)
  const staticHeatMapData = [
    { latitude: -33.9249, longitude: 18.4241, weight: 3 },
    { latitude: -34.0486, longitude: 18.6221, weight: 3 },
    { latitude: -26.2041, longitude: 28.0473, weight: 3 },
    { latitude: -26.0823, longitude: 27.9205, weight: 3 },
    { latitude: -29.1183, longitude: 26.2294, weight: 3 },
    { latitude: -29.8579, longitude: 31.0292, weight: 3 },
    { latitude: -25.8744, longitude: 29.2331, weight: 3 },
    { latitude: -25.7461, longitude: 28.1881, weight: 3 },
    { latitude: -26.1886, longitude: 28.0505, weight: 3 },
    { latitude: -26.1076, longitude: 28.0567, weight: 3 },
    { latitude: -25.6676, longitude: 27.2420, weight: 3 },
    { latitude: -29.8177, longitude: 30.9490, weight: 3 },
    { latitude: -33.9630, longitude: 18.6501, weight: 2 },
    { latitude: -25.7670, longitude: 28.2360, weight: 2 },
    { latitude: -29.7139, longitude: 31.0205, weight: 2 },
    { latitude: -26.1899, longitude: 27.8616, weight: 2 },
    { latitude: -25.7584, longitude: 28.2057, weight: 2 },
    { latitude: -28.7282, longitude: 24.7499, weight: 2 },
    { latitude: -25.9992, longitude: 28.1278, weight: 2 },
    { latitude: -33.9321, longitude: 18.8602, weight: 2 },
    { latitude: -25.9980, longitude: 28.2260, weight: 2 },
    { latitude: -33.8480, longitude: 18.7170, weight: 2 },
    { latitude: -33.6465, longitude: 19.4485, weight: 2 },
    { latitude: -29.6305, longitude: 30.4023, weight: 2 },
    { latitude: -33.0153, longitude: 27.9116, weight: 1 },
    { latitude: -33.9823, longitude: 18.6697, weight: 1 },
    { latitude: -26.1846, longitude: 27.7021, weight: 1 },
    { latitude: -25.4047, longitude: 28.2591, weight: 1 },
    { latitude: -25.6500, longitude: 28.1000, weight: 1 },
    { latitude: -26.1000, longitude: 28.2333, weight: 1 }
  ];

  // Categories for reporting
  const categories = [
    { id: 'assault', label: 'Assault', icon: 'hand-back-left' },
    { id: 'robbery', label: 'Robbery', icon: 'cash-remove' },
    { id: 'harassment', label: 'Harassment', icon: 'account-alert' },
    { id: 'sexual_attack', label: 'Sexual Attack', icon: 'alert-octagon' },
    { id: 'suspicious', label: 'Suspicious Activity', icon: 'eye-outline' },
    { id: 'other', label: 'Other', icon: 'alert-circle-outline' },
  ];

  const filterCategories = [
    { id: 'all', label: 'All' },
    { id: 'assault', label: 'Assault' },
    { id: 'sexual_attack', label: 'Sexual Offense' },
    { id: 'robbery', label: 'Robbery' },
    { id: 'harassment', label: 'Harassment' },
    { id: 'other', label: 'Other' },
  ];

  useEffect(() => {
    loadData();
    
    const unsubscribe = ReportService.subscribeToReports(100, (reports) => {
      setUserReports(reports);
    });

    loadDynamicHeatmap();
    loadUserStats();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (route?.params?.focusLocation) {
      const { latitude, longitude } = route.params.focusLocation;
      setActiveTab('map');
      
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);
        }
      }, 500);
    }
  }, [route?.params?.focusLocation]);

  const loadData = async () => {
    try {
      const stations = processPoliceStations();
      setPoliceStations(stations);

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDefaultLocation();
        return;
      }

      let userLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 2,
        longitudeDelta: 2,
      });
      
      const reports = await ReportService.getLatestReports(100);
      setUserReports(reports);
      
      setLoading(false);
    } catch (error) {
      console.log('Error loading data:', error);
      setDefaultLocation();
    }
  };

  const loadDynamicHeatmap = async () => {
    const heatmap = await ReportService.generateDynamicHeatmap();
    setDynamicHeatmap(heatmap);
  };

  const loadUserStats = async () => {
    const stats = await ReportService.getStatsByCategory();
    setUserStats(stats);
  };

  const setDefaultLocation = () => {
    setLocation({
      latitude: -28.4793,
      longitude: 24.6727,
      latitudeDelta: 15,
      longitudeDelta: 15,
    });
    setLoading(false);
  };

  // Google Places Autocomplete
  const searchPlaces = async (input) => {
    if (input.length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    setSearchingLocation(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:za&key=${CONFIG.GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.predictions && data.predictions.length > 0) {
        setLocationSuggestions(data.predictions);
        setShowLocationSuggestions(true);
      } else {
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleLocationChange = (text) => {
    setReportLocation(text);
    searchPlaces(text);
  };

  const selectLocation = async (place) => {
    setReportLocation(place.description);
    setShowLocationSuggestions(false);
    
    // Get place details to extract coordinates and city
    try {
      const detailsResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=geometry,address_components&key=${CONFIG.GOOGLE_MAPS_API_KEY}`
      );
      const detailsData = await detailsResponse.json();
      
      if (detailsData.result) {
        const { geometry, address_components } = detailsData.result;
        
        // Set coordinates
        setReportCoordinates({
          latitude: geometry.location.lat,
          longitude: geometry.location.lng,
        });
        
        // Extract city from address components
        const cityComponent = address_components.find(
          component => 
            component.types.includes('locality') || 
            component.types.includes('administrative_area_level_2')
        );
        
        if (cityComponent) {
          setReportCity(cityComponent.long_name);
        }
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportDescription || !reportCategory) {
      Alert.alert('Missing Information', 'Please select incident type and provide description.');
      return;
    }

    setSubmitting(true);
    
    try {
      let coords = reportCoordinates;
      let locationAddress = reportLocation;
      let city = reportCity;
      
      // If no location provided, try to use current location
      if (!coords || !locationAddress) {
        try {
          const userLocation = await Location.getCurrentPositionAsync({});
          coords = {
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
          };
          
          // Get address from coordinates
          const address = await Location.reverseGeocodeAsync({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          
          if (address && address.length > 0) {
            const addr = address[0];
            locationAddress = `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
            city = addr.city || addr.region || '';
          }
        } catch (locationError) {
          console.log('Could not get location:', locationError);
        }
      }

      const result = await ReportService.submitReport({
        description: reportDescription,
        category: reportCategory,
        location: locationAddress || 'Location not specified',
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        city: city || null,
      });

      if (result.success) {
        // Reload heatmap and stats
        loadDynamicHeatmap();
        loadUserStats();
        
        Alert.alert(
          'Report Submitted',
          'Your anonymous report has been submitted successfully.',
          [
            {
              text: 'View on Map',
              onPress: () => {
                setModalVisible(false);
                resetForm();
                setActiveTab('map');
                if (coords && mapRef.current) {
                  setTimeout(() => {
                    mapRef.current.animateToRegion({
                      latitude: coords.latitude,
                      longitude: coords.longitude,
                      latitudeDelta: 0.1,
                      longitudeDelta: 0.1,
                    }, 1000);
                  }, 300);
                }
              }
            },
            {
              text: 'OK',
              onPress: () => {
                setModalVisible(false);
                resetForm();
              },
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to submit report.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setReportDescription('');
    setReportLocation('');
    setReportCoordinates(null);
    setReportCategory('');
    setReportCity('');
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
  };

  const handleUseCurrentLocation = async () => {
    try {
      const userLocation = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      });
      
      setReportCoordinates({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      });
      
      if (address && address.length > 0) {
        const addr = address[0];
        const formattedAddress = `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
        setReportLocation(formattedAddress);
        setReportCity(addr.city || addr.region || '');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not get current location.');
    }
  };

  const handleRegionChangeComplete = (region) => {
    // Estimate zoom level from latitudeDelta
    const zoom = Math.log2(360 / region.latitudeDelta);
    setCurrentZoom(zoom);
  };

  const renderPoliceStationMarker = (station) => {
    // Show icon only when zoomed in (street level)
    const showIcon = currentZoom > 13;
    
    return (
      <Marker
        key={station.id}
        coordinate={{
          latitude: station.latitude,
          longitude: station.longitude
        }}
        title={showIcon ? station.title : undefined}
        description={showIcon ? station.description : undefined}
        onPress={() => setSelectedStation(station)}
      >
        <View style={[
          styles.policeMarker,
          selectedStation?.id === station.id && styles.policeMarkerSelected,
          !showIcon && styles.policeMarkerSmall
        ]}>
          {showIcon ? (
            <MaterialCommunityIcons name="police-badge" size={20} color="#1E40AF" />
          ) : (
            <View style={styles.policeMarkerDot} />
          )}
        </View>
      </Marker>
    );
  };

  const renderMapTab = () => (
    <View style={styles.mapContainer}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading map data...</Text>
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={location}
            mapType={mapType}
            showsUserLocation={true}
            showsMyLocationButton={true}
            onRegionChangeComplete={handleRegionChangeComplete}
          >
            {/* Static heatmap (hardcoded demo data) */}
            {showHeatmap && (
              <Heatmap
                points={staticHeatMapData}
                radius={150}
                opacity={0.9}
                maxIntensity={100}
                gradient={{
                  colors: ['#10B981', '#F59E0B', '#EF4444'],
                  startPoints: [0.2, 0.5, 0.8],
                  colorMapSize: 256
                }}
              />
            )}

            {/* Dynamic heatmap (user reports) - SAME gradient and styling */}
            {showHeatmap && dynamicHeatmap.length > 0 && (
              <Heatmap
                points={dynamicHeatmap}
                radius={80}
                opacity={0.9}
                maxIntensity={100}
                gradient={{
                  colors: ['#10B981', '#F59E0B', '#EF4444'],
                  startPoints: [0.2, 0.5, 0.8],
                  colorMapSize: 256
                }}
              />
            )}

            {showPoliceStations && policeStations.map(renderPoliceStationMarker)}
          </MapView>

          {/* Map Filters */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                showPoliceStations && styles.filterButtonActive
              ]}
              onPress={() => setShowPoliceStations(!showPoliceStations)}
            >
              <MaterialCommunityIcons 
                name="police-badge" 
                size={16} 
                color={showPoliceStations ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[
                styles.filterButtonText,
                showPoliceStations && styles.filterButtonTextActive
              ]}>
                Stations
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterButton,
                showHeatmap && styles.filterButtonActive
              ]}
              onPress={() => setShowHeatmap(!showHeatmap)}
            >
              <MaterialCommunityIcons 
                name="fire" 
                size={16} 
                color={showHeatmap ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[
                styles.filterButtonText,
                showHeatmap && styles.filterButtonTextActive
              ]}>
                Heatmap
              </Text>
            </TouchableOpacity>
          </View>

          {/* Legend - Always show police icon */}
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>Map Legend</Text>
            
            <View style={styles.legendItem}>
              <View style={styles.policeLegendIconWrapper}>
                <MaterialCommunityIcons name="police-badge" size={16} color="#1E40AF" />
              </View>
              <Text style={styles.legendText}>Police Station</Text>
            </View>
            
            <View style={styles.legendItem}>
              <View style={[styles.heatmapLegend, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>High Crime Area</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.heatmapLegend, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Medium Crime Area</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.heatmapLegend, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Low Crime Area</Text>
            </View>

            <View style={styles.legendStatsDivider} />
            <View style={styles.legendStats}>
              <View style={styles.legendStatItem}>
                <Text style={styles.legendStatNumber}>{policeStations.length}</Text>
                <Text style={styles.legendStatLabel}>Stations</Text>
              </View>
              <View style={styles.legendStatItem}>
                <Text style={styles.legendStatNumber}>
                  {staticHeatMapData.filter(p => p.weight >= 3).length}
                </Text>
                <Text style={styles.legendStatLabel}>High Risk</Text>
              </View>
              <View style={styles.legendStatItem}>
                <Text style={styles.legendStatNumber}>
                  {457 + userReports.length}
                </Text>
                <Text style={styles.legendStatLabel}>Reports</Text>
              </View>
            </View>
          </View>

          {/* Map Controls */}
          <View style={styles.mapControls}>
            <TouchableOpacity
              style={[styles.mapControlButton, mapType === 'standard' && styles.mapControlButtonActive]}
              onPress={() => setMapType('standard')}
            >
              <Ionicons 
                name="map" 
                size={16} 
                color={mapType === 'standard' ? COLORS.white : COLORS.textSecondary} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mapControlButton, mapType === 'satellite' && styles.mapControlButtonActive]}
              onPress={() => setMapType('satellite')}
            >
              <Ionicons 
                name="earth" 
                size={16} 
                color={mapType === 'satellite' ? COLORS.white : COLORS.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          {selectedStation && (
            <View style={styles.stationInfoCard}>
              <View style={styles.stationHeader}>
                <MaterialCommunityIcons name="police-badge" size={24} color="#1E40AF" />
                <Text style={styles.stationTitle}>{selectedStation.title}</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setSelectedStation(null)}
                >
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Add Report FAB */}
          <TouchableOpacity
            style={styles.addReportFAB}
            onPress={() => setModalVisible(true)}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.fabGradient}
            >
              <Ionicons name="add" size={28} color={COLORS.white} />
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const getFilteredStatsData = () => {
    if (selectedCategory === 'all') {
      return crimeStats.top_stations_2015_2016;
    }
    
    switch (selectedCategory) {
      case 'assault':
        return crimeStats.assault_stations_2015_2016;
      case 'sexual_attack':
        return crimeStats.sexual_offences_stations_2015_2016;
      case 'robbery':
        return crimeStats.robbery_hotspots;
      case 'harassment':
        return crimeStats.harassment_hotspots;
      default:
        return crimeStats.top_stations_2015_2016;
    }
  };

  const renderStatsTab = () => {
    const filteredData = getFilteredStatsData();
    const totalUserReports = Object.values(userStats).reduce((a, b) => a + b, 0);
    
    return (
      <View style={styles.statsContainer}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Source Reference */}
          <View style={styles.sourceCard}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} />
            <Text style={styles.sourceText}>
              Data Source: SAPS Crime Statistics 2005-2016 + User Reports
            </Text>
          </View>

          {/* Filter Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterTabs}
            contentContainerStyle={styles.filterTabsContent}
          >
            {filterCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterTab,
                  selectedCategory === cat.id && styles.filterTabActive
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedCategory === cat.id && styles.filterTabTextActive
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* User Stats Summary */}
          <View style={styles.userStatsCard}>
            <Text style={styles.userStatsTitle}>Community Reports (Live)</Text>
            <View style={styles.userStatsGrid}>
              <View style={styles.userStatItem}>
                <Text style={styles.userStatNumber}>{userStats.assault || 0}</Text>
                <Text style={styles.userStatLabel}>Assault</Text>
              </View>
              <View style={styles.userStatItem}>
                <Text style={styles.userStatNumber}>{userStats.sexual_attack || 0}</Text>
                <Text style={styles.userStatLabel}>Sexual</Text>
              </View>
              <View style={styles.userStatItem}>
                <Text style={styles.userStatNumber}>{userStats.robbery || 0}</Text>
                <Text style={styles.userStatLabel}>Robbery</Text>
              </View>
              <View style={styles.userStatItem}>
                <Text style={styles.userStatNumber}>{totalUserReports}</Text>
                <Text style={styles.userStatLabel}>Total</Text>
              </View>
            </View>
          </View>

          {/* Top Affected Areas */}
          <View style={styles.statsSection}>
            <Text style={styles.statsSectionTitle}>
              {selectedCategory === 'all' ? 'Top Affected Areas' : `Top ${filterCategories.find(c => c.id === selectedCategory)?.label} Hotspots`}
            </Text>
            
            {filteredData.map((item, index) => (
              <View key={index} style={styles.statCard}>
                <View style={styles.statRank}>
                  <Text style={styles.statRankText}>{index + 1}</Text>
                </View>
                <View style={styles.statInfo}>
                  <Text style={styles.statStation}>{item.station}</Text>
                  <Text style={styles.statCount}>
                    {item.total || item.count} reported incidents
                  </Text>
                </View>
                <View style={[
                  styles.statBadge,
                  { backgroundColor: index < 3 ? '#EF444415' : '#F59E0B15' }
                ]}>
                  <Text style={[
                    styles.statBadgeText,
                    { color: index < 3 ? '#EF4444' : '#F59E0B' }
                  ]}>
                    {index < 3 ? 'High' : 'Medium'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Add Report Button */}
        <TouchableOpacity
          style={styles.addReportButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.addReportGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={24} color={COLORS.white} />
            <Text style={styles.addReportText}>Submit Anonymous Report</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safety Reports</Text>
        <Text style={styles.headerSubtitle}>
          {activeTab === 'map' 
            ? 'View crime hotspots and police stations'
            : 'Crime statistics and community reports'
          }
        </Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.tabActive]}
          onPress={() => setActiveTab('map')}
        >
          <Ionicons 
            name={activeTab === 'map' ? 'map' : 'map-outline'} 
            size={20} 
            color={activeTab === 'map' ? COLORS.primary : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>
            Crime Map
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Ionicons 
            name={activeTab === 'stats' ? 'stats-chart' : 'stats-chart-outline'} 
            size={20} 
            color={activeTab === 'stats' ? COLORS.primary : COLORS.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
            Reports Stats
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'map' ? renderMapTab() : renderStatsTab()}
      </View>

      {/* Report Submission Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Anonymous Report</Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                resetForm();
              }}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Privacy Notice */}
              <View style={styles.privacyNotice}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
                <Text style={styles.privacyText}>
                  Your report is completely anonymous
                </Text>
              </View>

              {/* Category Selection */}
              <Text style={styles.inputLabel}>Incident Type *</Text>
              <View style={styles.categoriesGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      reportCategory === cat.id && styles.categoryCardActive
                    ]}
                    onPress={() => setReportCategory(cat.id)}
                  >
                    <MaterialCommunityIcons
                      name={cat.icon}
                      size={22}
                      color={reportCategory === cat.id ? COLORS.white : COLORS.primary}
                    />
                    <Text style={[
                      styles.categoryText,
                      reportCategory === cat.id && styles.categoryTextActive
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Location Input with Google Places Autocomplete */}
              <Text style={styles.inputLabel}>Location (Optional)</Text>
              <View style={styles.locationInputContainer}>
                <TextInput
                  style={styles.locationInput}
                  placeholder="Start typing location..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={reportLocation}
                  onChangeText={handleLocationChange}
                />
                <TouchableOpacity 
                  style={styles.locationButton}
                  onPress={handleUseCurrentLocation}
                >
                  <Ionicons name="locate" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
              
              {/* Google Places Autocomplete Suggestions */}
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {searchingLocation && (
                    <View style={styles.searchingIndicator}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.searchingText}>Searching...</Text>
                    </View>
                  )}
                  {locationSuggestions.map((place) => (
                    <TouchableOpacity
                      key={place.place_id}
                      style={styles.suggestionItem}
                      onPress={() => selectLocation(place)}
                    >
                      <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.suggestionText}>{place.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Description */}
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Provide details about what happened..."
                placeholderTextColor={COLORS.textTertiary}
                value={reportDescription}
                onChangeText={setReportDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitReport}
                disabled={submitting}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.submitGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={20} color={COLORS.white} />
                      <Text style={styles.submitText}>Submit Report</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSecondary,
    gap: 8,
  },
  tabActive: {
    backgroundColor: `${COLORS.primary}15`,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  
  // Map Styles
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  
  // Police Station Marker
  policeMarker: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: '#1E40AF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  policeMarkerSmall: {
    padding: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policeMarkerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E40AF',
  },
  policeMarkerSelected: {
    borderColor: '#DC2626',
    borderWidth: 3,
  },
  
  // Legend - Always show police icon
  legend: {
    position: 'absolute',
    top: 16,
    right: 10,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    minWidth: 160,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  policeLegendIconWrapper: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E40AF',
  },
  heatmapLegend: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  legendStatsDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  legendStats: {
    flexDirection: 'row',
    gap: 8,
  },
  legendStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  legendStatNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  legendStatLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  
  // Map Filters
  filterContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  
  // Map Controls
  mapControls: {
    position: 'absolute',
    bottom: 110,
    left: 16,
    flexDirection: 'column',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  mapControlButton: {
    padding: 10,
    borderRadius: 8,
  },
  mapControlButtonActive: {
    backgroundColor: COLORS.primary,
  },
  
  // Station Info Card
  stationInfoCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  
  // FAB
  addReportFAB: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Tab
  statsContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    position: 'relative',
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    padding: 12,
    margin: 20,
    marginBottom: 16,
    borderRadius: 12,
    gap: 10,
  },
  sourceText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTabs: {
    paddingLeft: 20,
    marginBottom: 16,
  },
  filterTabsContent: {
    paddingRight: 20,
    gap: 10,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  userStatsCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
  },
  userStatsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  userStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  userStatItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    padding: 12,
    borderRadius: 12,
  },
  userStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  userStatLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  statRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  statInfo: {
    flex: 1,
  },
  statStation: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  addReportButton: {
    position: 'absolute',
    bottom: 124,
    left: 20,
    right: 110,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  addReportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  addReportText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '70%',
    marginBottom: 210,
    margin: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  categoryCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  categoryCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 6,
    textAlign: 'center',
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  locationInputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  locationInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationButton: {
    width: 50,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  searchingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  textArea: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 160,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});