import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createReport } from '@/services/firestore.service';
import { getCurrentLocation } from '@/services/location.service';
import { uploadAudio, uploadImage } from '@/services/storage.service';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GeoPoint } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ReportScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [location, setLocation] = useState<string>('Fetching location...');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    try {
      setLocation(t('gettingLocation'));
      
      const locationData = await getCurrentLocation();
      
      if (!locationData) {
        setLocation(t('locationDenied'));
        setCoordinates({ lat: 0, lng: 0 });
        return;
      }

      setCoordinates(locationData.coordinates);
      setLocation(locationData.address);
      console.log('Location fetched:', locationData.address);
    } catch (error: any) {
      console.error('Error fetching location:', error);
      setCoordinates({ lat: 0, lng: 0 });
      setLocation(t('unableToFetchLocation'));
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionNeeded'), t('cameraPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Image captured:', result.assets[0].uri);
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(t('error'), t('failedToTakePhoto'));
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionNeeded'), t('galleryPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Image selected:', result.assets[0].uri);
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking from gallery:', error);
      Alert.alert(t('error'), t('failedToSelectImage'));
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permissionNeeded'), t('microphonePermissionRequired'));
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert(t('error'), t('failedToStartRecording'));
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert(t('error'), t('pleaseEnterTitle'));
      return;
    }

    if (!description.trim()) {
      Alert.alert(t('missingDescription'), t('missingDescriptionMsg'), [
        { text: t('addDescription'), style: 'cancel' },
        { text: t('continueAnyway'), onPress: () => submitReport() },
      ]);
      return;
    }

    await submitReport();
  };

  const submitReport = async (skipLocationCheck: boolean = false) => {
    if (!selectedCategory) {
      Alert.alert(t('error'), t('pleaseSelectCategory'));
      return;
    }

    try {
      setLoading(true);

      // Fetch fresh live location before submission
      if (!skipLocationCheck) {
        setLocation(t('capturingLiveLocation'));
        console.log('Fetching live location for submission...');
        const liveLocation = await getCurrentLocation(true); // High accuracy
        
        if (liveLocation) {
          setCoordinates(liveLocation.coordinates);
          setLocation(liveLocation.address);
          console.log('Live location captured:', liveLocation.address);
        } else if (!coordinates || (coordinates.lat === 0 && coordinates.lng === 0)) {
          setLoading(false);
          setLocation(t('unableToFetchLocation'));
          Alert.alert(
            t('locationNotAvailable'), 
            t('locationNotAvailableMsg'),
            [
              { text: t('cancel'), style: 'cancel' },
              { 
                text: t('continue'), 
                onPress: () => submitReport(true) 
              }
            ]
          );
          return;
        }
      }

      const userId = user?.uid || 'guest';
      console.log('Submitting report for user:', userId);

      let imageURL = null;
      if (imageUri) {
        try {
          console.log('Uploading image...');
          imageURL = await uploadImage(imageUri, userId);
          console.log('Image uploaded:', imageURL);
        } catch (error: any) {
          console.error('Image upload failed, continuing without image:', error);
          Alert.alert(
            t('warning'), 
            t('imageUploadFailed'),
            [
              { text: t('cancel'), style: 'cancel', onPress: () => { setLoading(false); return; } },
              { text: t('continue'), onPress: async () => { await continueSubmission(userId, null, null); } }
            ]
          );
          return;
        }
      }

      let audioURL = null;
      if (audioUri) {
        try {
          console.log('Uploading audio...');
          audioURL = await uploadAudio(audioUri, userId);
          console.log('Audio uploaded:', audioURL);
        } catch (error: any) {
          console.error('Audio upload failed, continuing without audio:', error);
        }
      }

      await continueSubmission(userId, imageURL, audioURL);
    } catch (error: any) {
      console.error('Error submitting report:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      Alert.alert(t('error'), t('failedToSubmitMsg', { error: errorMessage }));
      setLoading(false);
    }
  };

  const continueSubmission = async (userId: string, imageURL: string | null, audioURL: string | null) => {
    try {
      console.log('Creating report in Firestore...');
      
      // Use current coordinates (just refreshed before submission)
      const lat = coordinates?.lat || 0;
      const lng = coordinates?.lng || 0;
      console.log('Using live coordinates:', { lat, lng });
      
      const reportData = {
        title: title.trim(),
        description: description.trim() || title.trim(),
        type: selectedCategory,
        location: new GeoPoint(lat, lng),
        imageURL,
        audioURL,
        uid: userId,
        userName: user?.displayName || user?.email || 'Anonymous',
      };
      console.log('Report data:', reportData);
      
      const reportId = await createReport(reportData);

      console.log('Report created successfully with ID:', reportId);
      Alert.alert(t('success'), t('reportSubmitted'), [
        { text: 'OK', onPress: () => {
          setTitle('');
          setDescription('');
          setSelectedCategory('');
          setImageUri(null);
          setAudioUri(null);
          router.push('/(tabs)/community');
        }},
      ]);
    } catch (error: any) {
      console.error('Firestore error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('reportAnIssue')}</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Title Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>{t('title')}</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.cardBackground, 
              color: colors.text,
              borderColor: colors.border 
            }]}
            placeholder={t('titlePlaceholder')}
            placeholderTextColor={colors.icon}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>{t('description')}</Text>
          <TextInput
            style={[styles.descriptionInput, { 
              backgroundColor: colors.cardBackground, 
              color: colors.text,
              borderColor: colors.border 
            }]}
            placeholder={t('descriptionPlaceholder')}
            placeholderTextColor={colors.icon}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Evidence Section */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>{t('addEvidence')}</Text>
          {imageUri && (
            <Text style={{ fontSize: 12, color: colors.success, marginBottom: 8 }}>
              ✓ {t('imageAttached')}
            </Text>
          )}
          <View style={styles.evidenceGrid}>
            <TouchableOpacity
              style={[styles.evidenceButton, { 
                backgroundColor: colors.cardBackground,
                borderColor: imageUri ? colors.success : colors.border
              }]}
              onPress={takePhoto}
            >
              <IconSymbol name="camera.fill" size={32} color={colors.icon} />
              <Text style={[styles.evidenceButtonText, { color: colors.text }]}>
                {t('takePhoto')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.evidenceButton, { 
                backgroundColor: colors.cardBackground,
                borderColor: colors.border 
              }]}
              onPress={() => Alert.alert(t('comingSoon'), t('videoRecordingComingSoon'))}
            >
              <IconSymbol name="video.fill" size={32} color={colors.icon} />
              <Text style={[styles.evidenceButtonText, { color: colors.text }]}>
                {t('recordVideo')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.evidenceButton, { 
                backgroundColor: colors.cardBackground,
                borderColor: imageUri ? colors.success : colors.border 
              }]}
              onPress={pickFromGallery}
            >
              <IconSymbol name="photo.fill" size={32} color={colors.icon} />
              <Text style={[styles.evidenceButtonText, { color: colors.text }]}>
                {t('fromGallery')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.evidenceButton, { 
                backgroundColor: colors.cardBackground,
                borderColor: audioUri ? colors.success : colors.border 
              }]}
              onPress={recording ? stopRecording : startRecording}
            >
              <IconSymbol 
                name={recording ? "stop.circle.fill" : "mic.fill"} 
                size={32} 
                color={recording ? colors.danger : colors.icon} 
              />
              <Text style={[styles.evidenceButtonText, { color: colors.text }]}>
                {recording ? t('stop') : t('voiceNote')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Image Preview */}
        {imageUri && (
          <View style={styles.section}>
            <View style={styles.imagePreviewHeader}>
              <Text style={[styles.label, { color: colors.text }]}>{t('imagePreview')}</Text>
              <TouchableOpacity onPress={() => setImageUri(null)}>
                <Text style={[styles.removeImageText, { color: colors.danger }]}>{t('remove')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: imageUri }}
                style={styles.imagePreview}
                resizeMode="cover"
                onError={(error) => {
                  console.error('Image load error:', error.nativeEvent.error);
                  Alert.alert(t('error'), t('failedToLoadImagePreview'));
                }}
                onLoad={() => console.log('Image loaded successfully')}
              />
            </View>
          </View>
        )}

        {/* Location */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>📍 {t('location')}</Text>
          <TouchableOpacity 
            onPress={fetchLocation}
            style={styles.locationContainer}
          >
            <Text style={[styles.locationText, { color: colors.icon }]}>{location}</Text>
            {(location.includes(t('unableToFetchLocation').split(' ')[0]) || location.includes(t('locationDenied').split(' ')[0])) && (
              <Text style={[styles.retryText, { color: colors.primary }]}>{t('tapToRetry')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>{t('category')}</Text>
          <View style={styles.categoryGrid}>
            {[t('pothole'), t('garbage'), t('streetlight'), t('waterLeak'), t('sewageBlock'), t('other')].map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor:
                      selectedCategory === category ? colors.primary : colors.cardBackground,
                    borderColor: selectedCategory === category ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    {
                      color: selectedCategory === category ? '#fff' : colors.text,
                    },
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{t('submitReport')}</Text>
          )}
        </TouchableOpacity>

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
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  descriptionInput: {
    minHeight: 120,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  evidenceButton: {
    width: '48%',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  evidenceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  locationContainer: {
    paddingVertical: 4,
  },
  locationText: {
    fontSize: 15,
    lineHeight: 22,
    flexWrap: 'wrap',
  },
  retryText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  imagePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  removeImageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  imagePreview: {
    width: '100%',
    height: 250,
  },
  submitButton: {
    marginHorizontal: 24,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});