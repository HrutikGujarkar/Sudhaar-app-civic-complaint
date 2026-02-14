import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAllReports, Report } from '@/services/firestore.service';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [loading, setLoading] = useState(true);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [region, setRegion] = useState({
    latitude: 21.1458,
    longitude: 79.0882,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  useEffect(() => {
    initializeMap();
  }, []);

  const initializeMap = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }

      const allReports = await getAllReports();
      setReports(allReports);
    } catch (error) {
      console.error('Error initializing map:', error);
      Alert.alert('Error', 'Failed to load map data');
    } finally {
      setLoading(false);
    }
  };

  const generateMapHTML = () => {
    const markers = reports
      .filter(report => report.location)
      .map(
        (report, index) => `
        L.marker([${report.location.latitude}, ${report.location.longitude}], {
          icon: L.divIcon({
            html: '<div style="background-color: #EF4444; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 18px;">⚠️</div>',
            className: 'issue-marker',
            iconSize: [38, 38]
          })
        }).addTo(map).bindPopup('<b>${report.title.replace(/'/g, "\\'")}</b><br>${report.type}');
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" 
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossorigin=""/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          crossorigin=""></script>
        <style>
          * { margin: 0; padding: 0; }
          html, body { height: 100%; width: 100%; }
          #map { 
            height: 100%; 
            width: 100%; 
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          try {
            console.log('Initializing map...');
            var map = L.map('map', {
              center: [${region.latitude}, ${region.longitude}],
              zoom: 13,
              zoomControl: true
            });
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxZoom: 19,
              minZoom: 3
            }).addTo(map);
            
            // User location marker (blue pin)
            L.marker([${region.latitude}, ${region.longitude}], {
              icon: L.divIcon({
                html: '<div style="background-color: #6366F1; width: 20px; height: 20px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                className: 'user-marker',
                iconSize: [28, 28]
              })
            }).addTo(map).bindPopup('<b>Your Location</b>');
            
            // Issue markers
            ${markers}
            
            console.log('Map initialized successfully');
          } catch (error) {
            console.error('Map initialization error:', error);
            document.body.innerHTML = '<div style="padding: 20px; color: red;">Error loading map: ' + error.message + '</div>';
          }
        </script>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={[styles.headerTitle, { color: '#fff' }]}>Issues Map</Text>
      </View>

      {webViewLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 10 }}>Loading map...</Text>
        </View>
      )}

      <WebView
        style={styles.map}
        originWhitelist={['*']}
        source={{ html: generateMapHTML() }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        onLoadStart={() => {
          console.log('WebView loading started');
          setWebViewLoading(true);
        }}
        onLoadEnd={() => {
          console.log('WebView loading ended');
          setWebViewLoading(false);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error: ', nativeEvent);
          setWebViewLoading(false);
          Alert.alert('Map Error', 'Failed to load map. Please try again.');
        }}
        onMessage={(event) => {
          console.log('WebView message:', event.nativeEvent.data);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    width: '100%',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});