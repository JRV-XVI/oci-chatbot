const USER_SERIES_COLORS = [
  "#5C2A72",
  "#0084ff",  
  "#30C9B0", 
  "#E5A823", 
  "#c20000",
  "#4169E1",
  "#ffffff", 
  "#d400ff"
];

/**
 * Get color by index in the palette.
 * Each user is assigned a color in order, cycling through the palette if needed.
 * This ensures no color collisions for multiple users.
 * @param index The index of the user in the sorted list
 * @returns The hex color code for this index
 */
export function getUserSeriesColorByIndex(index: number): string {
  return USER_SERIES_COLORS[index % USER_SERIES_COLORS.length];
}
