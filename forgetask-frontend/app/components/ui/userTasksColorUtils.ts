/**
 * Utility functions for user task completion colors
 */

/**
 * Determines the circle color based on completion percentage
 * @param percentage - Completion percentage (0-100) * @returns Hex color code
 */
export function getTaskCompletionColor(percentage: number): string {
  if (percentage >= 80) {
    return "#e76b36" // primary accent for high completion
  } else if (percentage >= 50) {
    return "#f19367" // soft accent for medium completion
  } else {
    return "#6e7d91" // neutral slate for low completion
  }
}
