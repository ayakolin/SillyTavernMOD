import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const EXT_DIR = 'public/scripts/extensions/third-party/stc-onboarding/';
const readJson = (rel) => JSON.parse(readFileSync(root + rel, 'utf8'));
const readText = (rel) => readFileSync(root + rel, 'utf8');

describe('stc-onboarding manifest.json', () => {
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

describe('stc-onboarding style.css', () => {
    const css = readText(EXT_DIR + 'style.css');

    test('styles the onboarding card container', () => {
        expect(css).toContain('#stc-onboarding-card');
    });
    test('styles the action buttons', () => {
        expect(css).toContain('.stc-onb-btn');
    });
    test('reuses --stc- design tokens with literal fallbacks', () => {
        expect(css).toContain('var(--stc-surface, #fff)');
        expect(css).toContain('var(--stc-accent, #888)');
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

describe('stc-onboarding index.js', () => {
    const js = readText(EXT_DIR + 'index.js');

    test('opts out of TypeScript checking like the rest of the codebase', () => {
        expect(js.trimStart().startsWith('// @ts-nocheck')).toBe(true);
    });
    test('persists the onboarding flag to localStorage under stc_onboarded', () => {
        expect(js).toContain('localStorage');
        expect(js).toContain('stc_onboarded');
    });
    test('defines a pure shouldShowOnboarding helper', () => {
        expect(js).toContain('function shouldShowOnboarding');
        expect(js).toContain("stored !== '1'");
    });
    test('wires the "connect model" action to #API-status-top', () => {
        expect(js).toContain('#API-status-top');
    });
    test('wires the "pick character" action to #rightNavDrawerIcon', () => {
        expect(js).toContain('#rightNavDrawerIcon');
    });
    test('creates real, keyboard-accessible <button> elements', () => {
        expect(js).toContain("document.createElement('button')");
        expect(js).toContain("type = 'button'");
    });
    test('listens for Escape to dismiss the card', () => {
        expect(js).toContain('Escape');
    });
    test('guards against double-injecting the card', () => {
        expect(js).toContain("getElementById('stc-onboarding-card')");
    });
    test('defers showing the card until the ST first-run dialog closes', () => {
        expect(js).toContain('function isStDialogOpen');
        expect(js).toContain('#shadow_popup');
    });
    test('detects both modern (dialog.popup) and legacy ST dialogs', () => {
        expect(js).toContain('dialog.popup[open]');
        expect(js).toContain('#shadow_popup');
    });
});
