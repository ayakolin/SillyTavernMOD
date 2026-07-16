import { describe, test, expect } from '@jest/globals';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const readJson = (rel) => JSON.parse(readFileSync(root + rel, 'utf8'));

describe('new-user seed default background (landscape autumn great tree)', () => {
    const settings = readJson('default/content/settings.json');
    const bg = settings.background;

    test('seed settings has a background object', () => {
        expect(bg).toBeTruthy();
        expect(typeof bg).toBe('object');
    });
    test('default background name is the autumn great tree', () => {
        expect(bg.name).toBe('landscape autumn great tree.jpg');
    });
    test('background url uses the correctly URL-encoded backgrounds path', () => {
        // matches generateUrlParameter -> url("backgrounds/<encodeURIComponent(name)>")
        expect(bg.url).toBe('url("backgrounds/landscape%20autumn%20great%20tree.jpg")');
    });
    test('the background image actually ships in default content', () => {
        expect(existsSync(root + 'default/content/backgrounds/landscape autumn great tree.jpg')).toBe(true);
    });
    test('the background is registered in the content index (copied to users)', () => {
        const index = readJson('default/content/index.json');
        expect(index).toContainEqual({
            filename: 'backgrounds/landscape autumn great tree.jpg',
            type: 'background',
        });
    });
});
