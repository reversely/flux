import * as FileSystem from 'expo-file-system/legacy';

import type {
  ChapterDetail,
  ChapterSummary,
  ChatAnswer,
  FrameUploadResponse,
  SectionDetail,
  SessionResults,
  WalkSessionState,
} from './types';

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

  async chat(question: string): Promise<ChatAnswer> {
    const response = await fetch(`${this.baseUrl}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    if (!response.ok) {
      throw new Error(`chat failed: ${response.status}`);
    }
    return (await response.json()) as ChatAnswer;
  }

  async listChapters(): Promise<ChapterSummary[]> {
    return this.getJson<ChapterSummary[]>('/v1/content/chapters');
  }

  async getChapter(chapterId: string): Promise<ChapterDetail> {
    return this.getJson<ChapterDetail>(`/v1/content/chapters/${chapterId}`);
  }

  async getSection(sectionId: string): Promise<SectionDetail> {
    return this.getJson<SectionDetail>(`/v1/content/sections/${sectionId}`);
  }

  private async getJson<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`${path} failed: ${response.status}`);
    }
    return (await response.json()) as T;
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
    mimeType: string = 'image/jpeg',
  ): Promise<FrameUploadResponse> {
    const result = await FileSystem.uploadAsync(
      `${this.baseUrl}/v1/sessions/${sessionId}/frames`,
      fileUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'frame',
        mimeType,
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

  async createWalkthrough(): Promise<WalkSessionState> {
    return this.postJson<WalkSessionState>('/v1/walkthrough/sessions');
  }

  async answerWalkthrough(
    sessionId: string,
    character: string,
    state: string | null,
  ): Promise<WalkSessionState> {
    return this.postJson<WalkSessionState>(
      `/v1/walkthrough/sessions/${sessionId}/answer`,
      { character, state },
    );
  }

  async undoWalkthrough(sessionId: string): Promise<WalkSessionState> {
    return this.postJson<WalkSessionState>(`/v1/walkthrough/sessions/${sessionId}/undo`);
  }

  private async postJson<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`${path} failed: ${response.status}`);
    }
    return (await response.json()) as T;
  }
}
