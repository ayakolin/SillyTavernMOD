import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const EXT_DIR = 'public/scripts/extensions/third-party/stc-simple-mode/';
const readJson = (rel) => JSON.parse(readFileSync(root + rel, 'utf8'));
const readText = (rel) => readFileSync(root + rel, 'utf8');

describe('stc-simple-mode manifest.json', () => {
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

describe('stc-simple-mode style.css', () => {
    const css = readText(EXT_DIR + 'style.css');
    const advancedDrawerIds = [
        '#ai-config-button',
        '#advanced-formatting-button',
        '#WI-SP-button',
        '#extensions-settings-button',
    ];

    test('hides all four advanced drawer ids', () => {
        for (const id of advancedDrawerIds) {
            expect(css).toContain(id);
        }
    });
    test('uses display: none to hide advanced drawers', () => {
        expect(css).toContain('display: none');
    });
    test('scopes the hiding rules under body.stc-simple', () => {
        expect(css).toContain('body.stc-simple');
    });
    test('styles the #stc-mode-toggle pill', () => {
        expect(css).toContain('#stc-mode-toggle');
    });
});

describe('stc-simple-mode index.js', () => {
    const js = readText(EXT_DIR + 'index.js');

    test('opts out of TypeScript checking like the rest of the codebase', () => {
        expect(js.trimStart().startsWith('// @ts-nocheck')).toBe(true);
    });
    test('persists preference to localStorage under stc_ui_mode', () => {
        expect(js).toContain('localStorage');
        expect(js).toContain('stc_ui_mode');
    });
    test('defaults to simple mode when unset', () => {
        expect(js).toContain("'simple'");
    });
    test('defines a nextMode toggle helper', () => {
        expect(js).toContain('function nextMode');
        expect(js).toContain("m === MODE_SIMPLE ? MODE_ADVANCED : MODE_SIMPLE");
    });
    test('toggles body.stc-simple class via applyMode', () => {
        expect(js).toContain('function applyMode');
        expect(js).toContain("classList.toggle('stc-simple'");
    });
    test('injects the toggle into #top-settings-holder', () => {
        expect(js).toContain('top-settings-holder');
        expect(js).toContain('stc-mode-toggle');
    });
    test('creates the toggle as a real, keyboard-accessible button', () => {
        expect(js).toContain("document.createElement('button')");
        expect(js).toContain("toggle.type = 'button'");
    });
    test('reflects mode via aria-pressed in applyMode', () => {
        expect(js).toContain("toggle.setAttribute('aria-pressed'");
    });
});
