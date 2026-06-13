/**
 * SillyTavernchat Module - Reverse proxy compatibility
 * Configures Express `trust proxy` when deployed behind nginx/OpenResty/Cloudflare.
 */
import { getStcConfig } from '../config.js';

/**
 * Apply Express trust proxy setting from config.yaml (`deployment.trustProxy`).
 *
 * Priority:
 *   1. Manual config `deployment.trustProxy` (false / 1 / 2 / true) -> highest, never overridden.
 *   2. Startup env detection: CF_RAY / CF_CONNECTING_IP / BEHIND_PROXY=true.
 *   3. Runtime detection: first request carrying X-Forwarded-* headers.
 *
 * Must run before cookie-session and CSRF middleware.
 * Sets `app.locals.stcTrustProxyEnabled` so cookie `secure` can follow it.
 *
 * @param {import('express').Express} app
 */
export function configureTrustProxy(app) {
    const configured = getStcConfig('deployment.trustProxy', null);

    // 1. Manual configuration takes precedence and disables auto-detection.
    if (configured !== null && configured !== undefined && configured !== '') {
        if (configured === false) {
            app.locals.stcTrustProxyEnabled = false;
            return;
        }
        app.set('trust proxy', configured);
        app.locals.stcTrustProxyEnabled = true;
        console.log('[STC-MOD] Express trust proxy enabled (config):', configured);
        return;
    }

    // 2. Startup environment detection (Cloudflare / explicit marker).
    const envDetected =
        process.env.BEHIND_PROXY === 'true' ||
        process.env.CF_RAY !== undefined ||
        process.env.CF_CONNECTING_IP !== undefined;

    if (envDetected) {
        app.set('trust proxy', 1);
        app.locals.stcTrustProxyEnabled = true;
        console.log('[STC-MOD] Auto-detected reverse proxy environment (env), enabling trust proxy: 1');
        console.log('[STC-MOD] To override, set deployment.trustProxy in config.yaml');
        return;
    }

    // 3. Runtime detection: inspect X-Forwarded-* headers on incoming requests.
    //    process.env.HTTP_X_FORWARDED_* does NOT exist in Node/Express, so we
    //    must read the actual request headers instead.
    app.locals.stcTrustProxyEnabled = false;
    let runtimeApplied = false;
    app.use((req, _res, next) => {
        if (runtimeApplied) {
            return next();
        }
        const hasForwarded =
            req.headers['x-forwarded-for'] !== undefined ||
            req.headers['x-forwarded-proto'] !== undefined;
        if (hasForwarded) {
            runtimeApplied = true;
            app.set('trust proxy', 1);
            app.locals.stcTrustProxyEnabled = true;
            console.log('[STC-MOD] Auto-detected X-Forwarded-* header at runtime, enabling trust proxy: 1');
        }
        next();
    });
}
