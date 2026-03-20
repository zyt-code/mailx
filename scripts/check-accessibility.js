#!/usr/bin/env node

/**
 * Accessibility checker for Mailx dark mode
 * Runs WCAG contrast checks and generates fix recommendations
 */

import { checkColorContrast, generateAccessibilityReport } from '../src/lib/utils/colorContrast.js';

console.log('🔍 Running WCAG AA accessibility audit for dark mode...\n');

const results = checkColorContrast('dark');
const failingAA = results.filter(r => !r.passesAA);
const passingAA = results.filter(r => r.passesAA);

console.log(`📊 Summary:`);
console.log(`  Total combinations checked: ${results.length}`);
console.log(`  Passing WCAG AA: ${passingAA.length} (${Math.round((passingAA.length / results.length) * 100)}%)`);
console.log(`  Failing WCAG AA: ${failingAA.length}\n`);

if (failingAA.length > 0) {
  console.log('❌ Issues requiring attention:\n');

  failingAA.forEach((result, index) => {
    console.log(`${index + 1}. ${result.foreground} on ${result.background}`);
    console.log(`   Colors: ${result.foregroundHex} on ${result.backgroundHex}`);
    console.log(`   Contrast: ${result.contrast.toFixed(2)}:1 (needs ≥4.5:1)`);

    // Generate fix suggestions
    const suggestions = generateFixSuggestions(result);
    console.log(`   Suggested fixes:`);
    suggestions.forEach(suggestion => {
      console.log(`   - ${suggestion}`);
    });
    console.log('');
  });

  console.log('💡 CSS variable fixes needed:\n');
  generateCssFixes(failingAA);
} else {
  console.log('✅ All color combinations pass WCAG AA!');
}

console.log('\n' + generateAccessibilityReport('dark'));

/**
 * Generate fix suggestions for contrast issues
 */
function generateFixSuggestions(result) {
  const suggestions = [];

  // Determine which color to adjust based on context
  const isTextOnAccent = result.background.includes('accent');
  const isBorder = result.foreground.includes('border');
  const isTextOnBg = result.foreground.includes('text') && result.background.includes('bg');

  if (isTextOnAccent) {
    // For text on accent background, darken the accent color
    suggestions.push(`Darken ${result.background} for better text contrast`);
    suggestions.push(`Consider using a darker shade of blue for accent backgrounds`);
  } else if (isBorder) {
    // For borders, increase contrast with background
    suggestions.push(`Increase contrast of ${result.foreground} against ${result.background}`);
    suggestions.push(`Consider using a lighter border color for better visibility`);
  } else if (isTextOnBg) {
    // For text on background, adjust text color
    suggestions.push(`Adjust ${result.foreground} color for better readability`);
  }

  // General suggestions
  suggestions.push(`Target contrast ratio: ≥4.5:1 for normal text`);
  suggestions.push(`Current ratio: ${result.contrast.toFixed(2)}:1`);

  return suggestions;
}

/**
 * Generate CSS variable fixes
 */
function generateCssFixes(failingResults) {
  const fixes = new Map();

  failingResults.forEach(result => {
    const { foreground, background, foregroundHex, backgroundHex, contrast } = result;

    // Group by color variable
    if (foreground.includes('border')) {
      if (!fixes.has(foreground)) {
        fixes.set(foreground, {
          current: foregroundHex,
          issues: [],
          suggestions: []
        });
      }
      const fix = fixes.get(foreground);
      fix.issues.push(`Low contrast (${contrast.toFixed(2)}:1) with ${background}`);
      fix.suggestions.push(`Increase lightness for better visibility`);
    }

    if (background.includes('accent') && foreground.includes('text-primary')) {
      if (!fixes.has(background)) {
        fixes.set(background, {
          current: backgroundHex,
          issues: [],
          suggestions: []
        });
      }
      const fix = fixes.get(background);
      fix.issues.push(`White text contrast only ${contrast.toFixed(2)}:1`);
      fix.suggestions.push(`Use darker shade: #2a7cff or #1a6cff`);
    }
  });

  // Output CSS fixes
  fixes.forEach((data, variable) => {
    console.log(`/* ${variable}: ${data.current} */`);
    console.log(`/* Issues: ${data.issues.join('; ')} */`);
    console.log(`${variable}: ${getSuggestedColor(variable, data.current)}; /* Suggested fix */`);
    console.log('');
  });
}

/**
 * Get suggested color based on variable type
 */
function getSuggestedColor(variable, currentHex) {
  if (variable === '--border-primary') {
    // Lighten border for better contrast
    return '#3e3e42'; // Lighter gray
  }

  if (variable === '--accent-primary' && currentHex === '#3a8cff') {
    // Darken accent for better text contrast
    return '#2a7cff'; // Darker blue
  }

  return currentHex;
}