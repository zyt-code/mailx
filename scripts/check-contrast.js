#!/usr/bin/env node

/**
 * Simple contrast checker for dark mode colors
 */

// Dark theme colors from app.css
const DARK_COLORS = {
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
};

// Key combinations to check
const COMBINATIONS = [
  { foreground: '--text-primary', background: '--bg-primary' },
  { foreground: '--text-primary', background: '--bg-secondary' },
  { foreground: '--text-primary', background: '--bg-tertiary' },
  { foreground: '--text-primary', background: '--bg-hover' },
  { foreground: '--text-primary', background: '--bg-active' },
  { foreground: '--text-primary', background: '--bg-selected' },
  { foreground: '--text-primary', background: '--accent-primary' },
  { foreground: '--text-primary', background: '--accent-light' },
  { foreground: '--text-secondary', background: '--bg-primary' },
  { foreground: '--text-secondary', background: '--bg-secondary' },
  { foreground: '--text-secondary', background: '--bg-tertiary' },
  { foreground: '--accent-primary', background: '--bg-primary' },
  { foreground: '--accent-primary', background: '--bg-secondary' },
  { foreground: '--border-primary', background: '--bg-primary' },
  { foreground: '--border-primary', background: '--bg-secondary' },
];

/**
 * Convert hex to RGB
 */
function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return [r, g, b];
}

/**
 * Calculate relative luminance
 */
function calculateLuminance(rgb) {
  const [r, g, b] = rgb.map(value => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio
 */
function calculateContrastRatio(color1, color2) {
  const lum1 = calculateLuminance(hexToRgb(color1));
  const lum2 = calculateLuminance(hexToRgb(color2));
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check WCAG compliance
 */
function isWcagCompliant(foreground, background, size = 'normal') {
  const ratio = calculateContrastRatio(foreground, background);
  return size === 'large' ? ratio >= 3 : ratio >= 4.5;
}

console.log('🔍 WCAG AA Contrast Audit - Dark Mode\n');
console.log('='.repeat(60));

const results = [];
let passing = 0;
let failing = 0;

COMBINATIONS.forEach(combo => {
  const fg = DARK_COLORS[combo.foreground];
  const bg = DARK_COLORS[combo.background];
  const ratio = calculateContrastRatio(fg, bg);
  const passesAA = isWcagCompliant(fg, bg, 'normal');

  results.push({ ...combo, fg, bg, ratio, passesAA });

  if (passesAA) passing++;
  else failing++;
});

console.log(`📊 Summary: ${passing} passing, ${failing} failing\n`);

// Show failing combinations first
const failingResults = results.filter(r => !r.passesAA);
const passingResults = results.filter(r => r.passesAA);

if (failingResults.length > 0) {
  console.log('❌ FAILING WCAG AA (needs ≥4.5:1):\n');
  failingResults.forEach(result => {
    const status = result.passesAA ? '✅' : '❌';
    console.log(`${status} ${result.foreground} on ${result.background}`);
    console.log(`   ${result.fg} on ${result.bg}`);
    console.log(`   Contrast: ${result.ratio.toFixed(2)}:1\n`);
  });
}

console.log('✅ PASSING WCAG AA:\n');
passingResults.forEach(result => {
  const status = result.passesAA ? '✅' : '❌';
  console.log(`${status} ${result.foreground} on ${result.background}`);
  console.log(`   ${result.fg} on ${result.bg}`);
  console.log(`   Contrast: ${result.ratio.toFixed(2)}:1\n`);
});

// Generate CSS fixes
console.log('💡 RECOMMENDED CSS FIXES:\n');

failingResults.forEach(result => {
  console.log(`/* Fix: ${result.foreground} on ${result.background} */`);
  console.log(`/* Current: ${result.ratio.toFixed(2)}:1 (needs ≥4.5:1) */`);

  if (result.foreground === '--text-primary' && result.background === '--accent-primary') {
    console.log(`${result.background}: #2a7cff; /* Darker blue for better text contrast */`);
  } else if (result.foreground.includes('border')) {
    console.log(`${result.foreground}: #3e3e42; /* Lighter border for visibility */`);
  }
  console.log('');
});

console.log('='.repeat(60));
console.log('\n🎯 Critical issues to fix:');
failingResults.forEach((result, i) => {
  console.log(`${i + 1}. ${result.foreground} on ${result.background} (${result.ratio.toFixed(2)}:1)`);
});