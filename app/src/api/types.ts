/**
 * TS mirror of the server contract (PRD section 8; server/src/flux_server/models.py).
 * Field names stay snake_case to match the wire format exactly.
 */

export type Classification =
  | 'acceptable'
  | 'insufficient_solder'
  | 'excessive_solder'
  | 'solder_bridge'
  | 'shifted_joint'
  | 'unable_to_assess';

export type Severity = 'critical' | 'review' | 'ok';

/** Sort order for severity, worst first; mirrors SEVERITY_ORDER in models.py. */
export const severityOrder: Record<Severity, number> = { critical: 0, review: 1, ok: 2 };

export interface JointRecord {
  joint_id: string;
  bounding_box: [number, number, number, number];
  classification: Classification;
  confidence: number;
  severity: Severity;
  supporting_frames: string[];
  capture_quality: string;
}

export interface SessionResults {
  session_id: string;
  status: 'in_progress' | 'complete';
  joints: JointRecord[];
}

export interface FrameUploadResponse {
  frame_id: string;
  results: JointRecord[];
}
