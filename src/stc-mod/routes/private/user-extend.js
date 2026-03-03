/**
 * SillyTavernchat Module - Extended User Endpoints
 * Renew, profile, heartbeat, storage info, check-in
 */
import express from 'express';
import { promises as fsPromises } from 'fs';
import storage from 'node-persist';
import { getUserMeta, setUserMeta, getAllUserMeta, isUserExpired, deleteUserMeta } from '../../user-metadata.js';
import * as invitationService from '../../services/invitation-codes.js';
import { getUserStorageInfo, dailyCheckIn, canUserWrite, useStorageCode, calculateUserStorage } from '../../services/storage-quota.js';
import { requireAdminMiddleware, getAllUserHandles, toKey, getUserDirectories } from '../../../users.js';
import { getStcConfig } from '../../config.js';

export const router = express.Router();

// Get extended user info (current user)
router.get('/me-ext', (req, res) => {
    const handle = req.user?.profile?.handle;
    if (!handle) return res.status(401).json({ error: 'Not authenticated' });
    const meta = getUserMeta(handle) || {};
    const storage = getUserStorageInfo(handle);
    res.json({
        handle,
        email: meta.email,
        oauthProvider: meta.oauthProvider,
        expiresAt: meta.expiresAt,
        createdAt: meta.createdAt,
        lastLoginAt: meta.lastLoginAt,
        storage,
    });
});

