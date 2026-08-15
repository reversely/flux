import * as FileSystem from 'expo-file-system/legacy';

import type { FrameUploadResponse, SessionResults } from './types';

const HEALTH_TIMEOUT_MS = 4000;

export class ApiClient {
  readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /** True when /healthz answers within the timeout. */
  async health(): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.baseUrl}/healthz`, { signal: controller.signal });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  async createSession(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/v1/sessions`, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`create session failed: ${response.status}`);
    }
    const body = (await response.json()) as { session_id: string };
    return body.session_id;
  }

  async getResults(sessionId: string): Promise<SessionResults> {
    const response = await fetch(`${this.baseUrl}/v1/sessions/${sessionId}/results`);
    if (!response.ok) {
      throw new Error(`results failed: ${response.status}`);
    }
    return (await response.json()) as SessionResults;
  }

  // RN 0.86's fetch rejects the legacy {uri,name,type} FormData part, so the
  // multipart upload goes through expo-file-system's native uploader instead.
  async uploadFrame(
    sessionId: string,
    fileUri: string,
    capturedAt: string,
  ): Promise<FrameUploadResponse> {
    const result = await FileSystem.uploadAsync(
      `${this.baseUrl}/v1/sessions/${sessionId}/frames`,
      fileUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'frame',
        mimeType: 'image/jpeg',
        parameters: { captured_at: capturedAt },
      },
    );
    if (result.status !== 200) {
      throw new Error(`upload failed: ${result.status}`);
    }
    return JSON.parse(result.body) as FrameUploadResponse;
  }

  frameUrl(sessionId: string, frameId: string): string {
    return `${this.baseUrl}/v1/sessions/${sessionId}/frames/${frameId}`;
  }
}
