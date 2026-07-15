import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const EXT_DIR = 'public/scripts/extensions/third-party/stc-admin-panel/';
const readText = (rel) => readFileSync(root + rel, 'utf8');

describe('stc-admin-panel style.css warm-theme adaptation', () => {
    const css = readText(EXT_DIR + 'style.css');

    test('uses --stc-surface, --stc-accent and --stc-text tokens', () => {
        expect(css).toContain('var(--stc-surface');
        expect(css).toContain('var(--stc-accent');
        expect(css).toContain('var(--stc-text');
    });
    test('no longer has the raw #16213e background as a bare value', () => {
        expect(css).not.toContain('background: #16213e;');
        expect(css).toContain('var(--stc-surface, #16213e)');
    });
    test('no longer has the raw #6c63ff background as a bare value', () => {
        expect(css).not.toContain('background: #6c63ff;');
        expect(css).toContain('var(--stc-accent, #6c63ff)');
    });
});

describe('stc-admin-panel index.js warm-theme adaptation', () => {
    const js = readText(EXT_DIR + 'index.js');

    test('launcher/avatar gradient falls back to the original blue-to-purple gradient', () => {
        expect(js).toContain('var(--stc-accent, #4a90e2)');
    });
});
