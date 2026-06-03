/**
 * STC-MOD Data Migration Script
 * Migrate user-metadata.json to SQLite database
 */
import fs from 'fs';
import path from 'path';
import { getStcDataDir } from '../config.js';
import { getDb } from './database.js';

/**
 * Migrate user metadata from JSON to SQLite
 */
export function migrateJsonToSqlite() {
    const jsonPath = path.join(getStcDataDir(), 'user-metadata.json');

    // Check if JSON file exists
    if (!fs.existsSync(jsonPath)) {
        console.log('[STC-MOD] No user-metadata.json found, skipping migration');
        return { migrated: 0, skipped: 0 };
    }

    // Read JSON data
    let jsonData;
    try {
        jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {
        console.error('[STC-MOD] Failed to read user-metadata.json:', e.message);
        return { migrated: 0, skipped: 0, error: e.message };
    }

    const db = getDb();
    let migrated = 0;
    let skipped = 0;

    // Prepare insert statement
    const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO user_metadata (
            handle, email, oauth_provider, oauth_user_id, avatar,
            storage_limit_mib, storage_last_checkin_date, expires_at,
            created_at, last_login_at, invite_code_used,
            has_password, password_set_at, registration_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Migrate in transaction for performance
    const migrateAll = db.transaction(() => {
        for (const [handle, data] of Object.entries(jsonData)) {
            try {
                insertStmt.run(
                    handle,
                    data.email || null,
                    data.oauthProvider || null,
                    data.oauthUserId || null,
                    data.avatar || null,
                    data.storageLimitMiB || null,
                    data.storageLastCheckInDate || null,
                    data.expiresAt || null,
                    data.createdAt || null,
                    data.lastLoginAt || null,
                    data.inviteCodeUsed || null,
                    data.hasPassword ? 1 : 0,
                    data.passwordSetAt || null,
                    data.registrationMethod || null,
                );
                migrated++;
            } catch (e) {
                console.error(`[STC-MOD] Failed to migrate user ${handle}:`, e.message);
                skipped++;
            }
        }
    });

    migrateAll();

    console.log(`[STC-MOD] Migration completed: ${migrated} users migrated, ${skipped} skipped`);

    // Backup JSON file
    const backupPath = jsonPath + '.backup.' + Date.now();
    try {
        fs.copyFileSync(jsonPath, backupPath);
        console.log(`[STC-MOD] JSON backup saved to: ${backupPath}`);
    } catch (e) {
        console.error('[STC-MOD] Failed to backup JSON file:', e.message);
    }

    return { migrated, skipped, backupPath };
}

/**
 * Check if migration is needed
 * @returns {boolean}
 */
export function needsMigration() {
    const jsonPath = path.join(getStcDataDir(), 'user-metadata.json');

    // If JSON doesn't exist, no migration needed
    if (!fs.existsSync(jsonPath)) {
        return false;
    }

    const db = getDb();

    // Check if database has any data
    const row = /** @type {{ count: number }|undefined} */ (
        db.prepare('SELECT COUNT(*) as count FROM user_metadata').get()
    );

    // If database is empty but JSON exists, migration needed
    return (row?.count ?? 0) === 0;
}
