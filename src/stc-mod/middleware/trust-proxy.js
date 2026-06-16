/**
 * SillyTavernchat Module - Reverse proxy compatibility
 * Configures Express `trust proxy` when deployed behind nginx/OpenResty/Cloudflare.
 *
 * Trust proxy is configured EXPLICITLY via config.yaml (`deployment.trustProxy`).
 * There is intentionally NO auto-detection:
 *   - `process.env.HTTP_X_FORWARDED_*` / `CF_RAY` do NOT exist in Node/Express
 *     (those are CGI/PHP conventions), so the old env detection never fired.
 *   - Runtime detection from `X-Forwarded-*` headers can be spoofed by anyone
 *     connecting directly to the container, tricking the app into trusting
 *     forged client IPs. Explicit configuration is the safe, predictable choice.
 *
 * Note on IP identification:
 * This project uses a dual-track system:
 *   - Express trust proxy: used ONLY to enable `secure: 'auto'` cookies (so
 *     Express recognizes HTTPS reverse proxy scenarios).
 *   - Custom IP functions (getIpFromRequest, getRealOrForwardedIp): used for
 *     all actual IP-based logic (whitelist, rate limiting, logging). These
 *     directly read socket IPs and configured headers, bypassing Express req.ip.
 *
 * Cloudflare users: set deployment.trustProxy to 'cloudflare' AND enable the
 * forwardedHeaders.cfConnectingIp config flag (in config.yaml) so the custom
 * IP functions pick up CF-Connecting-IP as the real visitor IP.
 */
import { getStcConfig, setStcConfig } from '../config.js';

// Cloudflare published IP ranges (https://www.cloudflare.com/ips/).
// Last updated: 2026-06-15
// To update: curl https://www.cloudflare.com/ips-v4 && curl https://www.cloudflare.com/ips-v6
const CLOUDFLARE_IP_RANGES = [
    '173.245.48.0/20',
    '103.21.244.0/22',
    '103.22.200.0/22',
    '103.31.4.0/22',
    '141.101.64.0/18',
    '108.162.192.0/18',
    '190.93.240.0/20',
    '188.114.96.0/20',
    '197.234.240.0/22',
    '198.41.128.0/17',
    '162.158.0.0/15',
    '104.16.0.0/13',
    '104.24.0.0/14',
    '172.64.0.0/13',
    '131.0.72.0/22',
    '2400:cb00::/32',
    '2606:4700::/32',
    '2803:f800::/32',
    '2405:b500::/32',
    '2405:8100::/32',
    '2a06:98c0::/29',
    '2c0f:f248::/32',
];

/**
 * Apply Express trust proxy setting from config.yaml (`deployment.trustProxy`).
 *
 * Accepted values:
 *   - false / null / '' : do not trust any proxy (default; safe for local HTTP).
 *   - 1 / 2 / number    : trust N proxy hops (1 = single nginx/OpenResty/Caddy,
 *                         2 = Cloudflare + your own reverse proxy).
 *   - true              : trust all hops (NOT recommended).
 *   - 'cloudflare'      : trust only Cloudflare's published IP ranges. Also
 *                         auto-enables forwardedHeaders.cfConnectingIp so the
 *                         project's custom IP functions use CF-Connecting-IP.
 *
 * Must run before cookie-session and CSRF middleware.
 * Sets `app.locals.stcTrustProxyEnabled` so cookie `secure` can follow it.
 *
 * @param {import('express').Express} app
 */
export function configureTrustProxy(app) {
    const configured = getStcConfig('deployment.trustProxy', false);

    // Disabled / unset: keep official default (no proxy trust). Required for
    // plain local HTTP so the session cookie is not dropped by secure flag.
    if (configured === false || configured === null || configured === undefined || configured === '') {
        app.locals.stcTrustProxyEnabled = false;
        return;
    }

    // Cloudflare mode: trust only CF edge IPs.
    if (configured === 'cloudflare') {
        app.set('trust proxy', CLOUDFLARE_IP_RANGES);
        app.locals.stcTrustProxyEnabled = true;

        // Auto-enable forwardedHeaders.cfConnectingIp so the custom IP functions
        // (getIpFromRequest, getRealOrForwardedIp) use CF-Connecting-IP for the
        // real visitor IP. This avoids runtime header manipulation and uses the
        // project's existing IP resolution stack.
        setStcConfig('forwardedHeaders.cfConnectingIp', true);

        console.log('[STC-MOD] Express trust proxy enabled (cloudflare): trusting Cloudflare IP ranges');
        console.log('[STC-MOD] Auto-enabled forwardedHeaders.cfConnectingIp for CF visitor IP detection');
        return;
    }

    // Numeric hop count or true.
    app.set('trust proxy', configured);
    app.locals.stcTrustProxyEnabled = true;
    console.log('[STC-MOD] Express trust proxy enabled (config):', configured);
}
