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
  kind: 'camera' | 'chat' | 'reference' | 'walkthrough';
  label: string;
  prime?: string;
  subject?: string;
  question?: string;
  chapter?: number;
  /** walkthrough only: open with the camera preview (false asks by text). */
  camera?: boolean;
}

export interface ChatAnswer {
  answer_id: string;
  text: string;
  tool?: ChatTool;
  // The server still emits the pre-rework citations field; the client ignores
  // it (chapter mentions in text carry the links) until the shapes realign.
  citations?: unknown[];
}

/**
 * Content shapes for GET /v1/content, mirroring the pack schema
 * (contracts/pack-format.md tables chapter, section, block).
 */
export type BlockType =
  | 'principle'
  | 'checklist'
  | 'procedure_step'
  | 'materials'
  | 'warning'
  | 'note'
  | 'reference'
  | 'mnemonic'
  | 'military_archive';

export interface ChapterSummary {
  id: string;
  tile_id: number | null;
  fm_number: number;
  title: string;
  priority_order: number;
}

export interface SectionSummary {
  id: string;
  title: string;
  order: number;
}

export interface ChapterDetail extends ChapterSummary {
  sections: SectionSummary[];
}

export interface Block {
  id: string;
  order: number;
  type: BlockType;
  text: string;
  figure_ref: string | null;
  source: string;
  review_status: 'auto' | 'needs_review';
}

export interface SectionDetail {
  id: string;
  chapter_id: string;
  fm_heading: string | null;
  title: string;
  order: number;
  blocks: Block[];
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

export type WalkEdibility = 'edible' | 'inedible' | 'caution' | 'danger' | 'unknown';

export interface WalkSpeciesCard {
  species: string;
  edibility: WalkEdibility;
  edibility_raw: string;
  source_title: string;
  source_revid: string;
}

export interface WalkQuestion {
  character: string;
  ask_order: number;
  question: string;
  citation: string;
  states: string[];
}

export interface WalkAnswer {
  character: string;
  state: string | null;
}

export interface WalkSessionState {
  session_id: string;
  answers: WalkAnswer[];
  candidate_count: number;
  danger_count: number;
  danger_species?: WalkSpeciesCard[];
  candidates?: WalkSpeciesCard[];
  complete: boolean;
  question?: WalkQuestion;
}
