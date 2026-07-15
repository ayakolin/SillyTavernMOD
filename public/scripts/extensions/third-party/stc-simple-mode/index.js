// @ts-nocheck
// STC Simple Mode Extension - entry point
//
// Adds a "simple / advanced" toggle that hides advanced drawers
// (progressive disclosure) for new users while keeping every
// feature reachable — nothing is removed, only visually collapsed.

const STORAGE_KEY = 'stc_ui_mode';
const MODE_SIMPLE = 'simple';
const MODE_ADVANCED = 'advanced';

const LABELS = {
    [MODE_SIMPLE]: '🌱 简单',
    [MODE_ADVANCED]: '⚙️ 进阶',
};

/**
 * Pure helper: given the current mode, return the mode that a click
 * on the toggle should switch to. Kept standalone (no DOM/localStorage
 * access) so it can be unit-tested in isolation.
 * @param {string} m current mode ('simple' | 'advanced')
 * @returns {string} the next mode
 */
function nextMode(m) {
    return m === MODE_SIMPLE ? MODE_ADVANCED : MODE_SIMPLE;
}

/** Read the persisted preference, defaulting to 'simple' when unset. */
function getStoredMode() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === MODE_ADVANCED ? MODE_ADVANCED : MODE_SIMPLE;
    } catch {
        // localStorage unavailable (privacy mode, etc.) — default to simple.
        return MODE_SIMPLE;
    }
}

/** Persist the preference. */
function storeMode(mode) {
    try {
        localStorage.setItem(STORAGE_KEY, mode);
    } catch {
        // Ignore write failures; the toggle still works for this session.
    }
}

/**
 * Apply the given mode to the document: toggle the body class that
 * drives the CSS hiding rules, and refresh the toggle button label
 * to reflect the CURRENT mode.
 * @param {string} mode 'simple' | 'advanced'
 */
function applyMode(mode) {
    document.body.classList.toggle('stc-simple', mode === MODE_SIMPLE);

    const toggle = document.getElementById('stc-mode-toggle');
    if (toggle) {
        toggle.textContent = LABELS[mode] ?? LABELS[MODE_SIMPLE];
        toggle.title = mode === MODE_SIMPLE
            ? '当前：简单模式（点击切换到进阶模式，显示全部抽屉）'
            : '当前：进阶模式（点击切换到简单模式，隐藏高级抽屉）';
    }
}

/** Poll for an element until it exists, or give up after ~10s. Never throws. */
function waitFor(selector, { intervalMs = 300, timeoutMs = 10000 } = {}) {
    return new Promise((resolve) => {
        const existing = document.querySelector(selector);
        if (existing) {
            resolve(existing);
            return;
        }

        const start = Date.now();
        const timer = setInterval(() => {
            const el = document.querySelector(selector);
            if (el) {
                clearInterval(timer);
                resolve(el);
                return;
            }
            if (Date.now() - start >= timeoutMs) {
                clearInterval(timer);
                resolve(null); // Give up quietly — never throw.
            }
        }, intervalMs);
    });
}

/** Build and inject the mode toggle pill into #top-settings-holder. */
async function injectModeToggle() {
    if (document.getElementById('stc-mode-toggle')) return; // already injected

    const holder = await waitFor('#top-settings-holder');
    if (!holder) {
        console.debug('[STC-MOD] #top-settings-holder not found, skipping simple-mode toggle injection');
        return;
    }
    if (document.getElementById('stc-mode-toggle')) return; // race guard

    const toggle = document.createElement('div');
    toggle.id = 'stc-mode-toggle';
    toggle.addEventListener('click', () => {
        const current = getStoredMode();
        const mode = nextMode(current);
        storeMode(mode);
        applyMode(mode);
    });

    holder.appendChild(toggle);
    applyMode(getStoredMode());
}

jQuery(async () => {
    // Apply the stored (or default) mode as early as possible so the
    // advanced drawers are hidden/shown before the user notices a flash.
    applyMode(getStoredMode());

    // Inject the toggle control once the top settings bar is ready.
    await injectModeToggle();
});
