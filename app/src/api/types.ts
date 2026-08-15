/**
 * TS mirror of the server contract (server/src/flux_server/models.py).
 * RecordStub stands in for the per-item result the next concept defines;
 * field names stay snake_case to match the wire format exactly.
 */

export interface RecordStub {
  record_id: string;
}

/**
 * Chat shapes for the future POST /v1/chat endpoint (mocked in api/chat.ts
 * until the server grows it). A citation names the FM anchor a sentence came
 * from; the chip deep-links into the encyclopedia once the reader exists.
 */
export interface Citation {
  anchor: string;
  chapter_number: number;
  chapter_title: string;
  section_title: string;
  tile_id: number;
}

export interface ChatAnswer {
  answer_id: string;
  text: string;
  citations: Citation[];
}

export interface SessionResults {
  session_id: string;
  status: 'in_progress' | 'complete';
  records: RecordStub[];
}

export interface FrameUploadResponse {
  frame_id: string;
  results: RecordStub[];
}
