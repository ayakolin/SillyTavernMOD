# P3 · 账户/管理面板暖色化设计文档

> 日期：2026-07-15 · 状态：设计确认（自主推进），实现随后
> 大项目「登录后前端重构」子项目（P0 主题、P2 简单模式、P1 引导 已完成）。

## 目标

把 `stc-admin-panel` 扩展（悬浮「我的账户」用户卡片、悬浮启动按钮、账户/管理面板）从深蓝紫配色改成与 P0 一致的**温暖治愈**观感。直接解决用户反馈的「深色用户卡片」和整体割裂感。

- ✅ 做：配色**主题自适应**——用 `var(--stc-*, 原值)` 包裹硬编码深/紫色值。
- ❌ 不做：改任何功能逻辑/结构/DOM；改 index.html；改语义状态色（成功绿/错误红/警告）。

## 关键思路：主题自适应，对深色主题零回退风险

把每个硬编码深蓝/紫色包成 `var(--stc-TOKEN, 原深色值)`：
- 暖色主题（P0 默认，`--stc-*` 已由 P0 custom_css 定义）→ 面板变暖。
- 深色主题（无 `--stc-*`）→ 回退到原深蓝紫，面板保持原样。
两全其美，任何主题下都协调、可读。

## 交付

改两处（同一扩展目录）：
1. `public/scripts/extensions/third-party/stc-admin-panel/style.css` — 主要色值重映射。
2. `.../index.js` + `.../admin-panel.js` — 少量醒目内联渐变（启动按钮、头像）。

## style.css 色值重映射表

| 选择器 | 属性 | 原值 | 改为 |
|---|---|---|---|
| `#stc-user-info`（用户卡片） | background | `rgba(22,33,62,0.95)` | `var(--stc-surface-2, rgba(22,33,62,0.95))` |
| `#stc-user-info` | color | `#ddd` | `var(--stc-text, #ddd)` |
| `#stc-user-info` | border | `rgba(255,255,255,0.08)` | `var(--stc-border, rgba(255,255,255,0.08))` |
| `#stc-user-info:hover` | background | `rgba(22,33,62,1)` | `var(--stc-surface, rgba(22,33,62,1))` |
| `#stc-admin-btn`（启动按钮） | background | `#6c63ff` | `var(--stc-accent, #6c63ff)` |
| `#stc-admin-btn` | box-shadow rgba | `rgba(108,99,255,0.6)` | 保留（阴影，弱可见）|
| `#stc-admin-btn:hover` | background | `#5a52e0` | `var(--stc-accent-hover, #5a52e0)` |
| `#stc-nav-admin-btn` | color | `#8ab4f8` | `var(--stc-accent, #8ab4f8)` |
| `#stc-nav-admin-btn:hover` | color | `#6c63ff` | `var(--stc-accent-hover, #6c63ff)` |
| `#stc-nav-storage-btn` | color | `#4a90e2` | `var(--stc-accent, #4a90e2)` |
| `.stc-panel` | background | `#16213e` | `var(--stc-surface, #16213e)` |
| `.stc-panel` | color | `#eee` | `var(--stc-text, #eee)` |
| `.stc-admin-card` | background | `rgba(255,255,255,0.05)` | `var(--stc-surface-2, rgba(255,255,255,0.05))` |
| `.stc-admin-card:hover` | background | `rgba(255,255,255,0.1)` | `var(--stc-accent-soft, rgba(255,255,255,0.1))` |
| `.stc-tab-btn:hover` | background | `rgba(255,255,255,0.08)` | `var(--stc-accent-soft, rgba(255,255,255,0.08))` |
| `#stc-admin-modal table tr:hover` | background | `rgba(255,255,255,0.04)` | `var(--stc-accent-soft, rgba(255,255,255,0.04))` |
| `.stc-ann-item` | background | `rgba(255,255,255,0.04)` | `var(--stc-surface-2, rgba(255,255,255,0.04))` |
| `.stc-user-row:hover` | background | `rgba(255,255,255,0.06)` | `var(--stc-accent-soft, rgba(255,255,255,0.06))` |

> `.stc-panel-overlay` / `#stc-admin-modal` 的 `rgba(0,0,0,0.6)` 遮罩保留（任何主题都适用）。
> `.stc-tab-btn:hover` 的 `color:#ddd` → `var(--stc-text, #ddd)`。

## JS 内联渐变（醒目处，主题自适应）

把蓝紫渐变 `linear-gradient(135deg,#4a90e2,#6c63ff)` 改为
`linear-gradient(135deg, var(--stc-accent, #4a90e2), var(--stc-accent-hover, #6c63ff))`：
- `index.js` 约第 222 行（某按钮）
- `index.js` 约第 269 行（账户面板头像圆）

> 其余大量内联色值多为语义状态色或已用 `--SmartTheme*` 变量（P0 已暖化），本次不动，避免大面积改动 200KB JS。

## 护栏 / 风险

- 纯配色，主题自适应；深色主题下回退原样，零破坏。
- 不动功能/结构；语义状态色保留。
- `--stc-*` 由 P0 定义；未启用暖主题时走回退值。

## 验证

1. 真机（暖主题）→ 悬浮用户卡片、启动按钮、账户面板均变暖，与主界面协调；文字可读（对比达标）。
2. 打开管理面板/各标签页 → 背景、卡片、hover 均暖色、可读、无破版。
3. 截图核对用户卡片不再是深色。
