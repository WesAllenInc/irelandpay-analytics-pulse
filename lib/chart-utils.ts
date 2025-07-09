/**
 * Utility functions for chart components
 * These functions help implement a styling approach that avoids inline styles
 * while still supporting dynamic colors through data attributes
 */

/**
 * Maps a color value to a standardized color name for data-chart-color attribute
 * @param color The color value to map
 * @returns The standardized color name or undefined if no match
 */
export function mapColorToName(color: string | undefined): string | undefined {
  if (!color) return undefined;
  
  // Convert to lowercase for comparison
  const lowerColor = color.toLowerCase();
  
  // Check for common color names and hex values
  switch (lowerColor) {
    case "#3b82f6":
    case "blue":
    case "rgb(59, 130, 246)":
      return "blue";
      
    case "#ef4444":
    case "red":
    case "rgb(239, 68, 68)":
      return "red";
      
    case "#22c55e":
    case "green":
    case "rgb(34, 197, 94)":
      return "green";
      
    case "#eab308":
    case "yellow":
    case "rgb(234, 179, 8)":
      return "yellow";
      
    case "#a855f7":
    case "purple":
    case "rgb(168, 85, 247)":
      return "purple";
      
    case "#ec4899":
    case "pink":
    case "rgb(236, 72, 153)":
      return "pink";
      
    case "#6366f1":
    case "indigo":
    case "rgb(99, 102, 241)":
      return "indigo";
      
    case "#6b7280":
    case "gray":
    case "rgb(107, 114, 128)":
      return "gray";
      
    case "#f97316":
    case "orange":
    case "rgb(249, 115, 22)":
      return "orange";
    
    // Add more color mappings as needed
      
    default:
      // No standard mapping found
      return undefined;
  }
}

/**
 * Creates dataset attributes for applying chart colors
 * This avoids the need for inline styles by using data attributes
 * @param color The color to set
 * @returns Data attributes object for the element
 */
export function getChartColorAttributes(color: string | undefined): Record<string, string> {
  if (!color) return {};
  
  const colorName = mapColorToName(color);
  
  if (colorName) {
    // Use the standard color name
    return { "data-chart-color": colorName };
  }
  
  // For custom colors, use a special data attribute that's pre-defined in CSS
  // This approach works with the CSS defined in chart-colors.css
  return { "data-chart-color-hex": color };
}
