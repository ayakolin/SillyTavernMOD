# P4 · 外观/主题选择器设计文档

> 日期：2026-07-16 · 大项目「登录后前端重构」的追加子项目（P0 主题、P2 简单模式、P1 引导、P3 账户面板 已上线）。

## 背景

SillyTavern 有主题下拉（`#themes` select），但深埋在密集的「用户设置」抽屉里，新手根本找不到——用户反馈「主题设置似乎没有界面」。需要一个**显眼、友好**的外观切换入口，尤其方便在暖阳拿铁（浅）/ 暖夜可可（深）之间切换。

## 目标

加一个可发现的「🎨 外观」入口，点开是温暖的主题选择面板：两个暖色主题作为**特色浅/深卡片**置顶，其余主题列在「更多主题」下。选择即应用并持久化。

- ✅ 做：显眼入口 + 温暖选择面板 + 一键切换（复用官方 `#themes` change 机制）。
- ❌ 不做：改官方主题系统/DOM；改 `index.html`；重复造主题存储。

## 架构与交付

新增第三方扩展 `public/scripts/extensions/third-party/stc-appearance/`（manifest + index.js + style.css），与其它 stc-* 扩展同机制自动加载。复用 P0 `--stc-*` token（带回退）。

## 机制（复用官方，零侵入）

切换主题 = 驱动官方下拉：
```js
const sel = document.getElementById('themes');
sel.value = themeName;
sel.dispatchEvent(new Event('change', { bubbles: true }));
```
官方 change 处理器（`power-user.js:3508`）会 `applyTheme()`（应用颜色 + 主题 custom_css → 我们的 --stc-* token）并 `saveSettingsDebounced()` 持久化。**我们不自己存主题**，完全走官方链路。

读取可选主题：从 `#themes` 的 `<option>` 列举（用户已有的全部主题）；当前主题 = `sel.value`。

## UI

**入口**：一个 `<button id="stc-appearance-btn" class="…">🎨 外观</button>` 胶囊，注入到 `#top-settings-holder`（与 P2「简单/进阶」pill 同排、风格一致）。等 `#top-settings-holder` 存在再注入（轮询短等，永不抛错）。

**面板**：点击打开一个固定定位、非阻塞的温暖卡片 `#stc-appearance-panel`：
- 标题「外观」。
- **特色行**：两张卡片
  - 「☀️ 暖阳拿铁 · 浅色」
  - 「🌙 暖夜可可 · 深色」
  当前主题的卡片高亮（描边 `--stc-accent`）。点击即切换。
  （若某特色主题不在 `#themes` 选项里则不渲染该卡，避免死链。）
- **「更多主题」**：可展开列表，列出其余 `#themes` 选项（排除两个暖色），点击即切换，当前项高亮。
- 关闭：× / 点击面板外 / Esc。

**样式**：卡片/按钮复用 `var(--stc-surface / --stc-surface-2 / --stc-text / --stc-accent / --stc-border / --stc-radius, 回退)`；真正的 `<button>`（键盘可达）、`:focus-visible` 可见描边、非阻塞（无全屏遮罩）。

## 护栏 / 风险

- 选择器 `#themes` 是官方稳定 id；缺失时按钮无操作但不报错（可选链 + 守卫）。
- 完全复用官方 change 链路 → 与官方主题系统一致，切换即持久化，刷新保留。
- 非阻塞、可关闭；不与官方弹窗争焦点。
- 老用户可用它一键切到暖色；新用户默认已是暖阳拿铁。

## 验证

1. 真机：顶栏出现「🎨 外观」pill；点开面板温暖、可读。
2. 点「暖夜可可」→ 界面切深色暖主题（含 --stc-* 深色 token 生效）；点「暖阳拿铁」→ 切回浅色。刷新后保持。
3. 「更多主题」列出其余主题，点击可切换。
4. 当前主题高亮正确；× / Esc / 外部点击可关。
5. 截图核对。
