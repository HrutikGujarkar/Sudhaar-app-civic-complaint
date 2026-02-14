import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    GeoPoint,
    getDocs,
    query,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Report {
  id?: string;
  title: string;
  description: string;
  type: string;
  location: GeoPoint;
  imageURL: string | null;
  audioURL: string | null;
  status: number; // 0: Reported, 1: Validated, 2: Working, 3: Completed
  timestamp: Timestamp;
  uid: string;
  userName: string;
  votedBy: string[];
}

// Create a new report
export const createReport = async (reportData: Omit<Report, 'id' | 'timestamp' | 'votedBy' | 'status'>) => {
  try {
    console.log('Creating report with data:', reportData);
    const docRef = await addDoc(collection(db, 'reports'), {
      ...reportData,
      timestamp: Timestamp.now(),
      status: 0,
      votedBy: [],
    });
    console.log('Report created with ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating report:', error);
    throw new Error(`Failed to create report: ${error.message || error}`);
  }
};

// Get all reports
export const getAllReports = async (): Promise<Report[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'reports'));
    const reports = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Report));
    
    // Sort by timestamp on client side
    return reports.sort((a, b) => {
      const timeA = a.timestamp?.toMillis?.() || 0;
      const timeB = b.timestamp?.toMillis?.() || 0;
      return timeB - timeA; // Descending order (newest first)
    });
  } catch (error) {
    console.error('Error getting reports:', error);
    throw error;
  }
};

// Get reports by user
export const getUserReports = async (uid: string): Promise<Report[]> => {
  try {
    const q = query(
      collection(db, 'reports'),
      where('uid', '==', uid)
    );
    const querySnapshot = await getDocs(q);
    const reports = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Report));
    
    // Sort by timestamp on client side to avoid composite index requirement
    return reports.sort((a, b) => {
      const timeA = a.timestamp?.toMillis?.() || 0;
      const timeB = b.timestamp?.toMillis?.() || 0;
      return timeB - timeA; // Descending order (newest first)
    });
  } catch (error) {
    console.error('Error getting user reports:', error);
    throw error;
  }
};

// Get nearby reports (this is a simplified version, you may want to use GeoFire for better location queries)
export const getNearbyReports = async (userLat: number, userLng: number): Promise<Report[]> => {
  try {
    const reports = await getAllReports();
    // Filter reports within approximately 10km radius (simplified)
    return reports.filter(report => {
      const lat = report.location.latitude;
      const lng = report.location.longitude;
      const distance = getDistance(userLat, userLng, lat, lng);
      return distance < 10; // 10km
    });
  } catch (error) {
    console.error('Error getting nearby reports:', error);
    throw error;
  }
};

// Vote on a report
export const voteReport = async (reportId: string, userId: string, isUpvote: boolean) => {
  try {
    const reportRef = doc(db, 'reports', reportId);
    if (isUpvote) {
      await updateDoc(reportRef, {
        votedBy: arrayUnion(userId),
      });
    } else {
      await updateDoc(reportRef, {
        votedBy: arrayRemove(userId),
      });
    }
  } catch (error) {
    console.error('Error voting report:', error);
    throw error;
  }
};

// Update report status
export const updateReportStatus = async (reportId: string, status: number) => {
  try {
    const reportRef = doc(db, 'reports', reportId);
    await updateDoc(reportRef, { status });
  } catch (error) {
    console.error('Error updating report status:', error);
    throw error;
  }
};

// Helper function to calculate distance between two coordinates (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
