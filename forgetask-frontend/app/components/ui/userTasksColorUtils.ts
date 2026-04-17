/**
 * Utility functions for user task completion colors
 */

/**
 * Determines the circle color based on completion percentage
 * @param percentage - Completion percentage (0-100) * @returns Hex color code
 */
export function getTaskCompletionColor(percentage: number): string {
  if (percentage >= 80) {
    return "var(--kpi-chart-1)" // high completion
  } else if (percentage >= 50) {
    return "var(--kpi-chart-3)" // medium completion
  } else {
    return "var(--kpi-chart-6)" // low completion
  }
}
