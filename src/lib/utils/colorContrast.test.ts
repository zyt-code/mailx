import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  calculateLuminance,
  calculateContrastRatio,
  isWcagCompliant,
  checkColorContrast
} from './colorContrast.js';

describe('colorContrast utilities', () => {
  describe('hexToRgb', () => {
    it('should convert 3-digit hex to RGB', () => {
      expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
      expect(hexToRgb('#000')).toEqual([0, 0, 0]);
      expect(hexToRgb('#f00')).toEqual([255, 0, 0]);
    });

    it('should convert 6-digit hex to RGB', () => {
      expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
      expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
      expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
    });

    it('should handle hex without hash', () => {
      expect(hexToRgb('ffffff')).toEqual([255, 255, 255]);
      expect(hexToRgb('000000')).toEqual([0, 0, 0]);
    });

    it('should throw error for invalid hex', () => {
      expect(() => hexToRgb('invalid')).toThrow('Invalid hex color');
    });
  });

  describe('calculateLuminance', () => {
    it('should calculate luminance for white', () => {
      expect(calculateLuminance([255, 255, 255])).toBeCloseTo(1, 3);
    });

    it('should calculate luminance for black', () => {
      expect(calculateLuminance([0, 0, 0])).toBeCloseTo(0, 3);
    });

    it('should calculate luminance for mid-gray', () => {
      expect(calculateLuminance([128, 128, 128])).toBeCloseTo(0.2159, 3);
    });
  });

  describe('calculateContrastRatio', () => {
    it('should calculate maximum contrast (white on black)', () => {
      const ratio = calculateContrastRatio('#ffffff', '#000000');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should calculate minimum contrast (same colors)', () => {
      const ratio = calculateContrastRatio('#ffffff', '#ffffff');
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('should calculate contrast for typical text colors', () => {
      // Example: dark gray on white
      const ratio = calculateContrastRatio('#333333', '#ffffff');
      expect(ratio).toBeGreaterThan(4.5); // Should pass WCAG AA
    });
  });

  describe('isWcagCompliant', () => {
    it('should pass WCAG AA for normal text (≥4.5:1)', () => {
      expect(isWcagCompliant('#ffffff', '#000000', 'normal')).toBe(true);
      expect(isWcagCompliant('#333333', '#ffffff', 'normal')).toBe(true);
    });

    it('should fail WCAG AA for insufficient contrast', () => {
      expect(isWcagCompliant('#888888', '#ffffff', 'normal')).toBe(false);
    });

    it('should pass WCAG AA for large text (≥3:1)', () => {
      expect(isWcagCompliant('#666666', '#ffffff', 'large')).toBe(true);
    });

    it('should fail WCAG AA for large text with insufficient contrast', () => {
      expect(isWcagCompliant('#999999', '#ffffff', 'large')).toBe(false);
    });
  });

  describe('checkColorContrast', () => {
    it('should check all theme color combinations', () => {
      const results = checkColorContrast();

      // Check primary text on primary background
      const primaryResult = results.find(r =>
        r.foreground === '--text-primary' && r.background === '--bg-primary'
      );
      expect(primaryResult).toBeDefined();
      expect(primaryResult?.contrast).toBeGreaterThan(0);

      // Check secondary text on primary background
      const secondaryResult = results.find(r =>
        r.foreground === '--text-secondary' && r.background === '--bg-primary'
      );
      expect(secondaryResult).toBeDefined();

      // All results should have contrast ratio
      results.forEach(result => {
        expect(result.contrast).toBeGreaterThan(0);
        expect(result.passesAA).toBeTypeOf('boolean');
        expect(result.passesAAA).toBeTypeOf('boolean');
      });
    });

    it('should identify WCAG compliance issues', () => {
      const results = checkColorContrast();

      // Log any failures for debugging
      const failures = results.filter(r => !r.passesAA);
      if (failures.length > 0) {
        console.log('WCAG AA failures found:', failures);
      }

      // We expect most primary combinations to pass, but note that
      // --text-primary on --accent-primary might fail (white text on blue)
      // and borders might have low contrast by design
      const criticalCombinations = results.filter(r =>
        (r.foreground === '--text-primary' && r.background === '--bg-primary') ||
        (r.foreground === '--text-primary' && r.background === '--bg-secondary') ||
        (r.foreground === '--text-primary' && r.background === '--bg-tertiary') ||
        (r.foreground === '--text-secondary' && r.background === '--bg-primary')
      );

      criticalCombinations.forEach(result => {
        expect(result.passesAA).toBe(true);
      });
    });
  });
});