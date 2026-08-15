/**
 * TS mirror of the server contract (server/src/flux_server/models.py).
 * RecordStub stands in for the per-item result the next concept defines;
 * field names stay snake_case to match the wire format exactly.
 */

export interface RecordStub {
  record_id: string;
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
