/**
 * 颜色对比度计算工具
 * 用于验证WCAG AA和AAA合规性
 */

/**
 * 将HEX颜色转换为RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // 移除#前缀
  hex = hex.replace(/^#/, '');

  // 处理3位HEX
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  // 解析6位HEX
  const bigint = parseInt(hex, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

/**
 * 计算相对亮度（WCAG 2.0公式）
 */
export function calculateLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * 计算对比度比率
 * @param color1 第一个颜色（HEX格式）
 * @param color2 第二个颜色（HEX格式）
 * @returns 对比度比率
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const l1 = calculateLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = calculateLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 检查对比度是否满足WCAG AA标准（≥4.5:1）
 */
export function meetsWcagAA(color1: string, color2: string): boolean {
  const ratio = calculateContrastRatio(color1, color2);
  return ratio >= 4.5;
}

/**
 * 检查对比度是否满足WCAG AAA标准（≥7:1）
 */
export function meetsWcagAAA(color1: string, color2: string): boolean {
  const ratio = calculateContrastRatio(color1, color2);
  return ratio >= 7;
}

/**
 * 获取对比度等级描述
 */
export function getContrastLevel(color1: string, color2: string): {
  ratio: number;
  level: 'AAA' | 'AA' | 'Fail';
  description: string;
} {
  const ratio = calculateContrastRatio(color1, color2);

  if (ratio >= 7) {
    return {
      ratio,
      level: 'AAA',
      description: 'Excellent contrast (WCAG AAA)'
    };
  } else if (ratio >= 4.5) {
    return {
      ratio,
      level: 'AA',
      description: 'Good contrast (WCAG AA)'
    };
  } else {
    return {
      ratio,
      level: 'Fail',
      description: 'Insufficient contrast'
    };
  }
}

/**
 * 从CSS变量获取颜色值
 * 注意：这需要在浏览器环境中运行
 */
export function getCssVariableColor(variable: string, element: HTMLElement = document.documentElement): string {
  if (typeof window === 'undefined') {
    return '#000000'; // 服务器端回退
  }

  const value = getComputedStyle(element).getPropertyValue(variable).trim();

  // 处理CSS颜色函数
  if (value.startsWith('rgb') || value.startsWith('hsl')) {
    // 简化处理：返回黑色作为占位符
    console.warn(`Complex color format not fully supported: ${value}`);
    return '#000000';
  }

  return value || '#000000';
}

/**
 * 验证黑暗模式颜色对比度
 */
export function validateDarkModeContrast(): Array<{
  foreground: string;
  background: string;
  ratio: number;
  level: 'AAA' | 'AA' | 'Fail';
}> {
  if (typeof window === 'undefined') {
    return [];
  }

  const root = document.documentElement;
  const results = [];

  // 定义要测试的颜色组合
  const colorPairs = [
    { foreground: '--text-primary', background: '--bg-primary' },
    { foreground: '--text-secondary', background: '--bg-primary' },
    { foreground: '--text-tertiary', background: '--bg-primary' },
    { foreground: '--accent-primary', background: '--bg-primary' },
    { foreground: '--text-primary', background: '--bg-secondary' },
    { foreground: '--text-primary', background: '--bg-tertiary' },
    { foreground: '--text-primary', background: '--bg-selected' },
  ];

  for (const pair of colorPairs) {
    const fg = getCssVariableColor(pair.foreground, root);
    const bg = getCssVariableColor(pair.background, root);

    // 跳过无效颜色
    if (!fg || !bg || fg === '#000000' || bg === '#000000') {
      continue;
    }

    const { ratio, level } = getContrastLevel(fg, bg);

    results.push({
      foreground: pair.foreground,
      background: pair.background,
      ratio,
      level
    });
  }

  return results;
}

/**
 * 生成对比度报告
 */
export function generateContrastReport(): string {
  const results = validateDarkModeContrast();

  if (results.length === 0) {
    return '无法生成对比度报告（需要在浏览器环境中运行）';
  }

  let report = '颜色对比度报告\n';
  report += '='.repeat(50) + '\n\n';

  let aaCount = 0;
  let aaaCount = 0;
  let failCount = 0;

  for (const result of results) {
    report += `${result.foreground} on ${result.background}\n`;
    report += `  对比度: ${result.ratio.toFixed(2)}:1\n`;
    report += `  等级: ${result.level}\n`;

    if (result.level === 'AAA') aaaCount++;
    else if (result.level === 'AA') aaCount++;
    else failCount++;

    report += '\n';
  }

  report += '摘要\n';
  report += '-'.repeat(30) + '\n';
  report += `WCAG AAA: ${aaaCount}\n`;
  report += `WCAG AA: ${aaCount}\n`;
  report += `不达标: ${failCount}\n`;
  report += `总计: ${results.length}\n`;

  return report;
}