/**
 * STC-MOD Database Service
 * SQLite database connection and initialization
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getStcDataDir } from '../config.js';

let db = null;

/**
 * Get or create SQLite database instance
 * @returns {Database.Database}
 */
export function getDb() {
    if (db) return db;

    const dbPath = path.join(getStcDataDir(), 'stc-mod.db');

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(dbPath);

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    console.log(`[STC-MOD] SQLite database connected: ${dbPath}`);

    return db;
}

/**
 * Initialize database tables
 */
export function initDatabase() {
    const db = getDb();

    // Create user_metadata table
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_metadata (
            handle TEXT PRIMARY KEY,
            email TEXT,
            oauth_provider TEXT,
            oauth_user_id TEXT,
            avatar TEXT,
            storage_limit_mib INTEGER,
            storage_last_checkin_date TEXT,
            expires_at INTEGER,
            created_at INTEGER,
            last_login_at INTEGER,
            invite_code_used TEXT,
            has_password INTEGER DEFAULT 0,
            password_set_at INTEGER,
            registration_method TEXT,
            created_at_ts TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at_ts TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create index for common queries
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_oauth_provider_user_id 
        ON user_metadata(oauth_provider, oauth_user_id)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_email 
        ON user_metadata(email)
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_expires_at 
        ON user_metadata(expires_at)
    `);

    console.log('[STC-MOD] SQLite database tables initialized');
}

/**
 * Close database connection (for graceful shutdown)
 */
export function closeDb() {
    if (db) {
        db.close();
        db = null;
        console.log('[STC-MOD] SQLite database connection closed');
    }
}

/**
 * Run a database query in a transaction
 * @param {(...params: any[]) => unknown} fn - Function to execute in transaction
 * @returns {unknown} Result of the function
 */
export function runInTransaction(fn) {
    const db = getDb();
    const transaction = db.transaction(/** @type {(...params: any[]) => unknown} */ (fn));
    return transaction();
}
