import * as FileSystem from 'expo-file-system';
import { getDownloadURL, ref, uploadBytes, uploadString } from 'firebase/storage';
import { storage } from '../config/firebase';

function guessContentType(uri: string, fallback: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  return fallback;
}

async function readUriAsBlobOrBase64(uri: string): Promise<{ kind: 'blob'; blob: Blob } | { kind: 'base64'; base64: string }> {
  // Fast-path: fetch works for most file:// URIs.
  try {
    const response = await fetch(uri);
    if (response.ok) {
      const blob = await response.blob();
      return { kind: 'blob', blob };
    }
  } catch {
    // ignore and fall back
  }

  const base64 = await readUriAsBase64(uri);
  return { kind: 'base64', base64 };
}

async function readUriAsBase64(uri: string): Promise<string> {
  // expo-file-system can read content:// URIs on Android.
  let readableUri = uri;
  let tempUri: string | null = null;

  if (uri.startsWith('content://')) {
    const extMatch = uri.match(/\.(jpg|jpeg|png|webp|m4a)(\?.*)?$/i);
    const ext = extMatch?.[1] ? `.${extMatch[1]}` : '';
    tempUri = `${FileSystem.cacheDirectory}upload-${Date.now()}${ext}`;
    await FileSystem.copyAsync({ from: uri, to: tempUri });
    readableUri = tempUri;
  }

  try {
    return await FileSystem.readAsStringAsync(readableUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } finally {
    if (tempUri) {
      try {
        await FileSystem.deleteAsync(tempUri, { idempotent: true });
      } catch {
        // ignore
      }
    }
  }
}

async function uploadWithFallback(
  storageRef: ReturnType<typeof ref>,
  uri: string,
  contentType: string,
  fileData: { kind: 'blob'; blob: Blob } | { kind: 'base64'; base64: string }
): Promise<void> {
  try {
    if (fileData.kind === 'blob') {
      await uploadBytes(storageRef, fileData.blob, { contentType });
    } else {
      await uploadString(storageRef, fileData.base64, 'base64', { contentType });
    }
  } catch (error) {
    if (fileData.kind === 'blob') {
      console.warn('Blob upload failed; retrying with base64...');
      const base64 = await readUriAsBase64(uri);
      await uploadString(storageRef, base64, 'base64', { contentType });
      return;
    }
    throw error;
  }
}

export const uploadImage = async (uri: string, userId: string): Promise<string> => {
  try {
    console.log('Starting image upload for URI:', uri);
    const contentType = guessContentType(uri, 'image/jpeg');
    const fileData = await readUriAsBlobOrBase64(uri);
    if (fileData.kind === 'blob') {
      console.log('Image blob created, size:', fileData.blob.size);
    } else {
      console.log('Image read as base64, length:', fileData.base64.length);
    }
    
    const filename = `reports/${userId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    console.log('Uploading to Firebase Storage:', filename);

    await uploadWithFallback(storageRef, uri, contentType, fileData);
    console.log('Upload complete, getting download URL...');
    
    const downloadURL = await getDownloadURL(storageRef);
    console.log('Download URL obtained:', downloadURL);
    
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading image:', error);
    const code = typeof error?.code === 'string' ? ` (${error.code})` : '';
    const message = (error?.message || error?.toString?.() || 'Unknown error').toString();
    throw new Error(`Image upload failed${code}: ${message}`);
  }
};

export const uploadAudio = async (uri: string, userId: string): Promise<string> => {
  try {
    const contentType = guessContentType(uri, 'audio/mp4');
    const fileData = await readUriAsBlobOrBase64(uri);
    
    const filename = `audio/${userId}/${Date.now()}.m4a`;
    const storageRef = ref(storage, filename);

    await uploadWithFallback(storageRef, uri, contentType, fileData);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading audio:', error);
    throw error;
  }
};
