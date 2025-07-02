/**
 * Utility functions for checking color contrast in development
 * Based on WCAG 2.0 contrast guidelines
 */

/**
 * Calculate the relative luminance of an RGB color
 * Formula from WCAG 2.0: https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
function getLuminance(r: number, g: number, b: number): number {
  // Convert RGB to sRGB
  const sR = r / 255;
  const sG = g / 255;
  const sB = b / 255;

  // Calculate luminance components
  const R = sR <= 0.03928 ? sR / 12.92 : Math.pow((sR + 0.055) / 1.055, 2.4);
  const G = sG <= 0.03928 ? sG / 12.92 : Math.pow((sG + 0.055) / 1.055, 2.4);
  const B = sB <= 0.03928 ? sB / 12.92 : Math.pow((sB + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Convert a hex color to RGB values
 */
function hexToRgb(hex: string): { r: number, g: number, b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex to RGB
  if (hex.length === 3) {
    // Convert shorthand (e.g. #ABC) to full form (e.g. #AABBCC)
    hex = hex.split('').map(c => c + c).join('');
  }
  
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate contrast ratio between two colors
 * Returns a value between 1 (no contrast) and 21 (max contrast)
 */
export function getContrastRatio(foregroundColor: string, backgroundColor: string): number {
  const foreground = hexToRgb(foregroundColor);
  const background = hexToRgb(backgroundColor);
  
  if (!foreground || !background) {
    console.error('Invalid color format. Expected hex color (e.g., #FFFFFF)');
    return 0;
  }
  
  const foregroundLuminance = getLuminance(foreground.r, foreground.g, foreground.b);
  const backgroundLuminance = getLuminance(background.r, background.g, background.b);
  
  // Calculate contrast ratio
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a contrast ratio meets WCAG standards
 */
export function meetsContrastStandards(
  contrastRatio: number, 
  level: 'AA' | 'AAA' = 'AA', 
  isLargeText: boolean = false
): boolean {
  if (level === 'AA') {
    return isLargeText ? contrastRatio >= 3 : contrastRatio >= 4.5;
  } else {
    return isLargeText ? contrastRatio >= 4.5 : contrastRatio >= 7;
  }
}

/**
 * Get a human-readable assessment of a contrast ratio
 */
export function getContrastAssessment(contrastRatio: number): string {
  if (contrastRatio >= 7) {
    return 'Excellent - Passes WCAG AAA';
  } else if (contrastRatio >= 4.5) {
    return 'Good - Passes WCAG AA and AAA for large text';
  } else if (contrastRatio >= 3) {
    return 'Fair - Passes WCAG AA for large text only';
  } else {
    return 'Poor - Fails WCAG requirements';
  }
}

/**
 * Log contrast information about UI elements to console (for development use)
 */
export function checkElementContrast(elementSelector: string): void {
  if (typeof document === 'undefined') {
    console.warn('checkElementContrast can only be used in browser environment');
    return;
  }

  const element = document.querySelector(elementSelector);
  if (!element) {
    console.warn(`Element not found: ${elementSelector}`);
    return;
  }

  const style = window.getComputedStyle(element);
  const foregroundColor = style.color;
  const backgroundColor = style.backgroundColor;

  console.group(`Contrast check for ${elementSelector}`);
  console.log('Text color:', foregroundColor);
  console.log('Background color:', backgroundColor);
  
  // Convert RGB(A) to hex for our checker
  const rgbToHex = (rgb: string) => {
    // Extract RGB values
    const rgbValues = rgb.match(/\d+/g);
    if (!rgbValues || rgbValues.length < 3) return '#FFFFFF';
    
    return '#' + rgbValues.slice(0, 3).map(x => {
      const hex = parseInt(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const foregroundHex = rgbToHex(foregroundColor);
  const backgroundHex = rgbToHex(backgroundColor);
  
  const ratio = getContrastRatio(foregroundHex, backgroundHex);
  console.log('Contrast ratio:', ratio.toFixed(2));
  console.log('Assessment:', getContrastAssessment(ratio));
  console.groupEnd();
}
