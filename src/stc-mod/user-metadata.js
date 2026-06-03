/**
 * SillyTavernchat Module - Extended User Metadata
 * SQLite-backed storage for user extension fields (OAuth, email, storage, expiration).
 * Does NOT modify the official users.js user model.
 */
import { getDb } from './services/database.js';

/**
 * @typedef {Object} UserExtendedData
 * @property {string} [email] - User email
 * @property {string} [oauthProvider] - OAuth provider name (github/discord/linuxdo)
 * @property {string} [oauthUserId] - OAuth user ID from provider
 * @property {string} [avatar] - Avatar URL or base64
 * @property {number} [storageLimitMiB] - Storage limit in MiB
 * @property {string} [storageLastCheckInDate] - Last check-in date (YYYY-MM-DD)
 * @property {number} [expiresAt] - Account expiration timestamp (ms), 0 = permanent
 * @property {number} [createdAt] - Registration timestamp
 * @property {number} [lastLoginAt] - Last login timestamp
 * @property {string} [inviteCodeUsed] - Invite code used for registration
 * @property {boolean} [hasPassword] - Whether user has set a password (for OAuth users)
 * @property {number} [passwordSetAt] - Timestamp when password was set/updated
 * @property {string} [registrationMethod] - Registration method: 'local' | 'github' | 'discord' | 'linuxdo'
 */

/**
 * @typedef {Object} UserMetadataRow
 * @property {string} handle
 * @property {string|null} [email]
 * @property {string|null} [oauth_provider]
 * @property {string|null} [oauth_user_id]
 * @property {string|null} [avatar]
 * @property {number|null} [storage_limit_mib]
 * @property {string|null} [storage_last_checkin_date]
 * @property {number|null} [expires_at]
 * @property {number|null} [created_at]
 * @property {number|null} [last_login_at]
 * @property {string|null} [invite_code_used]
 * @property {number|null} [has_password]
 * @property {number|null} [password_set_at]
 * @property {string|null} [registration_method]
 */

/**
 * @typedef {Object} UserMetadataHandleRow
 * @property {string} handle
 */

/**
 * Convert database row to UserExtendedData object
 * @param {UserMetadataRow|null|undefined} row - SQLite row
 * @returns {UserExtendedData|null}
 */
function rowToData(row) {
    if (!row) return null;
    return {
        email: row.email ?? undefined,
        oauthProvider: row.oauth_provider ?? undefined,
        oauthUserId: row.oauth_user_id ?? undefined,
        avatar: row.avatar ?? undefined,
        storageLimitMiB: row.storage_limit_mib ?? undefined,
        storageLastCheckInDate: row.storage_last_checkin_date ?? undefined,
        expiresAt: row.expires_at ?? undefined,
        createdAt: row.created_at ?? undefined,
        lastLoginAt: row.last_login_at ?? undefined,
        inviteCodeUsed: row.invite_code_used ?? undefined,
        hasPassword: !!row.has_password,
        passwordSetAt: row.password_set_at ?? undefined,
        registrationMethod: row.registration_method ?? undefined,
    };
}

/**
 * Get extended data for a user
 * @param {string} handle User handle
 * @returns {UserExtendedData|null}
 */
export function getUserMeta(handle) {
    const db = getDb();
    const row = /** @type {UserMetadataRow|undefined} */ (
        db.prepare('SELECT * FROM user_metadata WHERE handle = ?').get(handle)
    );
    return rowToData(row);
}

/**
 * Set extended data for a user (merge with existing)
 * @param {string} handle User handle
 * @param {Partial<UserExtendedData>} data Data to merge
 */
