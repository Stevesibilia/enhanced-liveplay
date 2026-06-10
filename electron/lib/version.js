// Compare two semver-ish version strings ("1.6.0", "1.6").
// Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal. Missing segments count as 0.
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

module.exports = { compareVersions };
