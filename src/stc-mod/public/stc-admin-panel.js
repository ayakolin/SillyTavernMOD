/**
 * SillyTavernchat Module - Admin Panel Frontend Extension
 * Injected via <script> tag in the main page to add STC management UI.
 * Self-contained, no build step required.
 */
(function() {
    'use strict';

    let isAdmin = false;
    let stcConfig = {};

    async function init() {
        try {
            const meResp = await fetch('/api/stc/users/me-ext');
            if (!meResp.ok) return;
            const me = await meResp.json();

            // Check admin status via official API
            const profileResp = await fetch('/api/users/me');
            if (profileResp.ok) {
                const profile = await profileResp.json();
                isAdmin = !!profile.admin;
            }

            injectUserInfo(me);

            if (isAdmin) {
                injectAdminButton();
            }

            // Heartbeat every 5 minutes
            setInterval(() => {
                fetch('/api/stc/users/heartbeat', { method: 'POST' }).catch(() => {});
            }, 5 * 60 * 1000);

        } catch (e) {
            console.debug('[STC-MOD] Panel init skipped:', e.message);
        }
    }

    function injectUserInfo(me) {
        const infoDiv = document.createElement('div');
        infoDiv.id = 'stc-user-info';
        infoDiv.style.cssText = 'position:fixed;bottom:10px;right:10px;background:rgba(22,33,62,0.95);color:#ddd;padding:8px 12px;border-radius:8px;font-size:12px;z-index:9999;max-width:200px;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;';

        let info = `<div style="font-weight:600">${me.handle}</div>`;

        if (me.expiresAt && me.expiresAt > 0) {
            const exp = new Date(me.expiresAt);
            const remaining = me.expiresAt - Date.now();
            const days = Math.ceil(remaining / 86400000);
            const color = days <= 3 ? '#e74c3c' : days <= 7 ? '#f39c12' : '#2ecc71';
            info += `<div style="color:${color}">到期: ${exp.toLocaleDateString('zh-CN')} (${days}天)</div>`;
        }

        if (me.storage?.enabled) {
            const pct = me.storage.percent;
            const color = pct >= 90 ? '#e74c3c' : pct >= 70 ? '#f39c12' : '#2ecc71';
            info += `<div>存储: <span style="color:${color}">${me.storage.usedMiB}/${me.storage.limitMiB} MiB</span></div>`;
        }

        infoDiv.innerHTML = info;
        infoDiv.title = '点击查看详情';
        infoDiv.addEventListener('click', () => showUserPanel(me));
        document.body.appendChild(infoDiv);
    }

    function showUserPanel(me) {
        const existing = document.getElementById('stc-panel-overlay');
        if (existing) { existing.remove(); return; }

        const overlay = document.createElement('div');
        overlay.id = 'stc-panel-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;';
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        const panel = document.createElement('div');
        panel.style.cssText = 'background:#16213e;border-radius:12px;padding:30px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;color:#eee;font-family:sans-serif;';

        let html = `<h2 style="margin:0 0 15px;font-size:1.3em;">用户信息</h2>`;
        html += `<div style="margin-bottom:10px"><strong>用户名:</strong> ${me.handle}</div>`;
        if (me.email) html += `<div style="margin-bottom:10px"><strong>邮箱:</strong> ${me.email}</div>`;
        if (me.oauthProvider) html += `<div style="margin-bottom:10px"><strong>登录方式:</strong> ${me.oauthProvider}</div>`;
        if (me.createdAt) html += `<div style="margin-bottom:10px"><strong>注册时间:</strong> ${new Date(me.createdAt).toLocaleString('zh-CN')}</div>`;

        if (me.expiresAt && me.expiresAt > 0) {
            const exp = new Date(me.expiresAt);
            const remaining = me.expiresAt - Date.now();
            const days = Math.ceil(remaining / 86400000);
            html += `<div style="margin-bottom:10px"><strong>到期时间:</strong> ${exp.toLocaleString('zh-CN')} (剩余 ${days} 天)</div>`;
            html += `<div style="margin-bottom:10px"><input id="stc-renew-code" placeholder="输入邀请码续费" style="padding:6px;border-radius:4px;border:1px solid #444;background:#0f3460;color:#eee;width:60%"> <button id="stc-renew-btn" style="padding:6px 12px;border:none;border-radius:4px;background:#4a90e2;color:#fff;cursor:pointer">续费</button></div>`;
        }

        if (me.storage?.enabled) {
            html += `<h3 style="margin:15px 0 10px;font-size:1.1em;">存储空间</h3>`;
            html += `<div style="margin-bottom:10px">${me.storage.usedMiB} / ${me.storage.limitMiB} MiB (${me.storage.percent}%)</div>`;
            html += `<div style="background:#333;border-radius:4px;height:8px;margin-bottom:10px"><div style="background:${me.storage.percent >= 90 ? '#e74c3c' : '#4a90e2'};height:100%;border-radius:4px;width:${Math.min(me.storage.percent, 100)}%"></div></div>`;
            if (me.storage.dailyCheckInMiB > 0) {
                html += `<button id="stc-checkin-btn" style="padding:6px 12px;border:none;border-radius:4px;background:#2ecc71;color:#fff;cursor:pointer;margin-right:8px">每日签到 (+${me.storage.dailyCheckInMiB} MiB)</button>`;
            }
            html += `<div style="margin-top:8px"><input id="stc-storage-code" placeholder="输入存储激活码" style="padding:6px;border-radius:4px;border:1px solid #444;background:#0f3460;color:#eee;width:60%"> <button id="stc-use-code-btn" style="padding:6px 12px;border:none;border-radius:4px;background:#4a90e2;color:#fff;cursor:pointer">激活</button></div>`;
        }

        html += `<div style="margin-top:20px;text-align:right"><button id="stc-close-panel" style="padding:6px 16px;border:none;border-radius:4px;background:#666;color:#fff;cursor:pointer">关闭</button></div>`;

        panel.innerHTML = html;
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        document.getElementById('stc-close-panel')?.addEventListener('click', () => overlay.remove());

        document.getElementById('stc-renew-btn')?.addEventListener('click', async () => {
            const code = document.getElementById('stc-renew-code')?.value;
            if (!code) return;
            const resp = await fetch('/api/stc/users/renew', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({inviteCode: code}) });
            const data = await resp.json();
            alert(data.success ? '续费成功！' : (data.error || '续费失败'));
            if (data.success) location.reload();
        });

        document.getElementById('stc-checkin-btn')?.addEventListener('click', async () => {
            const resp = await fetch('/api/stc/users/check-in', { method: 'POST' });
            const data = await resp.json();
            alert(data.success ? `签到成功！+${data.addedMiB} MiB` : (data.reason || '签到失败'));
            if (data.success) location.reload();
        });

        document.getElementById('stc-use-code-btn')?.addEventListener('click', async () => {
            const code = document.getElementById('stc-storage-code')?.value;
            if (!code) return;
            const resp = await fetch('/api/stc/users/use-storage-code', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({code}) });
            const data = await resp.json();
            alert(data.success ? `激活成功！+${data.addedMiB} MiB` : (data.reason || '激活失败'));
            if (data.success) location.reload();
        });
    }

    function injectAdminButton() {
        const btn = document.createElement('div');
        btn.id = 'stc-admin-btn';
        btn.innerHTML = '<i class="fa-solid fa-gear"></i>';
        btn.title = 'STC 管理面板';
        btn.style.cssText = 'position:fixed;bottom:50px;right:10px;background:#6c63ff;color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px;';
        btn.addEventListener('click', openAdminPanel);
        document.body.appendChild(btn);
    }

    async function openAdminPanel() {
        const existing = document.getElementById('stc-admin-overlay');
        if (existing) { existing.remove(); return; }

        const overlay = document.createElement('div');
        overlay.id = 'stc-admin-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10001;display:flex;align-items:center;justify-content:center;';
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

        const panel = document.createElement('div');
        panel.style.cssText = 'background:#16213e;border-radius:12px;padding:30px;max-width:700px;width:95%;max-height:85vh;overflow-y:auto;color:#eee;font-family:sans-serif;';

        let html = `<h2 style="margin:0 0 20px;font-size:1.4em;">STC 管理面板</h2>`;
        html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">`;

        const cards = [
            { icon: 'fa-ticket', title: '邀请码管理', desc: '创建、查看、删除邀请码', url: '/api/stc/invitation-codes/list' },
            { icon: 'fa-users', title: '用户管理', desc: '查看用户信息、过期状态', url: '/api/stc/users/expiration-list' },
            { icon: 'fa-envelope', title: '邮件配置', desc: 'SMTP 邮件服务设置', url: '/api/stc/email-config/config' },
            { icon: 'fa-key', title: 'OAuth 配置', desc: 'GitHub/Discord/Linux.do', url: '/api/stc/oauth-config/config' },
            { icon: 'fa-bullhorn', title: '公告管理', desc: '发布和管理公告', url: '/api/stc/announcements/list' },
            { icon: 'fa-chart-line', title: '系统监控', desc: 'CPU、内存、磁盘', url: '/api/stc/system-load/current' },
            { icon: 'fa-database', title: '存储管理', desc: '用户存储配额和激活码', url: '/api/stc/user-storage/config' },
            { icon: 'fa-copy', title: '默认模板', desc: '新用户默认配置', url: '/api/stc/default-config/template' },
            { icon: 'fa-broom', title: '清理任务', desc: '备份清理、存储分析', url: '/api/stc/scheduled-tasks/storage-analysis' },
        ];

        for (const card of cards) {
            html += `<div class="stc-admin-card" data-url="${card.url}" style="background:rgba(255,255,255,0.05);padding:15px;border-radius:8px;cursor:pointer;transition:all 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                <div style="font-size:1.5em;margin-bottom:8px"><i class="fa-solid ${card.icon}"></i></div>
                <div style="font-weight:600;margin-bottom:4px">${card.title}</div>
                <div style="font-size:0.8em;color:#888">${card.desc}</div>
            </div>`;
        }
        html += `</div>`;
        html += `<div id="stc-admin-detail" style="margin-top:20px;background:rgba(0,0,0,0.2);border-radius:8px;padding:15px;display:none;"><pre style="white-space:pre-wrap;word-break:break-all;color:#aaa;max-height:300px;overflow-y:auto;margin:0;font-size:12px;"></pre></div>`;
        html += `<div style="margin-top:15px;text-align:right"><button id="stc-close-admin" style="padding:8px 20px;border:none;border-radius:4px;background:#666;color:#fff;cursor:pointer">关闭</button></div>`;

        panel.innerHTML = html;
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        document.getElementById('stc-close-admin')?.addEventListener('click', () => overlay.remove());

        panel.querySelectorAll('.stc-admin-card').forEach(card => {
            card.addEventListener('click', async () => {
                const url = card.dataset.url;
                const detailDiv = document.getElementById('stc-admin-detail');
                const pre = detailDiv.querySelector('pre');
                detailDiv.style.display = '';
                pre.textContent = '加载中...';
                try {
                    const resp = await fetch(url);
                    const data = await resp.json();
                    pre.textContent = JSON.stringify(data, null, 2);
                } catch (e) {
                    pre.textContent = '加载失败: ' + e.message;
                }
            });
        });
    }

    // Wait for DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 1000);
    }
})();
