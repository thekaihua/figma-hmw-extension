import type { RenderIdeas } from './spec';

export const BRIDGE_PORT = 3055;
export const BRIDGE_URL = 'ws://localhost:3055';
export const PAIRING_TIMEOUT_MS = 5000;
export const PAIRING_FAILED_CLOSE_CODE = 4003;
export const REPLACED_CLOSE_CODE = 4001;
export interface PairingRequest { type: 'pair'; token: string }
export interface PairingAcknowledgment { type: 'paired' }
export type Request = { id: string; type: 'status' } |
  { id: string; type: 'render_ideas'; payload: RenderIdeas };
export interface StatusResult { connected: boolean; file: string; page: string }
export interface RenderResult {
  sectionId: string;
  ideaCount: number;
  screenCount: number;
  frames: { idea: string; cardId: string; screenIds: string[]; columnId: string }[];
}
export type Reply = { id: string; ok: true; result: StatusResult | RenderResult } |
  { id: string; ok: false; errors: string[] };
