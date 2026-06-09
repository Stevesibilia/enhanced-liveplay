// IPC payload types — shared between global.d.ts and consumer code

import type { VisualMediaItem } from './project';

/** Minimal type for IPC event parameter (avoids importing Electron types in renderer) */
export type IpcEvent = { sender: unknown; ports: readonly unknown[] };

/** Payload for trigger-item IPC message */
export type TriggerItemPayload =
  | { type: 'uuid'; value: string }
  | { type: 'index'; value: number[] };

/** Payload for stop-item IPC message */
export type StopItemPayload = { type: 'uuid'; value: string };

/** Update info from electron-updater */
export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

// MIDI binding: identifies a specific control on a MIDI device
export interface MidiBinding {
  channel: number;   // 0-15
  type: 'note' | 'cc' | 'pitchbend';
  number: number;    // note number, CC number (0-127), or 0 for pitchbend
}

// Available action IDs
export type MidiActionId =
  | 'trigger-slot-0' | 'trigger-slot-1' | 'trigger-slot-2' | 'trigger-slot-3'
  | 'trigger-slot-4' | 'trigger-slot-5' | 'trigger-slot-6' | 'trigger-slot-7'
  | 'trigger-slot-8' | 'trigger-slot-9' | 'trigger-slot-10' | 'trigger-slot-11'
  | 'trigger-slot-12' | 'trigger-slot-13' | 'trigger-slot-14' | 'trigger-slot-15'
  | 'pause-resume' | 'toggle-loop' | 'stop-all' | 'master-volume';

// Config stored in midi-config.json
export interface MidiConfig {
  bindings: Record<string, MidiBinding>; // actionId → binding
}

// Player window display state — legacy single-item shape, retained for the
// player.html message handler that still understands { type: 'black' } as a
// black-screen signal. The active multi-layer protocol uses PlayerDisplayState.
export interface DisplayState {
  type: 'black' | 'image' | 'pdf';
  mediaPath?: string;
  pdfPage?: number;
}

// Multi-layer composition types

// A layer in the GM composition workspace (includes drafts).
// PDF support is deferred — layers are images only for now.
// Coordinates are percentages relative to the fixed 16:9 composition canvas
// (not the variable-aspect panel), so they map to the same relative rectangle
// in the player window's 16:9 content area.
export interface DisplayLayer {
  id: string;              // unique layer id (uuid)
  mediaItem: VisualMediaItem;
  x: number;               // 0-100, % of the 16:9 canvas width (top-left)
  y: number;               // 0-100, % of the 16:9 canvas height (top-left)
  width: number;           // 0-100, % of the 16:9 canvas width
  height: number;          // 0-100, % of the 16:9 canvas height
  zIndex: number;
  published: boolean;
}

// A layer in the player-bound payload (only published ones, absolute paths).
// x/y/width/height are percentages relative to the fixed 16:9 canvas.
export interface PublishedLayer {
  id: string;
  type: 'image';
  mediaPath: string;       // absolute filesystem path
  x: number;               // 0-100, % of the 16:9 canvas
  y: number;               // 0-100, % of the 16:9 canvas
  width: number;           // 0-100, % of the 16:9 canvas
  height: number;          // 0-100, % of the 16:9 canvas
  zIndex: number;
  fadeIn?: number;   // seconds; applied when this layer is newly added
  fadeOut?: number;  // seconds; applied when this layer is removed
}

// Full state pushed to the player window on every change
export interface PlayerDisplayState {
  layers: PublishedLayer[]; // sorted by zIndex ascending; empty = black
}
