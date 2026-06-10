const path = require('path');

// Guard: resolve a path and verify it lives inside the active project folder.
// Returns the resolved path on success, or null if outside the project.
// If no project is open yet, allows access (user is selecting files via native dialogs).
function pathIsInProjectFolder(requestedPath, projectPath) {
  if (!projectPath) return path.resolve(requestedPath);
  const projectFolder = path.dirname(projectPath);
  const resolved = path.resolve(requestedPath);
  // Ensure the resolved path starts with the project folder (+ separator to avoid prefix tricks)
  if (resolved === projectFolder || resolved.startsWith(projectFolder + path.sep)) {
    return resolved;
  }
  return null;
}

module.exports = { pathIsInProjectFolder };
