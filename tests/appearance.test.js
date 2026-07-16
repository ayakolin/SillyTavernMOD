import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const EXT_DIR = 'public/scripts/extensions/third-party/stc-appearance/';
const readJson = (rel) => JSON.parse(readFileSync(root + rel, 'utf8'));
const readText = (rel) => readFileSync(root + rel, 'utf8');

describe('stc-appearance manifest.json', () => {
    const manifest = readJson(EXT_DIR + 'manifest.json');

    test('is valid JSON', () => {
        expect(manifest).toBeTruthy();
    });
    test('points at index.js and style.css', () => {
        expect(manifest.js).toBe('index.js');
        expect(manifest.css).toBe('style.css');
    });
    test('is enabled for all users by default (empty requires/optional)', () => {
        expect(manifest.requires).toEqual([]);
        expect(manifest.optional).toEqual([]);
    });
});

describe('stc-appearance index.js', () => {
    const js = readText(EXT_DIR + 'index.js');

    test('opts out of TypeScript checking like the rest of the codebase', () => {
        expect(js.trimStart().startsWith('// @ts-nocheck')).toBe(true);
    });
    test('reads/drives the OFFICIAL #themes select, never a private store', () => {
        expect(js).toContain("getElementById('themes')");
    });
    test('applies a theme by dispatching a bubbling change event', () => {
        expect(js).toContain("new Event('change'");
        expect(js).toContain('bubbles: true');
    });
    test('defines a standalone applyThemeByName helper', () => {
        expect(js).toContain('function applyThemeByName');
    });
    test('defines standalone getThemes/getCurrentTheme helpers', () => {
        expect(js).toContain('function getThemes');
        expect(js).toContain('function getCurrentTheme');
    });
    test('features the two warm themes by name', () => {
        expect(js).toContain('暖阳拿铁');
        expect(js).toContain('暖夜可可');
    });
    test('creates real, keyboard-accessible <button> elements', () => {
        expect(js).toContain("document.createElement('button')");
        expect(js).toContain("type = 'button'");
    });
    test('injects the toggle into #top-settings-holder', () => {
        expect(js).toContain('top-settings-holder');
        expect(js).toContain('stc-appearance-btn');
    });
    test('renders the panel with a dialog role', () => {
        expect(js).toContain('stc-appearance-panel');
        expect(js).toContain("setAttribute('role', 'dialog')");
    });
    test('listens for Escape to close the panel', () => {
        expect(js).toContain('Escape');
    });
    test('guards against double-injecting the button and panel', () => {
        expect(js).toContain("getElementById(TOGGLE_BTN_ID)");
        expect(js).toContain("getElementById(PANEL_ID)");
    });
    test('lists remaining themes under a "更多主题" toggle', () => {
        expect(js).toContain('更多主题');
    });
});

describe('stc-appearance style.css', () => {
    const css = readText(EXT_DIR + 'style.css');

    test('styles the toggle pill and panel container', () => {
        expect(css).toContain('#stc-appearance-btn');
        expect(css).toContain('#stc-appearance-panel');
    });
    test('styles the featured cards and more-theme items', () => {
        expect(css).toContain('.stc-appr-card');
        expect(css).toContain('.stc-appr-item');
    });
    test('reuses --stc- design tokens with literal fallbacks', () => {
        expect(css).toContain('var(--stc-surface, #fff)');
        expect(css).toContain('var(--stc-accent, #888)');
        expect(css).toContain('var(--stc-border,');
    });
    test('highlights the selected card/item with the accent border', () => {
        expect(css).toContain('.selected');
        expect(css).toContain('border-color: var(--stc-accent, #888)');
    });
    test('resets native button chrome', () => {
        expect(css).toContain('appearance: none');
        expect(css).toContain('font: inherit');
    });
    test('has a visible :focus-visible outline', () => {
        expect(css).toContain(':focus-visible');
        expect(css).toContain('outline');
    });
});
