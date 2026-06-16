/**
 * SillyTavernchat Module - System Monitor Service
 * Provides CPU, memory, disk usage monitoring.
 *
 * Notes:
 * - Disk usage reflects the filesystem that holds the data root, not the whole
 *   machine. The admin UI should label it accordingly.
 * - History is persisted atomically (temp file + rename) and capped, so a crash
 *   or concurrent write cannot corrupt or lose the whole history file.
 */
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { getStcDataDir, getDataRoot } from '../config.js';

const HISTORY_FILE = 'system-monitor-history.json';
const MAX_HISTORY_POINTS = 288; // 24h at 5min intervals

let lastCpuInfo = null;

/**
 * Sample raw CPU idle/total tick counts.
 * @returns {{ idle:number, total:number }}
 */
function sampleCpu() {
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    for (const cpu of cpus) {
        for (const type in cpu.times) totalTick += cpu.times[type];
        totalIdle += cpu.times.idle;
    }
    return { idle: totalIdle / cpus.length, total: totalTick / cpus.length };
}

/**
 * CPU usage percentage based on the delta since the last sample.
 * Returns null when no baseline exists yet (so callers can omit the first point
 * instead of recording a misleading 0%).
 * @returns {number|null}
 */
function getCpuUsage() {
    const { idle, total } = sampleCpu();
    if (!lastCpuInfo) {
        lastCpuInfo = { idle, total };
        return null;
    }
    const idleDiff = idle - lastCpuInfo.idle;
    const totalDiff = total - lastCpuInfo.total;
    lastCpuInfo = { idle, total };
    return totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0;
}

/**
 * Establish the CPU baseline at startup so the first recorded snapshot has a
 * meaningful (non-zero-by-default) reading.
 */
function primeCpuBaseline() {
    if (!lastCpuInfo) lastCpuInfo = sampleCpu();
}

function getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    return {
        total: Math.round(total / 1024 / 1024),
        used: Math.round(used / 1024 / 1024),
        free: Math.round(free / 1024 / 1024),
        percent: Math.round((used / total) * 100),
    };
}

function getDiskUsage() {
    try {
        const dataRoot = getDataRoot();
        const stats = fs.statfsSync(dataRoot);
        const total = stats.blocks * stats.bsize;
        const free = stats.bfree * stats.bsize;
        const used = total - free;
        return {
            total: Math.round(total / 1024 / 1024 / 1024 * 100) / 100,
            used: Math.round(used / 1024 / 1024 / 1024 * 100) / 100,
            free: Math.round(free / 1024 / 1024 / 1024 * 100) / 100,
            percent: Math.round((used / total) * 100),
            scope: 'dataRoot',
        };
    } catch {
        return { total: 0, used: 0, free: 0, percent: 0, scope: 'dataRoot' };
    }
}

export function getSystemLoad() {
    const cpu = getCpuUsage();
    return {
        timestamp: Date.now(),
        cpu: cpu === null ? 0 : cpu,
        memory: getMemoryUsage(),
        disk: getDiskUsage(),
        uptime: Math.round(os.uptime()),
        loadAvg: os.loadavg(),
        platform: os.platform(),
        hostname: os.hostname(),
        nodeVersion: process.version,
    };
}

export function getHistoryPath() {
    return path.join(getStcDataDir(), HISTORY_FILE);
}

export function loadHistory() {
    const filePath = getHistoryPath();
    if (!fs.existsSync(filePath)) return [];
    try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // Corrupted history is non-critical; recover what we can from a backup.
        try {
            const backup = filePath + '.bak';
            if (fs.existsSync(backup)) {
                const parsed = JSON.parse(fs.readFileSync(backup, 'utf8'));
                return Array.isArray(parsed) ? parsed : [];
            }
        } catch { /* ignore */ }
        return [];
    }
}

/**
 * Atomically persist history (temp file + rename) with a single backup copy.
 * @param {any[]} history
 */
function saveHistory(history) {
    const filePath = getHistoryPath();
    const tmpPath = `${filePath}.${process.pid}.tmp`;
    try {
        fs.writeFileSync(tmpPath, JSON.stringify(history), 'utf8');
        if (fs.existsSync(filePath)) {
            try { fs.copyFileSync(filePath, filePath + '.bak'); } catch { /* best-effort */ }
        }
        fs.renameSync(tmpPath, filePath);
    } catch (e) {
        console.error('[STC-MOD] Failed to save monitor history:', e.message);
        try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
}

export function recordSnapshot() {
    const snapshot = getSystemLoad();
    const history = loadHistory();
    history.push(snapshot);
    while (history.length > MAX_HISTORY_POINTS) history.shift();
    saveHistory(history);
    return snapshot;
}

let monitorInterval = null;

export function startMonitoring(intervalMs = 300000) {
    if (monitorInterval) return;
    // Prime the CPU baseline so the first interval snapshot is accurate.
    primeCpuBaseline();
    recordSnapshot();
    monitorInterval = setInterval(recordSnapshot, intervalMs);
    monitorInterval.unref();
    console.log('[STC-MOD] System monitoring started');
}

export function stopMonitoring() {
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
    }
}