export function setUserMeta(handle, data) {
    const db = getDb();

    const stmt = db.prepare(`
        INSERT INTO user_metadata (
            handle, email, oauth_provider, oauth_user_id, avatar,
            storage_limit_mib, storage_last_checkin_date, expires_at,
            created_at, last_login_at, invite_code_used,
            has_password, password_set_at, registration_method,
            updated_at_ts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(handle) DO UPDATE SET
            email = COALESCE(?, email),
            oauth_provider = COALESCE(?, oauth_provider),
            oauth_user_id = COALESCE(?, oauth_user_id),
            avatar = COALESCE(?, avatar),
            storage_limit_mib = COALESCE(?, storage_limit_mib),
            storage_last_checkin_date = COALESCE(?, storage_last_checkin_date),
            expires_at = COALESCE(?, expires_at),
            created_at = COALESCE(?, created_at),
            last_login_at = COALESCE(?, last_login_at),
            invite_code_used = COALESCE(?, invite_code_used),
            has_password = COALESCE(?, has_password),
            password_set_at = COALESCE(?, password_set_at),
            registration_method = COALESCE(?, registration_method),
            updated_at_ts = datetime('now')
    `);

    const hasPasswordInt = data.hasPassword !== undefined ? (data.hasPassword ? 1 : 0) : undefined;

    stmt.run(
        handle,
        data.email,
        data.oauthProvider,
        data.oauthUserId,
        data.avatar,
        data.storageLimitMiB,
        data.storageLastCheckInDate,
        data.expiresAt,
        data.createdAt,
        data.lastLoginAt,
        data.inviteCodeUsed,
        hasPasswordInt,
        data.passwordSetAt,
        data.registrationMethod,
        data.email,
        data.oauthProvider,
        data.oauthUserId,
        data.avatar,
        data.storageLimitMiB,
        data.storageLastCheckInDate,
        data.expiresAt,
        data.createdAt,
        data.lastLoginAt,
        data.inviteCodeUsed,
        hasPasswordInt,
        data.passwordSetAt,
        data.registrationMethod,
    );
}

/**
 * Delete extended data for a user
 * @param {string} handle
 */
export function deleteUserMeta(handle) {
    const db = getDb();
    db.prepare('DELETE FROM user_metadata WHERE handle = ?').run(handle);
}

/**
 * Get all user metadata entries
 * @returns {Record<string, UserExtendedData>}
 */
export function getAllUserMeta() {
    const db = getDb();
    const rows = /** @type {UserMetadataRow[]} */ (
        db.prepare('SELECT * FROM user_metadata').all()
    );

    /** @type {Record<string, UserExtendedData>} */
    const result = {};
    for (const row of rows) {
        const data = rowToData(row);
        if (data) {
            result[row.handle] = data;
        }
    }
    return result;
}

/**
 * Check if a user account has expired
 * @param {string} handle
 * @returns {boolean}
 */
export function isUserExpired(handle) {
    const meta = getUserMeta(handle);
    if (!meta || !meta.expiresAt) return false;
    if (meta.expiresAt === 0) return false; // permanent
    return Date.now() > meta.expiresAt;
}

/**
 * Find user handle by OAuth provider and user ID
 * @param {string} provider
 * @param {string} oauthUserId
 * @returns {string|null} handle or null
 */
export function findUserByOAuth(provider, oauthUserId) {
    const db = getDb();
    const row = /** @type {UserMetadataHandleRow|undefined} */ (
        db.prepare(`
        SELECT handle FROM user_metadata
        WHERE oauth_provider = ? AND oauth_user_id = ?
    `).get(provider, String(oauthUserId))
    );

    return row ? row.handle : null;
}

/**
 * Find user handle by email
 * @param {string} email
 * @returns {string|null} handle or null
 */
export function findUserByEmail(email) {
    if (!email) return null;

    const db = getDb();
    const row = /** @type {UserMetadataHandleRow|undefined} */ (
        db.prepare(`
        SELECT handle FROM user_metadata
        WHERE LOWER(email) = LOWER(?)
    `).get(email)
    );

    return row ? row.handle : null;
}

/**
 * Update user's last login timestamp
 * @param {string} handle
 */
export function recordLogin(handle) {
    setUserMeta(handle, { lastLoginAt: Date.now() });
}

/**
 * Extend user expiration by a duration in milliseconds.
 * Pass durationMs = 0 to set the account as permanent (expiresAt = 0).
 * @param {string} handle
 * @param {number} durationMs  0 means permanent
 */
export function extendExpiration(handle, durationMs) {
    if (durationMs === 0) {
        setUserMeta(handle, { expiresAt: 0 });
        return;
    }
    const meta = getUserMeta(handle) || {};
    const now = Date.now();
    const currentExpiry = meta.expiresAt ?? now;
    const base = (currentExpiry !== 0 && currentExpiry > now) ? currentExpiry : now;
    setUserMeta(handle, { expiresAt: base + durationMs });
}

/**
 * Invalidate the in-memory cache (for testing or force-reload)
 * Note: SQLite doesn't use in-memory cache, but keep this for API compatibility
 */
export function invalidateCache() {
    // No-op for SQLite, but keep for backward compatibility
}
