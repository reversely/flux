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
 * until the server grows it). Chapter mentions in the text ("chapter 7")
 * become hyperlinks into the full-text reference on the client, and tool
 * names a widget the answer can launch preloaded (see data/guide.ts).
 */
export interface ChatTool {
  kind: 'camera' | 'chat' | 'reference';
  label: string;
  prime?: string;
  subject?: string;
  question?: string;
  chapter?: number;
}

export interface ChatAnswer {
  answer_id: string;
  text: string;
  tool?: ChatTool;
  // The server still emits the pre-rework citations field; the client ignores
  // it (chapter mentions in text carry the links) until the shapes realign.
  citations?: unknown[];
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
