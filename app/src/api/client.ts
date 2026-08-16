import * as FileSystem from 'expo-file-system/legacy';

import { detailOf, traced } from '@/store/traces';

import type {
  ChapterDetail,
  ChapterSummary,
  ChatAnswer,
  CoachClipResult,
  CoachSessionState,
  FrameUploadResponse,
  SectionDetail,
  SessionResults,
  WalkSessionState,
  WalkSpeciesDetail,
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
    return this.postJson<ChatAnswer>('/v1/chat', { question });
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
    return traced('GET', path, '', async () => {
      const response = await fetch(`${this.baseUrl}${path}`);
      if (!response.ok) {
        throw new Error(`${path} failed: ${response.status}`);
      }
      return (await response.json()) as T;
    });
  }

  async createSession(): Promise<string> {
    const body = await this.postJson<{ session_id: string }>('/v1/sessions');
    return body.session_id;
  }

  async getResults(sessionId: string): Promise<SessionResults> {
    return this.getJson<SessionResults>(`/v1/sessions/${sessionId}/results`);
  }

  // RN 0.86's fetch rejects the legacy {uri,name,type} FormData part, so the
  // multipart upload goes through expo-file-system's native uploader instead.
  async uploadFrame(
    sessionId: string,
    fileUri: string,
    capturedAt: string,
    mimeType: string = 'image/jpeg',
  ): Promise<FrameUploadResponse> {
    return traced('POST', `/v1/sessions/${sessionId}/frames`, `frame ${mimeType}`, async () => {
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
    });
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
    states: string[],
  ): Promise<WalkSessionState> {
    return this.postJson<WalkSessionState>(
      `/v1/walkthrough/sessions/${sessionId}/answer`,
      { character, states },
    );
  }

  async walkthroughSpecies(): Promise<WalkSpeciesDetail[]> {
    return this.getJson<WalkSpeciesDetail[]>('/v1/walkthrough/species');
  }

  async undoWalkthrough(sessionId: string): Promise<WalkSessionState> {
    return this.postJson<WalkSessionState>(`/v1/walkthrough/sessions/${sessionId}/undo`);
  }

  async createCoachSession(knot: string): Promise<CoachSessionState> {
    return this.postJson<CoachSessionState>('/v1/coach/sessions', { knot });
  }

  async coachClip(
    sessionId: string,
    fileUri: string,
    mimeType: string = 'video/quicktime',
  ): Promise<CoachClipResult> {
    return traced('POST', `/v1/coach/sessions/${sessionId}/clip`, `clip ${mimeType}`, async () => {
      const result = await FileSystem.uploadAsync(
        `${this.baseUrl}/v1/coach/sessions/${sessionId}/clip`,
        fileUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'video',
          mimeType,
        },
      );
      if (result.status !== 200) {
        throw new Error(`coach clip failed: ${result.status}`);
      }
      return JSON.parse(result.body) as CoachClipResult;
    });
  }

  private async postJson<T>(path: string, body?: unknown): Promise<T> {
    return traced('POST', path, body === undefined ? '' : detailOf(body).slice(0, 200), async () => {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(`${path} failed: ${response.status}`);
      }
      return (await response.json()) as T;
    });
  }
}
