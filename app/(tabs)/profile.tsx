import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { signOutUser } from '@/services/auth.service';
import { getUserReports, Report } from '@/services/firestore.service';
import { getAddressFromGeoPoint } from '@/services/location.service';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user, setSkipAuth } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationAddresses, setLocationAddresses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchMyReports();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchMyReports = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching reports for user:', user.uid);
      const reports = await getUserReports(user.uid);
      console.log('Reports fetched successfully:', reports.length);
      setMyReports(reports);
      
      // Fetch addresses for all reports
      const addresses: Record<string, string> = {};
      for (const report of reports) {
        if (report.id && report.location) {
          try {
            const address = await getAddressFromGeoPoint(report.location);
            addresses[report.id] = address;
          } catch (error) {
            console.error('Error fetching address for report:', report.id);
            addresses[report.id] = t('loadingLocation');
          }
        }
      }
      setLocationAddresses(addresses);
    } catch (error: any) {
      console.error('Error fetching user reports:', error);
      Alert.alert(
        t('error'),
        `Failed to load your reports. ${error.message || 'Please try again.'}`
      );
    } finally {
      setLoading(false);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyReports();
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    Alert.alert(
      user ? t('signOut') || 'Sign Out' : 'Exit Guest Mode',
      user ? 'Are you sure you want to sign out?' : 'Return to login screen?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: user ? 'Sign Out' : 'Exit',
          style: 'destructive',
          onPress: async () => {
            try {
              if (user) {
                await signOutUser();
              } else {
                setSkipAuth(false);
              }
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: any) => {
    const date = timestamp?.toDate?.() || new Date();
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status: number) => {
    if (status === 0) return colors.icon;
    if (status === 1) return colors.primary;
    if (status === 2) return colors.warning;
    return colors.success;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.displayName?.charAt(0) || 'G'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.displayName || 'Guest User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'Sign in to save your reports'}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {myReports.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>{t('totalReports') || 'Total Reports'}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {myReports.filter(r => r.status === 3).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>{t('resolved') || 'Resolved'}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.statNumber, { color: colors.warning }]}>
              {myReports.filter(r => r.status < 3).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.text }]}>{t('pending') || 'Pending'}</Text>
          </View>
        </View>

        {/* My Complaints Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('myComplaints')}</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : myReports.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground }]}>
              <IconSymbol name="doc.text" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                {t('noComplaintsYet') || 'No complaints yet'}
              </Text>
              <TouchableOpacity
                style={[styles.reportButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(tabs)/report')}
              >
                <Text style={styles.reportButtonText}>{t('reportIssue')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myReports.map((report) => (
              <View
                key={report.id}
                style={[styles.reportCard, { backgroundColor: colors.cardBackground }]}
              >
                <View style={styles.reportCardHeader}>
                  <Text style={[styles.reportTitle, { color: colors.text }]}>
                    {report.title}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(report.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(report.status) },
                      ]}
                    >
                      {[t('reported'), t('validated'), t('working'), t('completed')][report.status]}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[styles.reportDescription, { color: colors.icon }]}
                  numberOfLines={2}
                >
                  {report.description}
                </Text>

                {report.imageURL && (
                  <View style={styles.reportImageContainer}>
                    <Image
                      source={{ uri: report.imageURL }}
                      style={styles.reportImage}
                      resizeMode="cover"
                    />
                  </View>
                )}

                <View style={styles.reportFooter}>
                  <View style={styles.reportMeta}>
                    <IconSymbol name="mappin" size={14} color={colors.icon} />
                    <Text style={[styles.reportMetaText, { color: colors.icon }]} numberOfLines={1}>
                      {report.id && locationAddresses[report.id] 
                        ? locationAddresses[report.id] 
                        : report.type}
                    </Text>
                  </View>
                  <Text style={[styles.reportDate, { color: colors.icon }]}>
                    {formatDate(report.timestamp)}
                  </Text>
                </View>

                {report.votedBy && report.votedBy.length > 0 && (
                  <View style={styles.voteInfo}>
                    <IconSymbol name="hand.thumbsup.fill" size={14} color={colors.primary} />
                    <Text style={[styles.voteText, { color: colors.text }]}>
                      {report.votedBy.length} {report.votedBy.length === 1 ? 'vote' : 'votes'}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
            onPress={() => Alert.alert(t('comingSoon'), t('settingsComingSoon') || 'Settings coming soon!')}
          >
            <IconSymbol name="gearshape.fill" size={24} color={colors.icon} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>{t('settings') || 'Settings'}</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
            onPress={() => Alert.alert(t('comingSoon'), t('helpSupportComingSoon') || 'Help & Support coming soon!')}
          >
            <IconSymbol name="questionmark.circle.fill" size={24} color={colors.icon} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              {t('helpSupport') || 'Help & Support'}
            </Text>
            <IconSymbol name="chevron.right" size={20} color={colors.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.cardBackground }]}
            onPress={handleSignOut}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color={colors.danger} />
            <Text style={[styles.actionButtonText, { color: colors.danger }]}>
              {t('signOut') || 'Sign Out'}
            </Text>
          </TouchableOpacity>
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
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userEmail: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyCard: {
    padding: 48,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
  },
  reportButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reportDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  reportMetaText: {
    fontSize: 12,
    flex: 1,
  },
  reportImageContainer: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
  },
  reportImage: {
    width: '100%',
    height: '100%',
  },
  reportDate: {
    fontSize: 11,
  },
  voteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  voteText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    flex: 1,
  },
});