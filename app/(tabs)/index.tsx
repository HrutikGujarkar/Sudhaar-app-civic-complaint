import LanguageSelector from '@/components/LanguageSelector';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getNearbyReports, Report } from '@/services/firestore.service';
import { calculateDistance, formatDistance, getCurrentLocation } from '@/services/location.service';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [location, setLocation] = useState<string>('Fetching location...');
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyReports, setNearbyReports] = useState<Report[]>([]);
  const [reportDistances, setReportDistances] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLocation();
    fetchNearbyReports();
  }, []);

  const fetchLocation = async () => {
    try {
      const locationData = await getCurrentLocation(true); // High accuracy
      
      if (!locationData) {
        setLocation('Location permission denied');
        return;
      }

      setUserCoordinates(locationData.coordinates);
      setLocation(locationData.address);
    } catch (error) {
      console.error('Error fetching location:', error);
      setLocation('Unable to fetch location');
    }
  };

  const fetchNearbyReports = async () => {
    try {
      const locationData = await getCurrentLocation(true); // High accuracy
      
      if (!locationData) {
        console.log('Location permission not granted for nearby reports');
        return;
      }

      const reports = await getNearbyReports(
        locationData.coordinates.lat,
        locationData.coordinates.lng
      );
      setNearbyReports(reports.slice(0, 3)); // Show only top 3
      
      // Calculate distances
      const distances: Record<string, string> = {};
      for (const report of reports.slice(0, 3)) {
        if (report.id && report.location) {
          const distance = calculateDistance(
            locationData.coordinates.lat,
            locationData.coordinates.lng,
            report.location.latitude,
            report.location.longitude
          );
          distances[report.id] = formatDistance(distance);
        }
      }
      setReportDistances(distances);
    } catch (error) {
      console.error('Error fetching nearby reports:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchLocation(), fetchNearbyReports()]);
    setRefreshing(false);
  };

  const getStatusText = (status: number) => {
    const statuses = ['Reported', 'Validated', 'Working', 'Completed'];
    return statuses[status] || 'Unknown';
  };

  const formatDate = (timestamp: any) => {
    const date = timestamp?.toDate?.() || new Date();
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <Text style={styles.appName}>Sudhaar</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.iconButton}>
                  <IconSymbol name="bell.fill" size={24} color="#fff" />
                </TouchableOpacity>
                <LanguageSelector />
              </View>
            </View>
            
            <Text style={styles.greeting}>{t('greeting', { name: user?.displayName || t('guest') })}</Text>
            
            <View style={styles.locationContainer}>
              <IconSymbol name="mappin" size={16} color="#fff" />
              <Text style={styles.location}>{location}</Text>
            </View>
          </View>
        </View>

        {/* Main Actions Grid */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.actionCard, { backgroundColor: colors.cardBackground }]}
            onPress={() => router.push('/(tabs)/report')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#DBEAFE' }]}>
              <IconSymbol name="camera.fill" size={32} color="#3B82F6" />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text }]}>{t('reportIssue')}</Text>
            <Text style={[styles.actionSubtitle, { color: colors.icon }]}>
              {t('raiseCivicProblems')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.actionCard, { backgroundColor: colors.cardBackground }]}
            onPress={() => router.push('/(tabs)/map')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <IconSymbol name="mappin.circle.fill" size={32} color="#10B981" />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text }]}>{t('issuesNearMe')}</Text>
            <Text style={[styles.actionSubtitle, { color: colors.icon }]}>
              {t('checkLocalProblems')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.actionCard, { backgroundColor: colors.cardBackground }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <IconSymbol name="doc.text.fill" size={32} color="#F59E0B" />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text }]}>{t('myComplaints')}</Text>
            <Text style={[styles.actionSubtitle, { color: colors.icon }]}>
              {t('trackYourReports')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.actionCard, { backgroundColor: colors.cardBackground }]}
            onPress={() => Alert.alert('Coming Soon', 'Alerts & News feature coming soon!')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#EF4444" />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text }]}>{t('alertsNews')}</Text>
            <Text style={[styles.actionSubtitle, { color: colors.icon }]}>{t('stayUpdated')}</Text>
          </TouchableOpacity>
        </View>

        {/* Nearby Complaints */}
        <View style={styles.nearbySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('nearbyComplaints')}</Text>

          {nearbyReports.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                {t('noNearbyComplaints')}
              </Text>
            </View>
          ) : (
            nearbyReports.map((report) => (
              <TouchableOpacity
                key={report.id}
                activeOpacity={0.7}
                style={[styles.reportCard, { backgroundColor: colors.cardBackground }]}
                onPress={() => router.push('/(tabs)/community')}
              >
                <Text style={[styles.reportTitle, { color: colors.text }]}>
                  {report.title}
                </Text>
                <Text
                  style={[styles.reportDescription, { color: colors.icon }]}
                  numberOfLines={2}
                >
                  {report.description}
                </Text>
                <View style={styles.reportFooter}>
                  <View style={styles.reportLocation}>
                    <IconSymbol name="mappin" size={14} color={colors.icon} />
                    <Text style={[styles.reportLocationText, { color: colors.icon }]}>
                      {report.id && reportDistances[report.id] 
                        ? reportDistances[report.id]
                        : 'Nearby'}
                    </Text>
                  </View>
                  <View style={styles.reportVotes}>
                    <IconSymbol name="hand.thumbsup.fill" size={14} color={colors.primary} />
                    <Text style={[styles.reportVotesText, { color: colors.text }]}>
                      {report.votedBy?.length || 0}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.reportDate, { color: colors.icon }]}>
                  {formatDate(report.timestamp)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    gap: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  location: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    flexWrap: 'wrap',
    flex: 1,
    lineHeight: 18,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 12,
  },
  actionCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
  },
  nearbySection: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  reportCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportLocationText: {
    fontSize: 12,
  },
  reportVotes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportVotesText: {
    fontSize: 14,
    fontWeight: ' 600',
  },
  reportDate: {
    fontSize: 11,
  },
});
