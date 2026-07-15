# P1 · 新手引导浮层设计文档

> 日期：2026-07-15 · 状态：设计确认（自主推进），实现随后
> 大项目「登录后前端重构」子项目（P0 主题、P2 简单模式 已完成）。

## 目标

解决痛点①「一登录就懵，不知道从哪开始」：登录后给新用户一张**温暖、可关闭的引导卡片**，用三步把人领到「开始第一次对话」。非阻塞（不遮屏），只出现一次。

- ✅ 做：一次性引导卡 + 三个动作按钮（打开对应抽屉/开始聊天）。
- ❌ 不做：改 ST 首页 DOM；阻塞式全屏 modal（会和 ST 自带 persona 弹窗打架）；改任何功能逻辑；改 index.html。

## 架构与交付

新增第三方扩展 `public/scripts/extensions/third-party/stc-onboarding/`（manifest + index.js + style.css），与 stc-admin-panel/stc-simple-mode 同机制自动加载。复用 P0 `--stc-*` token（带回退）。纯前端叠加。

## 行为

- 加载后延迟约 1.8s（等 app 稳定、避开自带弹窗）再检查。
- 若 `localStorage['stc_onboarded'] !== '1'` → 显示引导卡；否则不显示。
- 卡片为**固定定位、底部居中、非阻塞**（不加全屏遮罩），`z-index` 高于常规内容但不拦截其它操作。
- 关闭方式（任一都算「看过」，写入 `localStorage['stc_onboarded']='1'` 后不再出现）：右上 ×、「开始聊天」、「不再显示」、Esc。

## 卡片内容

- 标题：`👋 欢迎来到 SillyTavern`
- 副标题：`三步开始你的第一次对话`
- 三个动作按钮：
  1. `① 连接模型` → `document.querySelector('#API-status-top')?.click()`（打开 API 连接抽屉）
  2. `② 挑个角色` → `document.querySelector('#rightNavDrawerIcon')?.click()`（打开角色管理）
  3. `③ 开始聊天` → 关闭卡片（写 flag）
- 底部：`不再显示`（写 flag 并关闭）+ 右上角 `×`。

## 样式（要点）

温暖卡片，复用 token 带回退：

```css
#stc-onboarding-card {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
  z-index: 4000; width: min(92vw, 460px);
  background: var(--stc-surface, #fff); color: var(--stc-text, #333);
  border: 1px solid var(--stc-border, rgba(0,0,0,.12));
  border-radius: var(--stc-radius-lg, 20px);
  box-shadow: 0 16px 44px rgba(0,0,0,.18);
  padding: 20px 22px; animation: stcOnbUp .4s cubic-bezier(.22,1,.36,1) both;
}
@keyframes stcOnbUp { from{opacity:0;transform:translate(-50%,16px)} to{opacity:1;transform:translate(-50%,0)} }
.stc-onb-btn {
  background: var(--stc-accent-soft, rgba(0,0,0,.05)); color: var(--stc-text, #333);
  border: 1px solid var(--stc-border, rgba(0,0,0,.12)); border-radius: var(--stc-radius, 14px);
  padding: 10px 14px; cursor: pointer; font: inherit; text-align: left;
}
.stc-onb-btn:hover { border-color: var(--stc-accent, #888); }
```

按钮用真正的 `<button type="button">`（键盘可达）；卡片 `role="dialog" aria-label`；`:focus-visible` 有可见描边。

## 护栏 / 风险

- 选择器 `#API-status-top` / `#rightNavDrawerIcon` 为稳定官方 id；若上游改名，按钮点击无效但不报错（用可选链）。
- 非阻塞、可关闭、只出现一次 → 对老用户几乎无打扰（老用户浏览器无 flag 会看到一次，可立即关闭）。
- 不与 ST 自带 persona 弹窗争抢焦点（非 modal、延迟出现）。

## 验证

1. 真机新用户登录 → ~1.2s 后底部出现温暖引导卡；暖色主题下样式协调、按钮可读。
2. 点「① 连接模型」→ API 抽屉打开；点「② 挑个角色」→ 角色面板打开。
3. 点「开始聊天」/「不再显示」/×/Esc → 卡片消失且写入 flag；刷新后不再出现。
4. 截图核对。

## 后续

持久化「温暖首页」（继续上次对话/我的角色 等）留作后续。P3（账户/管理面板）随后。
