/**
 * Utility functions for user task completion colors
 */

/**
 * Determines the circle color based on completion percentage
 * @param percentage - Completion percentage (0-100) * @returns Hex color code
 */
export function getTaskCompletionColor(percentage: number): string {
  if (percentage >= 80) {
    return "#10b981" // emerald for high completion
  } else if (percentage >= 50) {
    return "#f59e0b" // amber for medium completion
  } else {
    return "#ef4444" // red for low completion
  }
}
