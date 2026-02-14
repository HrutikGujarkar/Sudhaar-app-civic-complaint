import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../config/firebase';

export const uploadImage = async (uri: string, userId: string): Promise<string> => {
  try {
    console.log('Starting image upload for URI:', uri);
    const response = await fetch(uri);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('Image blob created, size:', blob.size);
    
    const filename = `reports/${userId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    console.log('Uploading to Firebase Storage:', filename);
    
    await uploadBytes(storageRef, blob);
    console.log('Upload complete, getting download URL...');
    
    const downloadURL = await getDownloadURL(storageRef);
    console.log('Download URL obtained:', downloadURL);
    
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading image:', error);
    throw new Error(`Image upload failed: ${error.message || error}`);
  }
};

export const uploadAudio = async (uri: string, userId: string): Promise<string> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const filename = `audio/${userId}/${Date.now()}.m4a`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading audio:', error);
    throw error;
  }
};
