// @ts-nocheck
// STC Appearance Extension - entry point
//
// Adds a discoverable "🎨 外观" pill that opens a warm, non-blocking
// theme picker panel. Theme switching is delegated ENTIRELY to the
// official #themes <select> + its native `change` handler (power-user.js)
// — this extension never stores or applies theme data itself, it only
// drives the existing control so color application + custom_css +
// persistence (saveSettingsDebounced) stay exactly official.

const TOGGLE_BTN_ID = 'stc-appearance-btn';
const PANEL_ID = 'stc-appearance-panel';

// The two warm themes get featured cards up top; everything else in
// #themes is listed under "更多主题" (more themes).
const FEATURED_THEMES = [
    { name: '暖阳拿铁', emoji: '☀️', subtitle: '浅色' },
    { name: '暖夜可可', emoji: '🌙', subtitle: '深色' },
];

/**
 * Pure helper: list every theme name currently offered by the official
 * theme dropdown. Standalone (no side effects beyond reading the DOM)
 * so it is easy to unit-test in isolation.
 * @returns {string[]} the #themes <option> values, in DOM order
 */
function getThemes() {
    const sel = document.getElementById('themes');
    if (!sel || !sel.options) return [];
    return Array.from(sel.options).map((opt) => opt.value);
}

/**
 * Pure(ish) helper: the currently applied theme name.
 * @returns {string|undefined} #themes' current value, or undefined if missing
 */
function getCurrentTheme() {
    return document.getElementById('themes')?.value;
}

/**
 * Apply a theme by driving the OFFICIAL #themes <select> exactly like a
 * user picking it manually: set the value, then fire a bubbling `change`
 * event. The official handler (power-user.js) applies the theme's colors
 * + custom_css and persists it via saveSettingsDebounced() — we never
 * touch theme storage ourselves.
 * @param {string} name theme name (must match a #themes <option> value)
 */
function applyThemeByName(name) {
    const sel = document.getElementById('themes');
    if (!sel) return;
    sel.value = name;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
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

// Whether the "更多主题" list is expanded. Kept across re-renders within an
// open session so picking a theme doesn't collapse the list the user opened.
let moreExpanded = false;

/**
 * (Re)build the panel's inner content from the CURRENT theme list and
 * selection. Called on every open, and again after each pick so the
 * highlighted card/item stays in sync without closing the panel.
 * @param {HTMLElement} panel the panel container (cleared and rebuilt)
 */
function renderPanelContent(panel) {
    panel.innerHTML = '';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'stc-appr-close';
    closeBtn.setAttribute('aria-label', '关闭外观面板');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', closePanel);

    const title = document.createElement('div');
    title.className = 'stc-appr-title';
    title.textContent = '外观';

    panel.append(closeBtn, title);

    const themes = getThemes();
    const current = getCurrentTheme();

    // Featured row: warm latte / cocoa, only rendered when present in
    // #themes (avoids a dead-end card if a theme was ever removed).
    const featuredRow = document.createElement('div');
    featuredRow.className = 'stc-appr-featured';

    for (const featured of FEATURED_THEMES) {
        if (!themes.includes(featured.name)) continue;

        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'stc-appr-card';
        if (current === featured.name) card.classList.add('selected');

        const emoji = document.createElement('div');
        emoji.className = 'stc-appr-card-emoji';
        emoji.textContent = featured.emoji;

        const name = document.createElement('div');
        name.className = 'stc-appr-card-name';
        name.textContent = featured.name;

        const subtitle = document.createElement('div');
        subtitle.className = 'stc-appr-card-subtitle';
        subtitle.textContent = featured.subtitle;

        card.append(emoji, name, subtitle);
        card.addEventListener('click', () => {
            applyThemeByName(featured.name);
            renderPanelContent(panel); // refresh highlight; keep panel open
        });

        featuredRow.appendChild(card);
    }

    if (featuredRow.childElementCount > 0) {
        panel.appendChild(featuredRow);
    }

    // Everything else goes under the collapsible "更多主题" list.
    const remaining = themes.filter((t) => !FEATURED_THEMES.some((f) => f.name === t));

    if (remaining.length > 0) {
        const moreToggle = document.createElement('button');
        moreToggle.type = 'button';
        moreToggle.className = 'stc-appr-more-toggle';
        moreToggle.setAttribute('aria-expanded', moreExpanded ? 'true' : 'false');
        moreToggle.textContent = moreExpanded ? '更多主题 ▲' : '更多主题 ▼';
        moreToggle.addEventListener('click', () => {
            moreExpanded = !moreExpanded;
            renderPanelContent(panel);
        });
        panel.appendChild(moreToggle);

        if (moreExpanded) {
            const list = document.createElement('div');
            list.className = 'stc-appr-more-list';

            for (const name of remaining) {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'stc-appr-item';
                if (current === name) item.classList.add('selected');
                item.textContent = name;
                item.addEventListener('click', () => {
                    applyThemeByName(name);
                    renderPanelContent(panel); // refresh highlight; keep panel open
                });
                list.appendChild(item);
            }

            panel.appendChild(list);
        }
    }
}

/** Esc closes the panel while it's open. */
function onPanelKeydown(event) {
    if (event.key === 'Escape') {
        closePanel();
    }
}

/** A click outside the panel (and outside the toggle pill) closes it. */
function onDocumentClick(event) {
    const panel = document.getElementById(PANEL_ID);
    const toggle = document.getElementById(TOGGLE_BTN_ID);
    if (!panel) return;
    if (panel.contains(event.target)) return;
    if (toggle && toggle.contains(event.target)) return;
    closePanel();
}

/** Close the panel: drop the document listeners (no leak) and hide it. Idempotent. */
function closePanel() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel || panel.hidden) return; // already closed

    panel.hidden = true;
    document.removeEventListener('keydown', onPanelKeydown);
    document.removeEventListener('click', onDocumentClick);
}

/** Open the panel: rebuild its content and wire up the close listeners. Idempotent. */
function openPanel() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel || !panel.hidden) return; // already open, or not injected

    renderPanelContent(panel);
    panel.hidden = false;

    document.addEventListener('keydown', onPanelKeydown);
    // Defer attaching the outside-click listener so the SAME click that
    // opened the panel (still bubbling up to document) doesn't immediately
    // close it again.
    setTimeout(() => document.addEventListener('click', onDocumentClick), 0);
}

/** Toggle the panel open/closed. */
function togglePanel() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    if (panel.hidden) {
        openPanel();
    } else {
        closePanel();
    }
}

/** Build and inject the (initially hidden) panel container into the document body. Idempotent. */
function injectPanel() {
    if (document.getElementById(PANEL_ID)) return; // already injected

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '外观');
    panel.hidden = true;

    document.body.appendChild(panel);
}

/** Build and inject the "🎨 外观" toggle pill into #top-settings-holder. */
async function injectAppearanceButton() {
    if (document.getElementById(TOGGLE_BTN_ID)) return; // already injected

    const holder = await waitFor('#top-settings-holder');
    if (!holder) {
        console.debug('[STC-MOD] #top-settings-holder not found, skipping appearance button injection');
        return;
    }
    if (document.getElementById(TOGGLE_BTN_ID)) return; // race guard

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = TOGGLE_BTN_ID;
    btn.textContent = '🎨 外观';
    btn.title = '外观 / 主题';
    btn.addEventListener('click', togglePanel);

    holder.appendChild(btn);
}

jQuery(async () => {
    injectPanel();
    await injectAppearanceButton();
});
