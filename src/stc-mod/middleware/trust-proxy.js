/**
 * SillyTavernchat Module - Reverse proxy compatibility
 * Configures Express `trust proxy` when deployed behind nginx/OpenResty/Cloudflare.
 */
import { getStcConfig } from '../config.js';

/**
 * Apply Express trust proxy setting from config.yaml (`deployment.trustProxy`).
 * Auto-detects reverse proxy environment when not manually configured.
 * Must run before cookie-session and CSRF middleware.
 * @param {import('express').Express} app
 */
export function configureTrustProxy(app) {
    let value = getStcConfig('deployment.trustProxy', null);

    // Auto-detect reverse proxy when not explicitly configured
    if (value === null || value === undefined) {
        const autoDetect = 
            process.env.BEHIND_PROXY === 'true' ||
            process.env.HTTP_X_FORWARDED_FOR !== undefined ||
            process.env.HTTP_X_FORWARDED_PROTO !== undefined ||
            process.env.CF_RAY !== undefined ||  // Cloudflare特征
            process.env.CF_CONNECTING_IP !== undefined;
        
        if (autoDetect) {
            value = 1;
            console.log('[STC-MOD] Auto-detected reverse proxy environment, enabling trust proxy: 1');
            console.log('[STC-MOD] To override, set deployment.trustProxy in config.yaml');
        }
    }

    if (value === false || value === null || value === undefined || value === '') {
        return;
    }

    app.set('trust proxy', value);
    console.log('[STC-MOD] Express trust proxy enabled:', value);
}
