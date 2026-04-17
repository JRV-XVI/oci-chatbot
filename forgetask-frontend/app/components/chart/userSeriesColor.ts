const USER_SERIES_COLORS = [
  "#5C2A72", // aubergine
  "#4169E1", // royal blue
  "#30C9B0", // turquoise green
  "#E5A823", // marigold
  "#8B1E2D", // deep red
];

const USER_COLOR_OVERRIDES: Record<string, string> = {
  mariofengw: "#5C2A72", // Mario -> aubergine
};

export function getUserSeriesColor(username: string): string {
  const normalizedUsername = username.trim().toLowerCase();
  const override = USER_COLOR_OVERRIDES[normalizedUsername];

  if (override) {
    return override;
  }

  let hash = 0;

  for (let index = 0; index < username.length; index += 1) {
    hash = (hash * 31 + username.charCodeAt(index)) | 0;
  }

  const normalized = Math.abs(hash);
  return USER_SERIES_COLORS[normalized % USER_SERIES_COLORS.length];
}
