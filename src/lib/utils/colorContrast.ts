/**
 * Color contrast utilities for WCAG compliance checking
 * Based on WCAG 2.1 guidelines: https://www.w3.org/TR/WCAG21/#contrast-minimum
 */

/**
 * Convert hex color to RGB array
 */
export function hexToRgb(hex: string): [number, number, number] {
  // Remove hash if present
  hex = hex.replace(/^#/, '');

  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  if (hex.length !== 6) {
    throw new Error('Invalid hex color');
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return [r, g, b];
}

/**
 * Calculate relative luminance according to WCAG 2.1
 * Formula: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function calculateLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(value => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 > L2
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const lum1 = calculateLuminance(rgb1);
  const lum2 = calculateLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG requirements
 * @param foreground Hex color for foreground/text
 * @param background Hex color for background
 * @param size 'normal' for normal text (≥4.5:1), 'large' for large text (≥3:1)
 * @param level 'AA' for WCAG AA, 'AAA' for WCAG AAA
 */
export function isWcagCompliant(
  foreground: string,
  background: string,
  size: 'normal' | 'large' = 'normal',
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const ratio = calculateContrastRatio(foreground, background);

  if (level === 'AAA') {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7;
  } else { // AA
    return size === 'large' ? ratio >= 3 : ratio >= 4.5;
  }
}

/**
 * CSS variable color values from the theme
 */
export const THEME_COLORS = {
  // Light theme
  light: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f7f6f5',
    '--bg-tertiary': '#f0f0f0',
    '--bg-hover': '#f5f5f5',
    '--bg-active': '#e8e8e8',
    '--bg-selected': '#eaf3ff',
    '--text-primary': '#1d1d1f',
    '--text-secondary': '#6e6e73',
    '--text-tertiary': '#86868b',
    '--text-quaternary': '#aeaeb2',
    '--accent-primary': '#007aff',
    '--accent-secondary': '#0051d5',
    '--accent-light': '#e5f1ff',
    '--accent-muted': '#d1e3ff',
    '--border-primary': '#e5e5e7',
    '--border-secondary': '#ebebed',
    '--border-tertiary': '#f2f2f2',
  },
  // Dark theme
  dark: {
    '--bg-primary': '#0f0f10',
    '--bg-secondary': '#1a1a1c',
    '--bg-tertiary': '#252528',
    '--bg-hover': '#2a2a2d',
    '--bg-active': '#353539',
    '--bg-selected': '#1a2d4a',
    '--text-primary': '#f8f8f8',
    '--text-secondary': '#a0a0a5',
    '--text-tertiary': '#6c6c70',
    '--text-quaternary': '#4a4a4e',
    '--accent-primary': '#1a6cff',
    '--accent-secondary': '#3a84ff',
    '--accent-light': '#1e304d',
    '--accent-muted': '#1a2840',
    '--border-primary': '#4a4a4e',
    '--border-secondary': '#404044',
    '--border-tertiary': '#353539',
  }
} as const;

/**
 * Key color combinations to check for accessibility
 */
export const COLOR_COMBINATIONS = [
  // Primary text on various backgrounds
  { foreground: '--text-primary', background: '--bg-primary' },
  { foreground: '--text-primary', background: '--bg-secondary' },
  { foreground: '--text-primary', background: '--bg-tertiary' },
  { foreground: '--text-primary', background: '--bg-hover' },
  { foreground: '--text-primary', background: '--bg-active' },
  { foreground: '--text-primary', background: '--bg-selected' },

  // Secondary text on various backgrounds
  { foreground: '--text-secondary', background: '--bg-primary' },
  { foreground: '--text-secondary', background: '--bg-secondary' },
  { foreground: '--text-secondary', background: '--bg-tertiary' },

  // Accent text on various backgrounds
  { foreground: '--accent-primary', background: '--bg-primary' },
  { foreground: '--accent-primary', background: '--bg-secondary' },

  // Text on accent backgrounds
  { foreground: '--text-primary', background: '--accent-primary' },
  { foreground: '--text-primary', background: '--accent-light' },

  // Border contrast
  { foreground: '--border-primary', background: '--bg-primary' },
  { foreground: '--border-primary', background: '--bg-secondary' },
] as const;

export interface ContrastResult {
  foreground: string;
  background: string;
  foregroundHex: string;
  backgroundHex: string;
  contrast: number;
  passesAA: boolean;
  passesAAA: boolean;
  recommendation?: string;
}

/**
 * Check all theme color combinations for WCAG compliance
 */
export function checkColorContrast(theme: 'light' | 'dark' = 'dark'): ContrastResult[] {
  const colors = THEME_COLORS[theme];
  const results: ContrastResult[] = [];

  for (const combo of COLOR_COMBINATIONS) {
    const foregroundHex = colors[combo.foreground];
    const backgroundHex = colors[combo.background];

    if (!foregroundHex || !backgroundHex) {
      console.warn(`Missing color for ${combo.foreground} or ${combo.background}`);
      continue;
    }

    const contrast = calculateContrastRatio(foregroundHex, backgroundHex);
    const passesAA = isWcagCompliant(foregroundHex, backgroundHex, 'normal', 'AA');
    const passesAAA = isWcagCompliant(foregroundHex, backgroundHex, 'normal', 'AAA');

    let recommendation: string | undefined;
    if (!passesAA) {
      recommendation = `Increase contrast to at least 4.5:1 for WCAG AA compliance`;
    } else if (!passesAAA) {
      recommendation = `Consider increasing contrast to 7:1 for WCAG AAA`;
    }

    results.push({
      foreground: combo.foreground,
      background: combo.background,
      foregroundHex,
      backgroundHex,
      contrast,
      passesAA,
      passesAAA,
      recommendation
    });
  }

  return results;
}

/**
 * Generate accessibility report for theme colors
 */
export function generateAccessibilityReport(theme: 'light' | 'dark' = 'dark'): string {
  const results = checkColorContrast(theme);
  const failingAA = results.filter(r => !r.passesAA);
  const passingAA = results.filter(r => r.passesAA);
  const passingAAA = results.filter(r => r.passesAAA);

  let report = `# WCAG Accessibility Report - ${theme === 'dark' ? 'Dark' : 'Light'} Theme\n\n`;
  report += `## Summary\n`;
  report += `- Total combinations checked: ${results.length}\n`;
  report += `- Passing WCAG AA: ${passingAA.length} (${Math.round((passingAA.length / results.length) * 100)}%)\n`;
  report += `- Passing WCAG AAA: ${passingAAA.length} (${Math.round((passingAAA.length / results.length) * 100)}%)\n`;
  report += `- Failing WCAG AA: ${failingAA.length}\n\n`;

  if (failingAA.length > 0) {
    report += `## Issues Requiring Attention\n`;
    failingAA.forEach(result => {
      report += `### ${result.foreground} on ${result.background}\n`;
      report += `- Colors: ${result.foregroundHex} on ${result.backgroundHex}\n`;
      report += `- Contrast ratio: ${result.contrast.toFixed(2)}:1 (needs ≥4.5:1)\n`;
      report += `- Recommendation: ${result.recommendation}\n\n`;
    });
  }

  // Add passing combinations for reference
  report += `## All Combinations\n`;
  results.forEach(result => {
    const status = result.passesAAA ? 'AAA' : result.passesAA ? 'AA' : 'FAIL';
    report += `- ${result.foreground} on ${result.background}: ${result.contrast.toFixed(2)}:1 (${status})\n`;
  });

  return report;
}

/**
 * Get CSS variable value from computed style
 */
export function getCssVariableValue(variable: string, element: HTMLElement = document.documentElement): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return getComputedStyle(element).getPropertyValue(variable).trim();
}

/**
 * Check contrast of actual rendered elements
 */
export function checkElementContrast(
  element: HTMLElement,
  size: 'normal' | 'large' = 'normal'
): { contrast: number; passesAA: boolean; passesAAA: boolean } {
  const style = getComputedStyle(element);
  const foreground = style.color;
  const background = style.backgroundColor;

  // Convert RGB/RGBA to hex for calculation
  // Note: This is a simplified version - in production you'd want a more robust converter
  const rgbToHex = (rgb: string): string => {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return '#000000';

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const foregroundHex = rgbToHex(foreground);
  const backgroundHex = rgbToHex(background);

  const contrast = calculateContrastRatio(foregroundHex, backgroundHex);
  const passesAA = isWcagCompliant(foregroundHex, backgroundHex, size, 'AA');
  const passesAAA = isWcagCompliant(foregroundHex, backgroundHex, size, 'AAA');

  return { contrast, passesAA, passesAAA };
}