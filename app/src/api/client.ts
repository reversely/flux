import * as FileSystem from 'expo-file-system/legacy';

import { detailOf, traced } from '@/store/traces';

import type {
  ChapterDetail,
  ChapterSummary,
  ChatAnswer,
  CoachClipResult,
  CoachSessionState,
  Figure,
  FrameUploadResponse,
  NarrationCreated,
  SectionDetail,
  SessionResults,
  SkyOutlook,
  TranscriptionResult,
  WalkGuideCard,
  WalkObservation,
  WalkSessionState,
  WalkSurveyResult,
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

  async getFigure(figureId: string): Promise<Figure> {
    return this.getJson<Figure>(`/v1/content/figures/${figureId}`);
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

  async createWalkthrough(guideId?: string): Promise<WalkSessionState> {
    return this.postJson<WalkSessionState>(
      '/v1/walkthrough/sessions',
      guideId ? { guide_id: guideId } : undefined,
    );
  }

  async walkthroughGuides(): Promise<WalkGuideCard[]> {
    return this.getJson<WalkGuideCard[]>('/v1/walkthrough/guides');
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

  async walkthroughSpecies(guideId?: string): Promise<WalkSpeciesDetail[]> {
    const query = guideId ? `?guide_id=${encodeURIComponent(guideId)}` : '';
    return this.getJson<WalkSpeciesDetail[]>(`/v1/walkthrough/species${query}`);
  }

  speciesImageUrl(species: string): string {
    return `${this.baseUrl}/v1/walkthrough/images/${encodeURIComponent(species)}`;
  }

  async undoWalkthrough(sessionId: string): Promise<WalkSessionState> {
    return this.postJson<WalkSessionState>(`/v1/walkthrough/sessions/${sessionId}/undo`);
  }

  // Narration is content-addressed on the server: the same node question
  // returns the same id without a second synthesis, so this is cheap to
  // call on every node.
  async createNarration(text: string): Promise<NarrationCreated> {
    return this.postJson<NarrationCreated>('/v1/speech/narrations', { text });
  }

  narrationUrl(audioPath: string): string {
    return `${this.baseUrl}${audioPath}`;
  }

  // The box ASR decodes any ffmpeg-readable container, so a recorded clip
  // posts as-is and its narration comes back as text.
  async transcribeClip(
    fileUri: string,
    mimeType: string = 'video/quicktime',
  ): Promise<TranscriptionResult> {
    return traced('POST', '/v1/speech/transcriptions', `clip ${mimeType}`, async () => {
      const result = await FileSystem.uploadAsync(
        `${this.baseUrl}/v1/speech/transcriptions`,
        fileUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'audio',
          mimeType,
        },
      );
      if (result.status !== 200) {
        throw new Error(`transcription failed: ${result.status}`);
      }
      return JSON.parse(result.body) as TranscriptionResult;
    });
  }

  async finishSession(sessionId: string): Promise<{ session_id: string; status: string }> {
    return this.postJson(`/v1/sessions/${sessionId}/finish`);
  }

  async askTrail(sessionId: string, question: string): Promise<{ answer: string }> {
    return this.postJson(`/v1/sessions/${sessionId}/ask`, { question });
  }

  async interpretWalkthrough(sessionId: string, text: string): Promise<WalkObservation> {
    return this.postJson<WalkObservation>(
      `/v1/walkthrough/sessions/${sessionId}/interpret`,
      { question: text },
    );
  }

  async readSky(fileUri: string, month: number): Promise<SkyOutlook> {
    const result = await FileSystem.uploadAsync(`${this.baseUrl}/v1/weather/read`, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'video',
      mimeType: 'video/quicktime',
      parameters: { month: String(month) },
    });
    if (result.status !== 200) {
      throw new Error(`sky read failed: ${result.status}`);
    }
    return JSON.parse(result.body) as SkyOutlook;
  }

  async observeWalkthrough(
    sessionId: string,
    character: string,
    fileUri: string,
  ): Promise<WalkObservation> {
    const result = await FileSystem.uploadAsync(
      `${this.baseUrl}/v1/walkthrough/sessions/${sessionId}/observe`,
      fileUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'video',
        mimeType: 'video/quicktime',
        parameters: { character },
      },
    );
    if (result.status !== 200) {
      throw new Error(`observe failed: ${result.status}`);
    }
    return JSON.parse(result.body) as WalkObservation;
  }

  async surveyWalkthrough(sessionId: string, fileUri: string): Promise<WalkSurveyResult> {
    const result = await FileSystem.uploadAsync(
      `${this.baseUrl}/v1/walkthrough/sessions/${sessionId}/survey`,
      fileUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'video',
        mimeType: 'video/quicktime',
      },
    );
    if (result.status !== 200) {
      throw new Error(`survey failed: ${result.status}`);
    }
    return JSON.parse(result.body) as WalkSurveyResult;
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
