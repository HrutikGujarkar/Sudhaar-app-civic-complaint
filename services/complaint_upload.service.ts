import * as FileSystem from 'expo-file-system';

export type BackendUploadResponse =
  | {
      status: 'success';
      reportId?: string;
      imageURL?: string | null;
      classification?: string;
      confidence?: number;
    }
  | {
      status: 'rejected' | 'pending_review' | 'not_verified';
      message?: string;
      classification?: string;
      confidence?: number;
    };

function sanitizeBackendMessage(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const msg = raw.trim();
  if (!msg) return undefined;
  const lower = msg.toLowerCase();

  // Don't surface internal infrastructure/config details to end users.
  const internalMarkers = [
    'firebasestorage.googleapis.com',
    'upload/storage/v1',
    'bucket does not exist',
    'cloudinary is not configured',
    'firebase storage bucket',
    'service account',
    'traceback',
    'stack trace',
  ];

  if (internalMarkers.some((m) => lower.includes(m))) {
    return 'We could not submit your complaint right now. Please try again in a moment.';
  }

  return msg;
}

function getBackendBaseUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!url) return null;
  return url.replace(/\/$/, '');
}

function guessMimeTypeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function guessFilenameFromUri(uri: string): string {
  const parts = uri.split('/');
  const last = parts[parts.length - 1] || 'photo.jpg';
  return last.includes('.') ? last : `${last}.jpg`;
}

async function prepareUriForMultipart(uri: string): Promise<{ uri: string; cleanup?: () => Promise<void> }> {
  if (!uri.startsWith('content://')) return { uri };

  const extMatch = uri.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i);
  const ext = extMatch?.[1] ? `.${extMatch[1]}` : '.jpg';
  const baseDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory;
  if (!baseDir) return { uri };
  const tempUri = `${baseDir}upload-${Date.now()}${ext}`;

  await FileSystem.copyAsync({ from: uri, to: tempUri });
  return {
    uri: tempUri,
    cleanup: async () => {
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
    },
  };
}

export async function uploadComplaintToBackend(params: {
  imageUri: string;
  title: string;
  description: string;
  issueType: string;
  lat: number;
  lng: number;
  uid: string;
  userName: string;
}): Promise<BackendUploadResponse> {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return {
      status: 'not_verified',
      message: 'Server is not configured. Set EXPO_PUBLIC_BACKEND_URL and restart the app.',
    };
  }

  const { uri: uploadUri, cleanup } = await prepareUriForMultipart(params.imageUri);
  try {
    const form = new FormData();
    form.append('file', {
      uri: uploadUri,
      name: guessFilenameFromUri(uploadUri),
      type: guessMimeTypeFromUri(uploadUri),
    } as any);

    form.append('title', params.title);
    form.append('description', params.description);
    form.append('issueType', params.issueType);
    form.append('lat', String(params.lat));
    form.append('lng', String(params.lng));
    form.append('uid', params.uid);
    form.append('userName', params.userName);

    const res = await fetch(`${baseUrl}/complaints/upload`, {
      method: 'POST',
      body: form,
      headers: {
        Accept: 'application/json',
      },
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (json && typeof json.status === 'string') {
      if (json.message) {
        json.message = sanitizeBackendMessage(json.message) ?? json.message;
      }
      return json as BackendUploadResponse;
    }

    // FastAPI errors return {detail: ...}
    if (json?.detail) {
      const cleaned = sanitizeBackendMessage(String(json.detail));
      return { status: 'not_verified', message: cleaned ?? 'Unable to submit right now.' };
    }

    return { status: 'not_verified', message: 'Unable to submit right now.' };
  } catch {
    return { status: 'not_verified', message: 'Unable to reach server. Please try again.' };
  } finally {
    if (cleanup) {
      try {
        await cleanup();
      } catch {
        // ignore
      }
    }
  }
}
