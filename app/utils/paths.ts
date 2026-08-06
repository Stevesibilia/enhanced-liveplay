// Path helpers for project-relative assets.
//
// Projects are synced across hosts (e.g. via Nextcloud), so absolute paths
// baked into a project file break on any machine whose folder layout differs.
// Media is already stored host-relative (mediaFileName + mediaPath); these
// helpers give waveform files the same treatment: persist only the filename
// and resolve it against the CURRENT project's folderPath at runtime.

// Extract the bare filename from a waveform reference. Tolerates legacy values
// that are absolute paths (from any host, hence both separators) as well as
// already-normalized bare filenames.
export function waveformFileName(waveformPath: string): string {
  return waveformPath.split(/[\\/]/).pop() || waveformPath;
}

// Resolve a waveform reference to an absolute path under the given project
// folder, ignoring any (possibly foreign-host) directory in the stored value.
export function resolveWaveformPath(folderPath: string, waveformPath: string): string {
  return `${folderPath}/waveforms/${waveformFileName(waveformPath)}`;
}
