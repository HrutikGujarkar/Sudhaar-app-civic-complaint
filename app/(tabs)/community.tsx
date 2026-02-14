import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAllReports, Report, voteReport } from '@/services/firestore.service';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const STATUS_LABELS = ['Reported', 'Validated', 'Working', 'Completed'];
const FILTER_OPTIONS = ['Reported', 'Validated', 'Working', 'Completed'];

export default function CommunityScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<number | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const allReports = await getAllReports();
      setReports(allReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const handleVote = async (reportId: string, currentlyVoted: boolean) => {
    if (!user) return;
    
    try {
      await voteReport(reportId, user.uid, !currentlyVoted);
      // Update local state
      setReports(reports.map(report => {
        if (report.id === reportId) {
          const votedBy = report.votedBy || [];
          return {
            ...report,
            votedBy: currentlyVoted
              ? votedBy.filter(id => id !== user.uid)
              : [...votedBy, user.uid],
          };
        }
        return report;
      }));
    } catch (error) {
      console.error('Error voting:', error);
    }
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

  const filteredReports = selectedFilter !== null
    ? reports.filter(report => report.status === selectedFilter)
    : reports;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Community Feed</Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedFilter === null ? colors.primary : colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setSelectedFilter(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: selectedFilter === null ? '#fff' : colors.text },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {FILTER_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selectedFilter === index ? colors.primary : colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setSelectedFilter(index)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: selectedFilter === index ? '#fff' : colors.text },
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No reports found
            </Text>
          </View>
        ) : (
          filteredReports.map((report) => {
            const isVoted = user && report.votedBy?.includes(user.uid);
            return (
              <View
                key={report.id}
                style={[styles.reportCard, { backgroundColor: colors.cardBackground }]}
              >
                {/* User Info */}
                <View style={styles.reportHeader}>
                  <View style={styles.userInfo}>
                    <View style={[styles.avatar, { backgroundColor: colors.icon }]}>
                      <Text style={styles.avatarText}>A</Text>
                    </View>
                    <View>
                      <Text style={[styles.userName, { color: colors.text }]}>
                        Anonymous
                      </Text>
                      <Text style={[styles.reportDate, { color: colors.icon }]}>
                        {formatDate(report.timestamp)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Report Content */}
                <Text style={[styles.reportTitle, { color: colors.text }]}>
                  {report.title}
                </Text>
                <Text style={[styles.reportDescription, { color: colors.icon }]}>
                  {report.description}
                </Text>

                {/* Status Progress */}
                <View style={styles.statusContainer}>
                  {STATUS_LABELS.map((label, index) => (
                    <View key={label} style={styles.statusItem}>
                      <View
                        style={[
                          styles.statusIcon,
                          {
                            backgroundColor:
                              index <= report.status ? getStatusColor(index) : colors.border,
                          },
                        ]}
                      >
                        {index <= report.status && (
                          <IconSymbol name="checkmark" size={12} color="#fff" />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.statusLabel,
                          {
                            color: index <= report.status ? colors.text : colors.icon,
                            fontWeight: index <= report.status ? '600' : '400',
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Footer */}
                <View style={styles.reportFooter}>
                  <View style={styles.locationInfo}>
                    <IconSymbol name="mappin" size={14} color={colors.icon} />
                    <Text style={[styles.locationText, { color: colors.icon }]}>
                      {report.location ? 'Nearby location' : 'Location unavailable'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.voteButton}
                    onPress={() => handleVote(report.id!, !!isVoted)}
                  >
                    <IconSymbol
                      name={isVoted ? "hand.thumbsup.fill" : "hand.thumbsup"}
                      size={20}
                      color={isVoted ? colors.primary : colors.icon}
                    />
                    <Text
                      style={[
                        styles.voteCount,
                        { color: isVoted ? colors.primary : colors.text },
                      ]}
                    >
                      {report.votedBy?.length || 0}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  filterContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  reportCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  reportDate: {
    fontSize: 12,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  reportDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
  },
  statusItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  voteCount: {
    fontSize: 16,
    fontWeight: '600',
  },
});