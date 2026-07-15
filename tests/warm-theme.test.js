import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const readJson = (rel) => JSON.parse(readFileSync(root + rel, 'utf8'));

// 34-field theme schema (matches default/content/themes/Cappuccino.json)
export const REQUIRED_THEME_KEYS = [
    'name', 'blur_strength', 'main_text_color', 'italics_text_color',
    'underline_text_color', 'quote_text_color', 'blur_tint_color', 'chat_tint_color',
    'user_mes_blur_tint_color', 'bot_mes_blur_tint_color', 'shadow_color', 'shadow_width',
    'border_color', 'font_scale', 'fast_ui_mode', 'waifuMode', 'avatar_style',
    'chat_display', 'noShadows', 'chat_width', 'timer_enabled', 'timestamps_enabled',
    'timestamp_model_icon', 'mesIDDisplay_enabled', 'hideChatAvatars_enabled',
    'message_token_count_enabled', 'expand_message_actions', 'enableZenSliders',
    'enableLabMode', 'hotswap_enabled', 'custom_css', 'bogus_folders', 'reduced_motion',
    'compact_input_area',
];

// Parse "rgba(r, g, b, a)" or "#RRGGBB" -> [r,g,b]
function toRgb(s) {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
    const h = s.match(/^#([0-9a-f]{6})$/i);
    if (h) return [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16));
    throw new Error('bad color: ' + s);
}
function relLum([r, g, b]) {
    const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrastRatio(fg, bg) {
    const L1 = relLum(toRgb(fg));
    const L2 = relLum(toRgb(bg));
    const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
    return (hi + 0.05) / (lo + 0.05);
}

describe('warm-latte theme (暖阳拿铁)', () => {
    const t = readJson('default/content/themes/warm-latte.json');

    test('is valid JSON with all 34 required keys', () => {
        for (const k of REQUIRED_THEME_KEYS) expect(t).toHaveProperty(k);
    });
    test('name is 暖阳拿铁', () => {
        expect(t.name).toBe('暖阳拿铁');
    });
    test('main text on blur tint meets WCAG AA (>=4.5)', () => {
        expect(contrastRatio(t.main_text_color, t.blur_tint_color)).toBeGreaterThanOrEqual(4.5);
    });
    test('custom_css defines the shared --stc- token block', () => {
        for (const v of ['--stc-bg', '--stc-surface', '--stc-text', '--stc-accent', '--stc-border', '--stc-radius']) {
            expect(t.custom_css).toContain(v);
        }
    });
});

describe('warm-cocoa theme (暖夜可可)', () => {
    const t = readJson('default/content/themes/warm-cocoa.json');

    test('is valid JSON with all 34 required keys', () => {
        for (const k of REQUIRED_THEME_KEYS) expect(t).toHaveProperty(k);
    });
    test('name is 暖夜可可', () => {
        expect(t.name).toBe('暖夜可可');
    });
    test('main text on blur tint meets WCAG AA (>=4.5)', () => {
        expect(contrastRatio(t.main_text_color, t.blur_tint_color)).toBeGreaterThanOrEqual(4.5);
    });
    test('reuses the same --stc- token names as latte', () => {
        for (const v of ['--stc-bg', '--stc-surface', '--stc-surface-2', '--stc-text',
            '--stc-text-muted', '--stc-accent', '--stc-accent-hover', '--stc-accent-soft',
            '--stc-border', '--stc-radius', '--stc-radius-sm', '--stc-radius-lg']) {
            expect(t.custom_css).toContain(v);
        }
    });
});