// Renew logged-in user with invite code
router.post('/renew', (req, res) => {
    try {
        const { inviteCode } = req.body;
        const handle = req.user?.profile?.handle;
        if (!handle) return res.status(401).json({ error: 'Not authenticated' });
        if (!inviteCode) return res.status(400).json({ error: '缺少邀请码' });

        if (!invitationService.isEnabled()) {
            return res.status(400).json({ error: '邀请码系统未启用' });
        }

        const validation = invitationService.validateInvitationCode(inviteCode);
        if (!validation.valid) return res.status(400).json({ error: validation.reason });

        const useResult = invitationService.useInvitationCode(inviteCode, handle);
        if (!useResult.success) return res.status(400).json({ error: '邀请码使用失败' });

        setUserMeta(handle, { expiresAt: useResult.expiresAt || 0 });
        res.json({ success: true, expiresAt: useResult.expiresAt });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Heartbeat
router.post('/heartbeat', (req, res) => {
    const handle = req.user?.profile?.handle;
    if (handle) setUserMeta(handle, { lastLoginAt: Date.now() });
    res.sendStatus(204);
});

// Storage info
router.get('/storage', (req, res) => {
    const handle = req.user?.profile?.handle;
    if (!handle) return res.status(401).json({ error: 'Not authenticated' });
    res.json(getUserStorageInfo(handle));
});

// Check if can write
router.get('/can-write', (req, res) => {
    const handle = req.user?.profile?.handle;
    if (!handle) return res.status(401).json({ error: 'Not authenticated' });
    res.json({ canWrite: canUserWrite(handle) });
});

// Daily check-in
router.post('/check-in', (req, res) => {
    const handle = req.user?.profile?.handle;
    if (!handle) return res.status(401).json({ error: 'Not authenticated' });
    const result = dailyCheckIn(handle);
    res.json(result);
});

// Use storage expansion code
router.post('/use-storage-code', (req, res) => {
    const handle = req.user?.profile?.handle;
    if (!handle) return res.status(401).json({ error: 'Not authenticated' });
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: '缺少激活码' });
    res.json(useStorageCode(code, handle));
});

// Admin: get all extended user metadata
router.get('/all-meta', requireAdminMiddleware, (req, res) => {
    res.json(getAllUserMeta());
});

// Admin: get users with expiration info
router.get('/expiration-list', requireAdminMiddleware, async (req, res) => {
    try {
        const allMeta = getAllUserMeta();
        const handles = await getAllUserHandles();
        const result = handles.map(h => ({
            handle: h,
            expired: isUserExpired(h),
            ...(allMeta[h] || {}),
        }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: delete inactive users (optional email notification before deletion)
router.post('/delete-inactive', requireAdminMiddleware, async (req, res) => {
    try {
        const { maxInactiveDays, minStorageMB, dryRun, sendEmailNotice } = req.body;
        const allMeta = getAllUserMeta();
        const now = Date.now();
        const threshold = (maxInactiveDays || 30) * 24 * 60 * 60 * 1000;
        // minStorageMB: only users whose storage < this value are considered inactive candidates
        // 0 or undefined means no storage filter (all inactive users qualify)
        const minStorageBytes = (minStorageMB > 0) ? minStorageMB * 1024 * 1024 : 0;
        const candidates = [];

        for (const [handle, meta] of Object.entries(allMeta)) {
            if (handle === 'default-user') continue;
            const lastActive = meta.lastLoginAt || meta.createdAt || 0;
            if (now - lastActive > threshold) {
                // Skip users with significant data (storage >= minStorageMB)
                if (minStorageBytes > 0) {
                    const usedBytes = calculateUserStorage(handle);
                    if (usedBytes >= minStorageBytes) continue;
                    const daysInactive = Math.floor((now - lastActive) / 86400000);
                    const usedMiB = Math.round(usedBytes / 1024 / 1024 * 100) / 100;
                    candidates.push({ handle, lastLoginAt: meta.lastLoginAt, email: meta.email, daysInactive, usedMiB });
                } else {
                    const daysInactive = Math.floor((now - lastActive) / 86400000);
                    candidates.push({ handle, lastLoginAt: meta.lastLoginAt, email: meta.email, daysInactive });
                }
            }
        }

        if (dryRun) {
            return res.json({ candidates, count: candidates.length });
        }

        // Send email notifications if requested
        /** @type {{ sent: number, skipped: number, errors: Array<{handle:string,error:string}> }} */
        const emailResults = { sent: 0, skipped: 0, errors: [] };
        if (sendEmailNotice) {
            try {
                const { sendEmail } = await import('../../services/email-service.js');
                for (const c of candidates) {
                    if (c.email) {
                        try {
                            await sendEmail(
                                c.email,
                                '您的账号已被清理',
                                '',
                                `<div style="font-family:sans-serif;max-width:500px;margin:0 auto">
                                    <h3 style="color:#e74c3c">账号清理通知</h3>
                                    <p>您好，您的账号 <strong>${c.handle}</strong> 已 <strong>${c.daysInactive} 天</strong>未登录。</p>
                                    <p>根据系统维护政策，该账号的数据已被清理。</p>
                                    <p>如有疑问请联系管理员。</p>
                                </div>`,
                            );
                            emailResults.sent++;
                        } catch (e) {
                            emailResults.errors.push({ handle: c.handle, error: e.message });
                        }
                    } else {
                        emailResults.skipped++;
                    }
                }
            } catch (e) {
                emailResults.errors.push({ handle: 'email-service', error: e.message });
            }
        }

        // Fully purge each user: SillyTavern registry + data directory + STC metadata
        /** @type {Array<{handle:string,error:string}>} */
        const purgeErrors = [];
        for (const c of candidates) {
            try {
                // 1. Remove from SillyTavern user registry (node-persist)
                await storage.removeItem(toKey(c.handle));
                // 2. Delete user data directory (chats, characters, backups, etc.)
                const dirs = getUserDirectories(c.handle);
                await fsPromises.rm(dirs.root, { recursive: true, force: true });
            } catch (e) {
                purgeErrors.push({ handle: c.handle, error: e.message });
            }
            // 3. Remove STC extended metadata
            deleteUserMeta(c.handle);
        }

        res.json({ deleted: candidates.length, handles: candidates.map(c => c.handle), emailResults, purgeErrors });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: send warning emails to inactive users (without deleting)
router.post('/warn-inactive', requireAdminMiddleware, async (req, res) => {
    try {
        const { maxInactiveDays, minStorageMB } = req.body;
        const allMeta = getAllUserMeta();
        const now = Date.now();
        const threshold = (maxInactiveDays || 30) * 24 * 60 * 60 * 1000;
        const minStorageBytes = (minStorageMB > 0) ? minStorageMB * 1024 * 1024 : 0;
        const { sendEmail } = await import('../../services/email-service.js');

        let sent = 0, skipped = 0;
        /** @type {Array<{handle:string,error:string}>} */
        const errors = [];

        for (const [handle, meta] of Object.entries(allMeta)) {
            if (handle === 'default-user') continue;
            const lastActive = meta.lastLoginAt || meta.createdAt || 0;
            if (now - lastActive > threshold) {
                // Skip users with significant data
                if (minStorageBytes > 0 && calculateUserStorage(handle) >= minStorageBytes) continue;
                if (meta.email) {
                    const daysInactive = Math.floor((now - lastActive) / 86400000);
                    try {
                        await sendEmail(
                            meta.email,
                            '账号长期未登录提醒',
                            '',
                            `<div style="font-family:sans-serif;max-width:500px;margin:0 auto">
                                <h3 style="color:#f39c12">账号活跃提醒</h3>
                                <p>您好，您的账号 <strong>${handle}</strong> 已 <strong>${daysInactive} 天</strong>未登录。</p>
                                <p>为避免账号数据被系统清理，请尽快登录您的账号。</p>
                            </div>`,
                        );
                        sent++;
                    } catch (e) {
                        errors.push({ handle, error: e.message });
                    }
                } else {
                    skipped++;
                }
            }
        }

        res.json({ success: true, sent, skipped, errors });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
