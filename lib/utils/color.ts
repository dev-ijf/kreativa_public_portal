/**
 * Color utilities for theme contrast safety.
 * Ensures primary colors remain visible regardless of what's stored in DB.
 */

type RGB = { r: number; g: number; b: number };

export function hexToRgb(hex: string): RGB | null {
  const cleaned = hex.replace(/^#/, '');
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return { r, g, b };
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Relative luminance per WCAG 2.1 (range 0–1, where 1 = white).
 */
export function relativeLuminance({ r, g, b }: RGB): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * WCAG contrast ratio between two luminance values.
 */
export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a hex color is too light to be used as a functional primary
 * (i.e., white text on it would have insufficient contrast, OR
 * it would be invisible as text on a light background).
 *
 * Threshold: contrast ratio with white < 3.0 means it's too light.
 */
export function isPrimaryTooLight(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  const lum = relativeLuminance(rgb);
  const whiteContrast = contrastRatio(1.0, lum);
  return whiteContrast < 3.0;
}

/**
 * Darken a hex color by a given factor (0–1 where 0 = black).
 */
export function darkenHex(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex({
    r: rgb.r * factor,
    g: rgb.g * factor,
    b: rgb.b * factor,
  });
}

/**
 * Given a potentially too-light primary color, return a guaranteed
 * usable primary that provides adequate contrast for both:
 * - White text ON the primary background
 * - Primary text on white/light backgrounds
 */
export function ensureUsablePrimary(hex: string, fallback: string): string {
  if (!isPrimaryTooLight(hex)) return hex;
  return fallback;
}
