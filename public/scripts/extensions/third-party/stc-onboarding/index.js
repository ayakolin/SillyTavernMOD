// @ts-nocheck
// STC Onboarding Extension - entry point
//
// Shows a warm, dismissible onboarding card to first-time users after
// login, pointing them at the three steps needed to start their first
// chat. Non-blocking (no full-screen dim/overlay), appears once.

const STORAGE_KEY = 'stc_onboarded';
const SHOW_DELAY_MS = 1800;
const ST_DIALOG_POLL_MS = 500;
const ST_DIALOG_MAX_WAIT_MS = 90000;

const API_STATUS_SELECTOR = '#API-status-top';
const CHARACTER_DRAWER_SELECTOR = '#rightNavDrawerIcon';
// SillyTavern shows dialogs two ways: the modern Popup system renders a
// native <dialog class="popup" open> (used by the first-run welcome /
// persona setup), and the legacy path uses #shadow_popup / #dialogue_popup.
const ST_MODERN_DIALOG_SELECTOR = 'dialog.popup[open]';
const ST_LEGACY_DIALOG_SELECTOR = '#shadow_popup';

/**
 * Detect whether any SillyTavern dialog (e.g. the first-run welcome /
 * persona setup) is currently open, so we can defer our card until it
 * closes and avoid overlapping it.
 * Covers BOTH the modern Popup (`<dialog class="popup" open>`) and the
 * legacy `#shadow_popup` (which toggles `display` + `opacity` when hiding,
 * so we check both to avoid racing a fade-out). Defensive: never throws.
 * @returns {boolean} true when an ST dialog is open and visible
 */
function isStDialogOpen() {
    try {
        // Modern Popup system: a native open <dialog>.
        if (document.querySelector(ST_MODERN_DIALOG_SELECTOR)) return true;

        // Legacy #shadow_popup.
        const el = document.querySelector(ST_LEGACY_DIALOG_SELECTOR);
        if (!el) return false;

        const style = getComputedStyle(el);
        if (style.display === 'none') return false;
        if (style.opacity === '0' || el.style.opacity === '0') return false;

        return true;
    } catch {
        return false;
    }
}

/**
 * Pure helper: given the raw stored value of the onboarding flag,
 * decide whether the onboarding card should be shown. Kept standalone
 * (no DOM/localStorage access) so it can be unit-tested in isolation.
 * @param {string|null|undefined} stored the raw localStorage value
 * @returns {boolean} true when the card should be shown
 */
function shouldShowOnboarding(stored) {
    return stored !== '1';
}

/** Read the persisted flag. Never throws; unreadable storage means "not onboarded". */
function getStoredFlag() {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        // localStorage unavailable (privacy mode, etc.) — default to showing the card.
        return null;
    }
}

/** Persist that the user has seen (or dismissed) the onboarding card. */
function markOnboarded() {
    try {
        localStorage.setItem(STORAGE_KEY, '1');
    } catch {
        // Ignore write failures; the card is still removed for this session.
    }
}

/**
 * Build the onboarding card DOM (detached from the document).
 * @returns {{card: HTMLElement, closeBtn: HTMLButtonElement, connectBtn: HTMLButtonElement, characterBtn: HTMLButtonElement, chatBtn: HTMLButtonElement, dismissBtn: HTMLButtonElement}}
 */
function buildOnboardingCard() {
    const card = document.createElement('div');
    card.id = 'stc-onboarding-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', '新手引导');

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'stc-onb-close';
    closeBtn.setAttribute('aria-label', '关闭引导');
    closeBtn.textContent = '×';

    const title = document.createElement('div');
    title.className = 'stc-onb-title';
    title.textContent = '👋 欢迎来到 SillyTavern';

    const subtitle = document.createElement('div');
    subtitle.className = 'stc-onb-subtitle';
    subtitle.textContent = '三步开始你的第一次对话';

    const connectBtn = document.createElement('button');
    connectBtn.type = 'button';
    connectBtn.className = 'stc-onb-btn';
    connectBtn.textContent = '① 连接模型';

    const characterBtn = document.createElement('button');
    characterBtn.type = 'button';
    characterBtn.className = 'stc-onb-btn';
    characterBtn.textContent = '② 挑个角色';

    const chatBtn = document.createElement('button');
    chatBtn.type = 'button';
    chatBtn.className = 'stc-onb-btn';
    chatBtn.textContent = '③ 开始聊天';

    const actions = document.createElement('div');
    actions.className = 'stc-onb-actions';
    actions.append(connectBtn, characterBtn, chatBtn);

    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'stc-onb-dismiss';
    dismissBtn.textContent = '不再显示';

    const footer = document.createElement('div');
    footer.className = 'stc-onb-footer';
    footer.append(dismissBtn);

    card.append(closeBtn, title, subtitle, actions, footer);

    return { card, closeBtn, connectBtn, characterBtn, chatBtn, dismissBtn };
}

/**
 * Build, wire up and inject the onboarding card into the document body.
 * Idempotent — guards against double-injection.
 */
function injectOnboardingCard() {
    if (document.getElementById('stc-onboarding-card')) return; // already injected

    const { card, closeBtn, connectBtn, characterBtn, chatBtn, dismissBtn } = buildOnboardingCard();

    /** Dismiss the card: persist the flag, drop the keydown listener, remove the DOM node. */
    function dismiss() {
        markOnboarded();
        document.removeEventListener('keydown', onKeydown);
        card.remove();
    }

    /** Esc closes the card while it's open. */
    function onKeydown(event) {
        if (event.key === 'Escape') {
            dismiss();
        }
    }

    closeBtn.addEventListener('click', dismiss);
    dismissBtn.addEventListener('click', dismiss);
    chatBtn.addEventListener('click', dismiss);

    connectBtn.addEventListener('click', () => {
        // Opens the API connection drawer. Does not dismiss the card.
        document.querySelector(API_STATUS_SELECTOR)?.click();
    });
    characterBtn.addEventListener('click', () => {
        // Opens the character management drawer. Does not dismiss the card.
        document.querySelector(CHARACTER_DRAWER_SELECTOR)?.click();
    });

    document.addEventListener('keydown', onKeydown);

    document.body.appendChild(card);
}

/**
 * After the initial settle delay, wait until no ST dialog (e.g. the
 * first-run persona picker in #shadow_popup) is open before injecting the
 * onboarding card, so the two never visually overlap. If the user is
 * already onboarded, do nothing. Otherwise poll every ~500ms, capping the
 * total wait at ~90s — if still blocked at the cap, show the card anyway
 * so a stuck/long-lived ST dialog never permanently strands the user.
 */
function waitForStDialogThenShow() {
    if (document.getElementById('stc-onboarding-card')) return; // race guard

    const stored = getStoredFlag();
    if (!shouldShowOnboarding(stored)) return;

    if (!isStDialogOpen()) {
        injectOnboardingCard();
        return;
    }

    let waited = 0;
    const intervalId = setInterval(() => {
        waited += ST_DIALOG_POLL_MS;

        if (!isStDialogOpen() || waited >= ST_DIALOG_MAX_WAIT_MS) {
            clearInterval(intervalId);
            injectOnboardingCard();
        }
    }, ST_DIALOG_POLL_MS);
}

jQuery(() => {
    // Wait for the app to settle (and avoid fighting with ST's own
    // post-login dialogs, e.g. the persona picker) before showing the card.
    setTimeout(waitForStDialogThenShow, SHOW_DELAY_MS);
});
