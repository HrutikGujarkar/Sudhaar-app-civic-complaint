import * as Location from 'expo-location';
import { GeoPoint } from 'firebase/firestore';

/**
 * Get readable address from coordinates
 */
export const getAddressFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    if (latitude === 0 && longitude === 0) {
      return 'Location not available';
    }

    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (addresses && addresses[0]) {
      const address = addresses[0];
      console.log('Full address details:', JSON.stringify(address, null, 2));
      
      const { 
        street, 
        streetNumber,
        name,
        district, 
        city, 
        subregion, 
        region,
        postalCode 
      } = address;
      
      // Build precise address: Street/Road + Area/Locality + Ward/District + City
      const parts: string[] = [];
      
      // 1. Street/Road level (most precise)
      if (street) {
        const streetPart = streetNumber ? `${streetNumber} ${street}` : street;
        parts.push(streetPart);
      } else if (name && name !== city && name !== subregion) {
        parts.push(name);
      }
      
      // 2. Area/Ward level (district is typically the ward/locality)
      if (district && district !== city && !parts.includes(district)) {
        parts.push(district);
      }
      
      // 3. Sub-region level (broader area/zone)
      if (subregion && subregion !== city && !parts.includes(subregion)) {
        parts.push(subregion);
      }
      
      // 4. City level
      if (city && !parts.includes(city)) {
        parts.push(city);
      } else if (region && !city && !parts.includes(region)) {
        parts.push(region);
      }
      
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }

    // Fallback to coordinates
    return `${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°`;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return `${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°`;
  }
};

/**
 * Get readable address from GeoPoint
 */
export const getAddressFromGeoPoint = async (location: GeoPoint): Promise<string> => {
  if (!location) return 'Location not available';
  return getAddressFromCoordinates(location.latitude, location.longitude);
};

/**
 * Get current location with address
 */
export const getCurrentLocation = async (highAccuracy: boolean = false): Promise<{
  coordinates: { lat: number; lng: number };
  address: string;
} | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    // Use highest accuracy when requested for precise location capture
    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: highAccuracy ? Location.Accuracy.Highest : Location.Accuracy.High,
    });

    const coordinates = {
      lat: currentLocation.coords.latitude,
      lng: currentLocation.coords.longitude,
    };

    console.log('Precise coordinates captured:', coordinates);
    console.log('Location accuracy:', currentLocation.coords.accuracy, 'meters');

    const address = await getAddressFromCoordinates(
      coordinates.lat,
      coordinates.lng
    );

    console.log('Final address:', address);

    return { coordinates, address };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
};

/**
 * Calculate distance between two points in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance for display
 */
export const formatDistance = (distanceInKm: number): string => {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)}m away`;
  }
  return `${distanceInKm.toFixed(1)}km away`;
};
