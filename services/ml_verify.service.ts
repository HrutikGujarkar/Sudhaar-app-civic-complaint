import * as FileSystem from 'expo-file-system';

export type MlVerifyResponse =
  | {
      status: 'verified';
      classification: 'genuine';
      confidence: number;
    }
  | {
      status: 'rejected' | 'not_verified';
      message: string;
      classification: 'fake' | 'uncertain' | string;
      confidence: number;
    };

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
  // Some camera URIs don't have an extension; backend will still infer from name.
  return last.includes('.') ? last : `${last}.jpg`;
}

async function prepareUriForMultipart(uri: string): Promise<{ uri: string; cleanup?: () => Promise<void> }> {
  if (!uri.startsWith('content://')) return { uri };

  const extMatch = uri.match(/\.(jpg|jpeg|png|webp)(\?.*)?$/i);
  const ext = extMatch?.[1] ? `.${extMatch[1]}` : '.jpg';
  const baseDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory;
  if (!baseDir) return { uri };
  const tempUri = `${baseDir}verify-${Date.now()}${ext}`;

  await FileSystem.copyAsync({ from: uri, to: tempUri });
  return {
    uri: tempUri,
    cleanup: async () => {
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
    },
  };
}

export async function verifyComplaintImage(imageUri: string): Promise<MlVerifyResponse> {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return {
      status: 'not_verified',
      message:
        'Verification server is not configured. Set EXPO_PUBLIC_BACKEND_URL (e.g. http://192.168.1.10:8000) and restart the app.',
      classification: 'uncertain',
      confidence: 0,
    };
  }

  const { uri: uploadUri, cleanup } = await prepareUriForMultipart(imageUri);

  try {
    const form = new FormData();
    form.append('file', {
      uri: uploadUri,
      name: guessFilenameFromUri(uploadUri),
      type: guessMimeTypeFromUri(uploadUri),
    } as any);

    const res = await fetch(`${baseUrl}/complaints/verify`, {
      method: 'POST',
      body: form,
      headers: {
        // Let fetch set the correct multipart boundary automatically.
        Accept: 'application/json',
      },
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // ignore parse errors
    }

    if (res.ok && json?.status === 'verified') {
      return json as MlVerifyResponse;
    }

    if (json && (json.status === 'rejected' || json.status === 'not_verified')) {
      return json as MlVerifyResponse;
    }

    // Fallback
    return {
      status: 'not_verified',
      message: json?.detail || 'Unable to verify image. Please try again.',
      classification: json?.classification || 'uncertain',
      confidence: typeof json?.confidence === 'number' ? json.confidence : 0,
    };
  } catch {
    return {
      status: 'not_verified',
      message: 'Unable to reach the verification server. Please check your internet connection and try again.',
      classification: 'uncertain',
      confidence: 0,
    };
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
