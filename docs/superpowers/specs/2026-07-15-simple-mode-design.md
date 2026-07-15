# P2 · 简单/进阶模式（抽屉分级）设计文档

> 日期：2026-07-15 · 状态：设计确认（自主推进），实现随后
> 大项目「登录后前端重构」子项目之一（P0 已完成并合并）。

## 目标

用一个「简单/进阶」开关做**渐进式披露**，把新手不需要的高级抽屉在简单模式下收起，解决痛点②（顶部抽屉太多太杂）。**不删除任何功能**，一键切回进阶即恢复。面向「新手为主、保留高级用户完整能力」的定位。

- ✅ 做：顶部抽屉分级 + 一个显眼的模式开关 + 记忆偏好。
- ❌ 不做：删除功能；深度改造单个面板内部（留作后续细化）；改 `index.html`；改任何功能逻辑。

## 架构与交付

新增第三方扩展 `public/scripts/extensions/third-party/stc-simple-mode/`，与 `stc-admin-panel` 同一机制：`disabledExtensions` 默认为空 → 扩展对所有用户（新老皆是）**自动加载**。纯前端、叠加式、上游可合并。复用 P0 的 `--stc-*` token（带回退值，主题非暖色时也可用）。

**文件：**
- `manifest.json` — 注册（`js`/`css`）。
- `index.js` — 注入模式开关、切换 `body.stc-simple` class、localStorage 记忆。
- `style.css` — `body.stc-simple` 下隐藏高级抽屉 + 开关样式。

## 机制

- `body` 上加/去 `stc-simple` class 控制简单模式。
- 偏好存 `localStorage['stc_ui_mode']`，值 `'simple'` | `'advanced'`。
- **默认**：无记忆值时 → `'simple'`（新手优先；老用户切一次即记住）。
- 开关：一个紧凑的胶囊控件「🌱 简单 / ⚙️ 进阶」，注入到顶部 `#top-settings-holder` 内，随抽屉图标一行显示，点按切换并即时更新标签。

## 简单模式下隐藏的高级抽屉（仅隐藏，不移除）

| 抽屉 id | 名称 | 简单模式 |
|---|---|---|
| `#ai-config-button` | AI 采样配置 | 隐藏 |
| `#advanced-formatting-button` | 格式化 | 隐藏 |
| `#WI-SP-button` | 世界书 | 隐藏 |
| `#extensions-settings-button` | 扩展 | 隐藏 |
| `#sys-settings-button` | API 连接 | 保留 |
| `#user-settings-button` | 用户设置 | 保留 |
| `#backgrounds-button` | 背景 | 保留 |
| `#persona-management-button` | 人物角色 | 保留 |
| `#rightNavHolder` | 角色管理 | 保留 |

理由：新手需要连接 API、选角色/人格、聊天、调基础界面；采样器/格式化/世界书/扩展是进阶项。

## 关键 CSS（要点）

```css
body.stc-simple #ai-config-button,
body.stc-simple #advanced-formatting-button,
body.stc-simple #WI-SP-button,
body.stc-simple #extensions-settings-button { display: none !important; }

#stc-mode-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 12px; margin: 0 6px; cursor: pointer;
  border-radius: 999px;
  background: var(--stc-surface-2, rgba(255,255,255,.08));
  color: var(--stc-text, inherit);
  border: 1px solid var(--stc-border, rgba(255,255,255,.15));
  font-size: .82em; font-weight: 600; white-space: nowrap;
  transition: background .15s, border-color .15s;
}
#stc-mode-toggle:hover { border-color: var(--stc-accent, #888); }
```

## 护栏 / 风险

- 抽屉 id 是长期稳定的官方选择器；若上游改名，隐藏规则只是失效（抽屉重新出现），不破坏功能。
- 开关注入需等 `#top-settings-holder` 存在——扩展在 app 初始化后加载，通常已存在；若不存在则轮询短等或监听。
- 只前端隐藏，服务端/功能不受影响；进阶模式完全恢复。
- 复用 `--stc-*` 带回退，任何主题下开关都可见可读。

## 验证

1. 真机启动 → 新用户默认**简单模式**：顶部只剩保留抽屉，采样/格式化/世界书/扩展消失。
2. 点开关切「进阶」→ 四个高级抽屉恢复，偏好刷新后仍保持。
3. 切回「简单」→ 再次隐藏。
4. 截图核对开关在暖色主题下可见、样式协调。

## 后续

单个面板内部的密集分级（痛点③）留作后续细化。P1（落地首页/引导）、P3（账户面板）随后。
