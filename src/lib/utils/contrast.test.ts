import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateContrastRatio,
  meetsWcagAA,
  meetsWcagAAA,
  getContrastLevel,
  hexToRgb,
  calculateLuminance
} from './contrast.js';

describe('颜色对比度计算工具', () => {
  describe('hexToRgb', () => {
    it('应该正确转换6位HEX颜色', () => {
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('应该正确转换3位HEX颜色', () => {
      expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('应该处理不带#前缀的颜色', () => {
      expect(hexToRgb('000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('calculateLuminance', () => {
    it('应该正确计算黑色亮度', () => {
      expect(calculateLuminance(0, 0, 0)).toBeCloseTo(0, 5);
    });

    it('应该正确计算白色亮度', () => {
      expect(calculateLuminance(255, 255, 255)).toBeCloseTo(1, 5);
    });

    it('应该正确计算红色亮度', () => {
      // 红色(#ff0000)的相对亮度约为0.2126
      expect(calculateLuminance(255, 0, 0)).toBeCloseTo(0.2126, 3);
    });
  });

  describe('calculateContrastRatio', () => {
    it('应该计算黑白对比度', () => {
      // 黑白对比度应为21:1
      const ratio = calculateContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('应该计算相同颜色的对比度', () => {
      const ratio = calculateContrastRatio('#000000', '#000000');
      expect(ratio).toBeCloseTo(1, 5);
    });

    it('应该计算中等对比度', () => {
      // 示例：深灰色(#333333)和浅灰色(#cccccc)
      const ratio = calculateContrastRatio('#333333', '#cccccc');
      expect(ratio).toBeGreaterThan(4.5); // 应该满足WCAG AA
      // 注意：实际计算出的对比度约为7.87，满足WCAG AAA
      console.log(`#333333 和 #cccccc 对比度: ${ratio.toFixed(2)}:1`);
    });
  });

  describe('meetsWcagAA', () => {
    it('应该识别满足WCAG AA的颜色', () => {
      expect(meetsWcagAA('#000000', '#ffffff')).toBe(true); // 21:1
      expect(meetsWcagAA('#333333', '#cccccc')).toBe(true); // ~7.4:1
    });

    it('应该识别不满足WCAG AA的颜色', () => {
      expect(meetsWcagAA('#666666', '#888888')).toBe(false); // 低对比度
      expect(meetsWcagAA('#000000', '#000000')).toBe(false); // 相同颜色
    });
  });

  describe('meetsWcagAAA', () => {
    it('应该识别满足WCAG AAA的颜色', () => {
      expect(meetsWcagAAA('#000000', '#ffffff')).toBe(true); // 21:1
      expect(meetsWcagAAA('#000000', '#eeeeee')).toBe(true); // ~15.3:1
    });

    it('应该识别不满足WCAG AAA的颜色', () => {
      expect(meetsWcagAAA('#444444', '#bbbbbb')).toBe(false); // ~6.2:1 < 7:1
      expect(meetsWcagAAA('#555555', '#aaaaaa')).toBe(false); // ~4.8:1
    });
  });

  describe('getContrastLevel', () => {
    it('应该返回正确的对比度等级', () => {
      // AAA级别
      const aaa = getContrastLevel('#000000', '#ffffff');
      expect(aaa.level).toBe('AAA');
      expect(aaa.ratio).toBeCloseTo(21, 1);

      // AA级别（实际是AAA，但用于测试）
      const aa = getContrastLevel('#444444', '#bbbbbb');
      expect(aa.level).toBe('AA');
      expect(aa.ratio).toBeGreaterThan(4.5);
      expect(aa.ratio).toBeLessThan(7);

      // 失败级别
      const fail = getContrastLevel('#666666', '#777777');
      expect(fail.level).toBe('Fail');
      expect(fail.ratio).toBeLessThan(4.5);
    });

    it('应该包含描述信息', () => {
      const result = getContrastLevel('#000000', '#ffffff');
      expect(result.description).toContain('Excellent contrast');
      expect(result.description).toContain('WCAG AAA');
    });
  });

  describe('实际黑暗模式颜色测试', () => {
    // 测试当前黑暗模式颜色组合
    const darkModeColors = {
      // 从app.css中提取的黑暗模式颜色
      '--text-primary': '#f8f8f8',
      '--text-secondary': '#a0a0a5',
      '--text-tertiary': '#6c6c70',
      '--bg-primary': '#0f0f10',
      '--bg-secondary': '#1a1a1c',
      '--bg-tertiary': '#252528',
      '--accent-primary': '#1a6cff',
    };

    it('主要文本在主要背景上应该有足够对比度', () => {
      const ratio = calculateContrastRatio(darkModeColors['--text-primary'], darkModeColors['--bg-primary']);
      expect(ratio).toBeGreaterThan(4.5);
      console.log(`主要文本对比度: ${ratio.toFixed(2)}:1`);
    });

    it('次要文本在主要背景上应该有足够对比度', () => {
      const ratio = calculateContrastRatio(darkModeColors['--text-secondary'], darkModeColors['--bg-primary']);
      expect(ratio).toBeGreaterThan(4.5);
      console.log(`次要文本对比度: ${ratio.toFixed(2)}:1`);
    });

    it('强调色在主要背景上应该有足够对比度', () => {
      const ratio = calculateContrastRatio(darkModeColors['--accent-primary'], darkModeColors['--bg-primary']);
      expect(ratio).toBeGreaterThan(4.5);
      console.log(`强调色对比度: ${ratio.toFixed(2)}:1`);
    });

    it('主要文本在次要背景上应该有足够对比度', () => {
      const ratio = calculateContrastRatio(darkModeColors['--text-primary'], darkModeColors['--bg-secondary']);
      expect(ratio).toBeGreaterThan(4.5);
      console.log(`主要文本在次要背景上对比度: ${ratio.toFixed(2)}:1`);
    });
  });
});