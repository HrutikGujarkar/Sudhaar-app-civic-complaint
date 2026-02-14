import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createReport } from '@/services/firestore.service';
import { uploadAudio, uploadImage } from '@/services/storage.service';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GeoPoint } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const CATEGORIES = ['Pothole', 'Garbage', 'Streetlight', 'Water Leak', 'Sewage Block', 'Other'];

export default function ReportScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation('Location permission denied');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setCoordinates({
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude,
      });

      const address = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (address[0]) {
        const { city, subregion, street } = address[0];
        setLocation(
          `${street || ''} ${subregion || city || 'Unknown'}, ${city || 'Unknown'}`
        );
      }
    } catch (error) {
      console.error('Error fetching location:', error);
      setLocation('Unable to fetch location');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Microphone permission is required');
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
      Alert.alert('Error', 'Failed to start recording');
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
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (!coordinates) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    try {
      setLoading(true);

      const userId = user?.uid || 'guest';

      let imageURL = null;
      if (imageUri) {
        imageURL = await uploadImage(imageUri, userId);
      }

      let audioURL = null;
      if (audioUri) {
        audioURL = await uploadAudio(audioUri, userId);
      }

      await createReport({
        title: title.trim(),
        description: description.trim() || title.trim(),
        type: selectedCategory,
        location: new GeoPoint(coordinates.lat, coordinates.lng),
        imageURL,
        audioURL,
        uid: userId,
      });

      Alert.alert('Success', 'Report submitted successfully!', [
        { text: 'OK', onPress: () => {
          setTitle('');
          setDescription('');
          setSelectedCategory('');
          setImageUri(null);
          setAudioUri(null);
          router.push('/(tabs)/community');
        }},
      ]);
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Report an Issue</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Title Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Title</Text>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.cardBackground, 
              color: colors.text,
              borderColor: colors.border 
            }]}
            placeholder="e.g., Large Pothole on Main Street"
            placeholderTextColor={colors.icon}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Evidence Section */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Add Evidence</Text>
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
                Take Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.evidenceButton, { 
                backgroundColor: colors.cardBackground,
                borderColor: colors.border 
              }]}
              onPress={() => Alert.alert('Coming Soon', 'Video recording coming soon!')}
            >
              <IconSymbol name="video.fill" size={32} color={colors.icon} />
              <Text style={[styles.evidenceButtonText, { color: colors.text }]}>
                Record Video
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
                From Gallery
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
                {recording ? 'Stop' : 'Voice Note'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>📍 Location</Text>
          <Text style={[styles.locationText, { color: colors.icon }]}>{location}</Text>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
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
            <Text style={styles.submitButtonText}>Submit Report</Text>
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
  locationText: {
    fontSize: 16,
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