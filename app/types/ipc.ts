// IPC payload types — shared between global.d.ts and consumer code

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
