/**
 * Accessibility utilities for Ireland Pay Analytics
 * Contains functions and constants to help maintain accessibility standards
 */
import React from 'react';

/**
 * Color contrast ratios required by WCAG guidelines:
 * - WCAG AA: 4.5:1 for normal text, 3:1 for large text
 * - WCAG AAA: 7:1 for normal text, 4.5:1 for large text
 * 
 * This object provides safe color combinations that meet WCAG AA or AAA standards
 */
export const accessibleColors = {
  // Theme colors with proper contrast ratios
  text: {
    // High contrast text colors on different backgrounds
    onDark: {
      primary: 'text-white', // White on dark backgrounds
      secondary: 'text-gray-200', // Light gray for secondary text on dark backgrounds
      muted: 'text-gray-300', // For muted/helper text on dark backgrounds
      disabled: 'text-gray-400', // For disabled text that still meets AA
    },
    onLight: {
      primary: 'text-gray-900', // Very dark gray/almost black on light backgrounds
      secondary: 'text-gray-700', // Dark gray for secondary text on light backgrounds
      muted: 'text-gray-600', // For muted/helper text on light backgrounds
      disabled: 'text-gray-500', // For disabled text that still meets AA
    },
  },
  backgrounds: {
    // Background colors that provide sufficient contrast with text
    dark: {
      primary: 'bg-gray-900', // Very dark gray/almost black
      secondary: 'bg-gray-800', // Dark gray
      accent: 'bg-blue-700', // Dark blue that works with white text
    },
    light: {
      primary: 'bg-white', // White
      secondary: 'bg-gray-100', // Very light gray
      accent: 'bg-blue-600', // Blue that works with white text
    },
  },
  borders: {
    // Border colors with sufficient contrast
    onDark: 'border-gray-600',
    onLight: 'border-gray-300',
    focus: 'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2', // Focus ring with good contrast
  },
};

/**
 * Ensures icons have proper text alternatives for screen readers
 * Use this when an icon needs a descriptive text but visually shows only the icon
 * 
 * @example
 * <Button>
 *   <Icon />
 *   {accessibleText('Download report')}
 * </Button>
 */
export const accessibleText = (text: string): JSX.Element => {
  return React.createElement('span', { className: 'sr-only' }, text);
};

/**
 * Returns a set of standard focus styles to apply for keyboard navigation
 * Can be used with the Tailwind CSS classes
 * 
 * @example
 * <button className={`btn ${getFocusStyles()}`}>Click me</button>
 */
export const getFocusStyles = (variant: 'default' | 'inset' | 'subtle' = 'default'): string => {
  switch (variant) {
    case 'inset':
      return 'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary';
    case 'subtle':
      return 'focus:outline-none focus-visible:ring-1 focus-visible:ring-primary';
    case 'default':
    default:
      return 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';
  }
};

/**
 * A utility to generate aria-label text for common UI elements
 */
export const ariaLabels = {
  /**
   * Generate an aria-label for a sort button
   */
  sortButton: (columnName: string, direction?: 'asc' | 'desc' | null): string => {
    if (!direction) {
      return `Sort ${columnName}`;
    }
    return `Sort ${columnName} ${direction === 'asc' ? 'descending' : 'ascending'} (currently sorted ${direction === 'asc' ? 'ascending' : 'descending'})`;
  },

  /**
   * Generate an aria-label for pagination controls
   */
  pagination: {
    next: 'Go to next page',
    previous: 'Go to previous page',
    page: (pageNumber: number) => `Go to page ${pageNumber}`,
  },

  /**
   * Generate an aria-label for common actions
   */
  actions: {
    edit: (itemName: string) => `Edit ${itemName}`,
    delete: (itemName: string) => `Delete ${itemName}`,
    view: (itemName: string) => `View ${itemName}`,
    add: (itemType: string) => `Add ${itemType}`,
    close: 'Close',
    menu: 'Actions menu',
    search: (context?: string) => context ? `Search ${context}` : 'Search',
  }
};
