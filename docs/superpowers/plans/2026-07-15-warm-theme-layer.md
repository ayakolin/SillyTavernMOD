# P0 温暖主题层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为核心 SillyTavern App 交付一套温暖治愈的默认主题（浅色「暖阳拿铁」为默认、深色「暖夜可可」可切换），并沉淀 `--stc-*` 设计 token 供后续 P1–P3 复用。

**Architecture:** 纯 ST 原生主题交付——两个主题 JSON（`default/content/themes/`）+ 在 `default/content/index.json` 注册 + 修改新用户种子设置 `default/content/settings.json` 使新用户默认激活浅色主题。设计 token 以 `custom_css` 里的 `:root{--stc-*}` 输出。**不触碰 `public/index.html`，不改任何功能逻辑**。

**Tech Stack:** SillyTavern 主题系统（`--SmartTheme*` 变量 + 主题 JSON `custom_css` 字段）、Jest（ESM，`@jest/globals`）。

## Global Constraints

以下为整个子项目的硬约束，每个 Task 隐含遵守：

- **不修改 `public/index.html`**，不改任何 JS 功能逻辑；P0 只交付主题 JSON、内容索引、种子设置、测试、文档。
- **上游可合并**：`default/content/settings.json`、`default/content/index.json` 是上游文件，改动必须记入 `MODIFICATIONS.md` 以便升级复原。
- **只影响新用户**：默认主题只通过种子设置生效；**不覆盖老用户已有 `power_user.theme` 与自定义颜色**。
- **对比度守 WCAG AA**：正文/背景对比 ≥ 4.5:1。
- **不引入新字体 / 外链资源**：沿用本地 Noto Sans。
- **两套主题共用同一批 token 名**（`--stc-bg` `--stc-surface` `--stc-surface-2` `--stc-text` `--stc-text-muted` `--stc-accent` `--stc-accent-hover` `--stc-accent-soft` `--stc-border` `--stc-radius` `--stc-radius-sm` `--stc-radius-lg`），只换值。
- **主题命名**：浅色 `name` = `暖阳拿铁`，深色 `name` = `暖夜可可`；文件名用 ASCII（`warm-latte.json` / `warm-cocoa.json`）以避免跨平台文件名编码问题；`power_user.theme` 存 `name`。
- 主题 JSON 必须是**合法 JSON**；`custom_css` 用**单行字符串**（无换行）以规避转义问题。

---

## File Structure

| 文件 | 责任 | 动作 |
|---|---|---|
| `default/content/themes/warm-latte.json` | 浅色主题「暖阳拿铁」（默认）：全部 `--SmartTheme*` 映射字段 + `custom_css` token/润色 | Create |
| `default/content/themes/warm-cocoa.json` | 深色主题「暖夜可可」：同结构、深色值 | Create |
| `default/content/index.json` | 注册两个新主题，使其拷入每个用户主题列表 | Modify |
| `default/content/settings.json` | 新用户种子设置：`power_user.theme` + 颜色字段改为浅色暖值 | Modify |
| `tests/warm-theme.test.js` | Jest：JSON 合法性、必需字段、name 匹配、对比度、index 注册、种子默认 | Create |
| `MODIFICATIONS.md` | 记录 index.json / settings.json 的 STC 改动，供上游升级复原 | Modify |

**主题 JSON 字段清单**（与现有 `Cappuccino.json` 完全一致的 schema，34 字段）：
`name, blur_strength, main_text_color, italics_text_color, underline_text_color, quote_text_color, blur_tint_color, chat_tint_color, user_mes_blur_tint_color, bot_mes_blur_tint_color, shadow_color, shadow_width, border_color, font_scale, fast_ui_mode, waifuMode, avatar_style, chat_display, noShadows, chat_width, timer_enabled, timestamps_enabled, timestamp_model_icon, mesIDDisplay_enabled, hideChatAvatars_enabled, message_token_count_enabled, expand_message_actions, enableZenSliders, enableLabMode, hotswap_enabled, custom_css, bogus_folders, reduced_motion, compact_input_area`

---

## Task 1: 浅色主题「暖阳拿铁」+ 测试骨架

**Files:**
- Create: `tests/warm-theme.test.js`
- Create: `default/content/themes/warm-latte.json`

**Interfaces:**
- Produces: 主题文件 `warm-latte.json`，`name` = `暖阳拿铁`；测试文件导出的共享 helper `contrastRatio(fgRgba, bgRgba)` 与常量 `REQUIRED_THEME_KEYS`（后续 Task 复用同一测试文件、追加用例）。

- [ ] **Step 1: 写失败测试（创建 `tests/warm-theme.test.js`）**

```javascript
import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const readJson = (rel) => JSON.parse(readFileSync(root + rel, 'utf8'));

// 34-field theme schema (matches default/content/themes/Cappuccino.json)
export const REQUIRED_THEME_KEYS = [
    'name', 'blur_strength', 'main_text_color', 'italics_text_color',
    'underline_text_color', 'quote_text_color', 'blur_tint_color', 'chat_tint_color',
    'user_mes_blur_tint_color', 'bot_mes_blur_tint_color', 'shadow_color', 'shadow_width',
    'border_color', 'font_scale', 'fast_ui_mode', 'waifuMode', 'avatar_style',
    'chat_display', 'noShadows', 'chat_width', 'timer_enabled', 'timestamps_enabled',
    'timestamp_model_icon', 'mesIDDisplay_enabled', 'hideChatAvatars_enabled',
    'message_token_count_enabled', 'expand_message_actions', 'enableZenSliders',
    'enableLabMode', 'hotswap_enabled', 'custom_css', 'bogus_folders', 'reduced_motion',
    'compact_input_area',
];

// Parse "rgba(r, g, b, a)" or "#RRGGBB" -> [r,g,b]
function toRgb(s) {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
    const h = s.match(/^#([0-9a-f]{6})$/i);
    if (h) return [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16));
    throw new Error('bad color: ' + s);
}
function relLum([r, g, b]) {
    const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrastRatio(fg, bg) {
    const L1 = relLum(toRgb(fg));
    const L2 = relLum(toRgb(bg));
    const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
    return (hi + 0.05) / (lo + 0.05);
}

describe('warm-latte theme (暖阳拿铁)', () => {
    const t = readJson('default/content/themes/warm-latte.json');

    test('is valid JSON with all 34 required keys', () => {
        for (const k of REQUIRED_THEME_KEYS) expect(t).toHaveProperty(k);
    });
    test('name is 暖阳拿铁', () => {
        expect(t.name).toBe('暖阳拿铁');
    });
    test('main text on blur tint meets WCAG AA (>=4.5)', () => {
        expect(contrastRatio(t.main_text_color, t.blur_tint_color)).toBeGreaterThanOrEqual(4.5);
    });
    test('custom_css defines the shared --stc- token block', () => {
        for (const v of ['--stc-bg', '--stc-surface', '--stc-text', '--stc-accent', '--stc-border', '--stc-radius']) {
            expect(t.custom_css).toContain(v);
        }
    });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd tests && npm run test:unit -- warm-theme`
Expected: FAIL — 找不到 `default/content/themes/warm-latte.json`（ENOENT）。

- [ ] **Step 3: 创建 `default/content/themes/warm-latte.json`**

```json
{
    "name": "暖阳拿铁",
    "blur_strength": 6,
    "main_text_color": "rgba(74, 63, 53, 1)",
    "italics_text_color": "rgba(122, 104, 84, 1)",
    "underline_text_color": "rgba(198, 123, 69, 1)",
    "quote_text_color": "rgba(184, 92, 58, 1)",
    "blur_tint_color": "rgba(251, 244, 234, 0.9)",
    "chat_tint_color": "rgba(247, 239, 228, 0.5)",
    "user_mes_blur_tint_color": "rgba(251, 231, 214, 0.88)",
    "bot_mes_blur_tint_color": "rgba(255, 255, 255, 0.9)",
    "shadow_color": "rgba(120, 90, 60, 0.16)",
    "shadow_width": 2,
    "border_color": "rgba(235, 221, 203, 0.95)",
    "font_scale": 1,
    "fast_ui_mode": false,
    "waifuMode": false,
    "avatar_style": 0,
    "chat_display": 1,
    "noShadows": false,
    "chat_width": 50,
    "timer_enabled": false,
    "timestamps_enabled": true,
    "timestamp_model_icon": true,
    "mesIDDisplay_enabled": true,
    "hideChatAvatars_enabled": false,
    "message_token_count_enabled": false,
    "expand_message_actions": false,
    "enableZenSliders": false,
    "enableLabMode": false,
    "hotswap_enabled": true,
    "custom_css": ":root{--stc-bg:linear-gradient(160deg,#F7EFE4,#F1E3D2);--stc-surface:#FFFFFF;--stc-surface-2:#FBF4EA;--stc-text:#4A3F35;--stc-text-muted:#9B8B7A;--stc-accent:#E0895D;--stc-accent-hover:#D4784B;--stc-accent-soft:#FBE7D6;--stc-border:#EBDDCB;--stc-radius:14px;--stc-radius-sm:10px;--stc-radius-lg:20px;}.drawer-content{border-radius:var(--stc-radius-lg);}.mes{border-radius:var(--stc-radius);}#send_form,#send_textarea{border-radius:var(--stc-radius);}.menu_button{border-radius:var(--stc-radius-sm);}",
    "bogus_folders": true,
    "reduced_motion": false,
    "compact_input_area": false
}
```

> `custom_css` 为单行字符串（无换行），可读版：
> ```css
> :root{
>   --stc-bg:linear-gradient(160deg,#F7EFE4,#F1E3D2);
>   --stc-surface:#FFFFFF; --stc-surface-2:#FBF4EA;
>   --stc-text:#4A3F35; --stc-text-muted:#9B8B7A;
>   --stc-accent:#E0895D; --stc-accent-hover:#D4784B; --stc-accent-soft:#FBE7D6;
>   --stc-border:#EBDDCB;
>   --stc-radius:14px; --stc-radius-sm:10px; --stc-radius-lg:20px;
> }
> .drawer-content{border-radius:var(--stc-radius-lg);}
> .mes{border-radius:var(--stc-radius);}
> #send_form,#send_textarea{border-radius:var(--stc-radius);}
> .menu_button{border-radius:var(--stc-radius-sm);}
> ```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd tests && npm run test:unit -- warm-theme`
Expected: PASS — 4 个 `warm-latte theme` 用例全绿。

- [ ] **Step 5: 提交**

```bash
git add tests/warm-theme.test.js default/content/themes/warm-latte.json
git commit -m "feat(stc-mod): add warm-latte (暖阳拿铁) light theme + theme tests"
```

---

## Task 2: 深色主题「暖夜可可」

**Files:**
- Create: `default/content/themes/warm-cocoa.json`
- Modify: `tests/warm-theme.test.js`（追加 describe 块）

**Interfaces:**
- Consumes: `REQUIRED_THEME_KEYS`, `contrastRatio`（同文件已定义）。
- Produces: 主题文件 `warm-cocoa.json`，`name` = `暖夜可可`，`custom_css` 使用与浅色**相同的 `--stc-*` token 名、深色值**。

- [ ] **Step 1: 写失败测试（在 `tests/warm-theme.test.js` 末尾追加）**

```javascript
describe('warm-cocoa theme (暖夜可可)', () => {
    const t = readJson('default/content/themes/warm-cocoa.json');

    test('is valid JSON with all 34 required keys', () => {
        for (const k of REQUIRED_THEME_KEYS) expect(t).toHaveProperty(k);
    });
    test('name is 暖夜可可', () => {
        expect(t.name).toBe('暖夜可可');
    });
    test('main text on blur tint meets WCAG AA (>=4.5)', () => {
        expect(contrastRatio(t.main_text_color, t.blur_tint_color)).toBeGreaterThanOrEqual(4.5);
    });
    test('reuses the same --stc- token names as latte', () => {
        for (const v of ['--stc-bg', '--stc-surface', '--stc-surface-2', '--stc-text',
            '--stc-text-muted', '--stc-accent', '--stc-accent-hover', '--stc-accent-soft',
            '--stc-border', '--stc-radius', '--stc-radius-sm', '--stc-radius-lg']) {
            expect(t.custom_css).toContain(v);
        }
    });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd tests && npm run test:unit -- warm-theme`
Expected: FAIL — 找不到 `warm-cocoa.json`（ENOENT）。

- [ ] **Step 3: 创建 `default/content/themes/warm-cocoa.json`**

```json
{
    "name": "暖夜可可",
    "blur_strength": 8,
    "main_text_color": "rgba(240, 230, 216, 1)",
    "italics_text_color": "rgba(216, 196, 168, 1)",
    "underline_text_color": "rgba(240, 168, 120, 1)",
    "quote_text_color": "rgba(240, 168, 120, 1)",
    "blur_tint_color": "rgba(46, 39, 33, 0.9)",
    "chat_tint_color": "rgba(39, 32, 25, 0.6)",
    "user_mes_blur_tint_color": "rgba(58, 46, 36, 0.88)",
    "bot_mes_blur_tint_color": "rgba(46, 39, 33, 0.9)",
    "shadow_color": "rgba(0, 0, 0, 0.35)",
    "shadow_width": 2,
    "border_color": "rgba(61, 51, 43, 0.95)",
    "font_scale": 1,
    "fast_ui_mode": false,
    "waifuMode": false,
    "avatar_style": 0,
    "chat_display": 1,
    "noShadows": false,
    "chat_width": 50,
    "timer_enabled": false,
    "timestamps_enabled": true,
    "timestamp_model_icon": true,
    "mesIDDisplay_enabled": true,
    "hideChatAvatars_enabled": false,
    "message_token_count_enabled": false,
    "expand_message_actions": false,
    "enableZenSliders": false,
    "enableLabMode": false,
    "hotswap_enabled": true,
    "custom_css": ":root{--stc-bg:linear-gradient(160deg,#272019,#1E1714);--stc-surface:#2E2721;--stc-surface-2:#2E2721;--stc-text:#F0E6D8;--stc-text-muted:#9A8A78;--stc-accent:#F0A878;--stc-accent-hover:#E0895D;--stc-accent-soft:#3A2E24;--stc-border:#3D332B;--stc-radius:14px;--stc-radius-sm:10px;--stc-radius-lg:20px;}.drawer-content{border-radius:var(--stc-radius-lg);}.mes{border-radius:var(--stc-radius);}#send_form,#send_textarea{border-radius:var(--stc-radius);}.menu_button{border-radius:var(--stc-radius-sm);}",
    "bogus_folders": true,
    "reduced_motion": false,
    "compact_input_area": false
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd tests && npm run test:unit -- warm-theme`
Expected: PASS — latte + cocoa 共 8 个用例全绿。

- [ ] **Step 5: 提交**

```bash
git add tests/warm-theme.test.js default/content/themes/warm-cocoa.json
git commit -m "feat(stc-mod): add warm-cocoa (暖夜可可) dark theme"
```

---

## Task 3: 在内容索引注册两个主题

**Files:**
- Modify: `default/content/index.json`
- Modify: `tests/warm-theme.test.js`（追加 describe 块）

**Interfaces:**
- Consumes: `readJson`（同文件已定义）。
- Produces: `index.json` 含两条 `{filename, type:"theme"}` 记录，使新用户首次运行时拿到这两个主题。

- [ ] **Step 1: 写失败测试（在 `tests/warm-theme.test.js` 末尾追加）**

```javascript
describe('content index registration', () => {
    const index = readJson('default/content/index.json');
    const files = index.map((e) => e.filename);

    test('warm-latte is registered as a theme', () => {
        expect(index).toContainEqual({ filename: 'themes/warm-latte.json', type: 'theme' });
    });
    test('warm-cocoa is registered as a theme', () => {
        expect(index).toContainEqual({ filename: 'themes/warm-cocoa.json', type: 'theme' });
    });
    test('no duplicate registration', () => {
        expect(files.filter((f) => f === 'themes/warm-latte.json')).toHaveLength(1);
        expect(files.filter((f) => f === 'themes/warm-cocoa.json')).toHaveLength(1);
    });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd tests && npm run test:unit -- warm-theme`
Expected: FAIL — `content index registration` 3 个用例失败（未注册）。

- [ ] **Step 3: 编辑 `default/content/index.json`**

在既有主题条目区块内（`Azure.json` 条目之后、下一个非 theme 条目之前）插入两条记录。找到：

```json
    {
        "filename": "themes/Azure.json",
        "type": "theme"
    },
```

在其后紧接插入：

```json
    {
        "filename": "themes/warm-latte.json",
        "type": "theme"
    },
    {
        "filename": "themes/warm-cocoa.json",
        "type": "theme"
    },
```

> 注意保持 JSON 逗号正确（新块后面仍有其它条目，故两块都以逗号结尾）。

- [ ] **Step 4: 运行测试确认通过 + JSON 合法性**

Run: `cd tests && npm run test:unit -- warm-theme`
Expected: PASS — 共 11 个用例全绿（含 index 3 个）。

- [ ] **Step 5: 提交**

```bash
git add tests/warm-theme.test.js default/content/index.json
git commit -m "feat(stc-mod): register warm themes in content index"
```

---

## Task 4: 新用户默认激活「暖阳拿铁」

**Files:**
- Modify: `default/content/settings.json`（`power_user` 块）
- Modify: `tests/warm-theme.test.js`（追加 describe 块）

**Interfaces:**
- Consumes: `readJson`（同文件已定义）。
- Produces: 种子设置 `power_user.theme` = `暖阳拿铁`，且颜色字段与浅色主题一致——新用户开箱即暖色。**不影响老用户**（种子仅用于新用户初始化）。

- [ ] **Step 1: 写失败测试（在 `tests/warm-theme.test.js` 末尾追加）**

```javascript
describe('new-user seed settings default to warm-latte', () => {
    const s = readJson('default/content/settings.json');
    const pu = s.power_user;
    const latte = readJson('default/content/themes/warm-latte.json');

    test('default theme is 暖阳拿铁', () => {
        expect(pu.theme).toBe('暖阳拿铁');
    });
    test('seed colors match the latte theme', () => {
        expect(pu.main_text_color).toBe(latte.main_text_color);
        expect(pu.blur_tint_color).toBe(latte.blur_tint_color);
        expect(pu.user_mes_blur_tint_color).toBe(latte.user_mes_blur_tint_color);
        expect(pu.bot_mes_blur_tint_color).toBe(latte.bot_mes_blur_tint_color);
        expect(pu.border_color).toBe(latte.border_color);
    });
    test('seed main text meets WCAG AA on seed blur tint', () => {
        expect(contrastRatio(pu.main_text_color, pu.blur_tint_color)).toBeGreaterThanOrEqual(4.5);
    });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd tests && npm run test:unit -- warm-theme`
Expected: FAIL — `new-user seed settings` 用例失败（当前 `theme` 为 `Dark Lite`，颜色为暗色）。

- [ ] **Step 3: 编辑 `default/content/settings.json` 的 `power_user` 块**

逐项替换（左侧为当前值，右侧为新值）：

```
"blur_strength": 10,                                  ->  "blur_strength": 6,
"main_text_color": "rgba(220, 220, 210, 1)",          ->  "main_text_color": "rgba(74, 63, 53, 1)",
"italics_text_color": "rgba(145, 145, 145, 1)",       ->  "italics_text_color": "rgba(122, 104, 84, 1)",
"underline_text_color": "rgba(188, 231, 207, 1)",     ->  "underline_text_color": "rgba(198, 123, 69, 1)",
"quote_text_color": "rgba(225, 138, 36, 1)",          ->  "quote_text_color": "rgba(184, 92, 58, 1)",
"chat_tint_color": "rgba(23, 23, 23, 1)",             ->  "chat_tint_color": "rgba(247, 239, 228, 0.5)",
"blur_tint_color": "rgba(23, 23, 23, 1)",             ->  "blur_tint_color": "rgba(251, 244, 234, 0.9)",
"user_mes_blur_tint_color": "rgba(30, 30, 30, 0.9)",  ->  "user_mes_blur_tint_color": "rgba(251, 231, 214, 0.88)",
"bot_mes_blur_tint_color": "rgba(30, 30, 30, 0.9)",   ->  "bot_mes_blur_tint_color": "rgba(255, 255, 255, 0.9)",
"shadow_color": "rgba(0, 0, 0, 1)",                   ->  "shadow_color": "rgba(120, 90, 60, 0.16)",
"noShadows": true,                                    ->  "noShadows": false,
"theme": "Dark Lite",                                 ->  "theme": "暖阳拿铁",
```

> 只改上列字段，`power_user` 块其余字段（`border_color` 若不在种子块中则由主题提供；本块无 `border_color` 键，无需新增）保持不变。若测试 `seed colors match` 因 `border_color` 缺失而失败，则在 `shadow_color` 行后补一行 `"border_color": "rgba(235, 221, 203, 0.95)",`。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd tests && npm run test:unit -- warm-theme`
Expected: PASS — 全部用例全绿（14 个）。

- [ ] **Step 5: 提交**

```bash
git add tests/warm-theme.test.js default/content/settings.json
git commit -m "feat(stc-mod): default new users to 暖阳拿铁 warm theme"
```

---

## Task 5: 文档记录 + 真机可视化验证

**Files:**
- Modify: `MODIFICATIONS.md`
- （验证性，无代码）

**Interfaces:**
- Consumes: 前四个 Task 的全部产物。
- Produces: 升级排查记录；一次人工可视化确认。

- [ ] **Step 1: 在 `MODIFICATIONS.md` 记录改动**

在「部署与性能相关默认配置」小节之后新增一节：

```markdown
## 默认主题（P0 温暖主题层）

为提升新用户友好度，新增两套温暖主题并将新用户默认主题改为浅色「暖阳拿铁」。

**新增文件（不受上游影响）：**
- `default/content/themes/warm-latte.json`（暖阳拿铁，浅色默认）
- `default/content/themes/warm-cocoa.json`（暖夜可可，深色可切换）

**修改的上游文件（升级时需复原）：**
- `default/content/index.json`：新增两条 `{filename:"themes/warm-*.json", type:"theme"}`。
- `default/content/settings.json` → `power_user`：`theme` 改为 `暖阳拿铁`，并把
  `main_text_color / italics_text_color / underline_text_color / quote_text_color /
  chat_tint_color / blur_tint_color / user_mes_blur_tint_color / bot_mes_blur_tint_color /
  shadow_color / blur_strength / noShadows` 改为浅色暖值（详见
  `docs/superpowers/plans/2026-07-15-warm-theme-layer.md` Task 4）。

**升级排查**：合并上游后若 `default/content/settings.json` 被覆盖，需按上表重新设置
`power_user.theme` 与颜色字段；若 `index.json` 被覆盖需重新注册两个主题。仅影响新用户，
不改动老用户已保存的主题。

**测试**：`tests/warm-theme.test.js`（`cd tests && npm run test:unit -- warm-theme`）。
```

- [ ] **Step 2: 提交文档**

```bash
git add MODIFICATIONS.md
git commit -m "docs(stc-mod): record warm theme defaults for upstream merges"
```

- [ ] **Step 3: 真机可视化验证（人工 gate）**

```bash
# 启动应用
npm run start
```

在浏览器中（可用 Playwright MCP 截图核对）：
1. 用管理员或新建一个测试用户登录 → 落地主界面应为**暖阳拿铁**浅色暖调（奶油底、暖棕文字、珊瑚强调）。
2. 打开若干抽屉（AI 采样配置 / 用户设置 / 角色管理）→ 面板不破版、圆角柔和、文字清晰可读。
3. User Settings → Theme 下拉切到**暖夜可可** → 深色正常、可读、强调色为暖桃。
4. 确认已存在的老用户登录后主题**未被改动**（仍是其原主题）。

Expected：新用户默认暖色、观感温暖治愈、功能无缺失、无破版；老用户主题不变。

- [ ] **Step 4: 全量单测回归**

Run: `cd tests && npm run test:unit -- warm-theme`
Expected: PASS — 全绿。

> 说明：视觉「温暖度」无法单测，故 Step 3 为人工 gate；自动化测试覆盖 JSON 合法性、字段完整、name 匹配、对比度 AA、索引注册与种子默认。

---

## Self-Review

**1. Spec coverage（对照 `2026-07-15-warm-theme-layer-design.md`）：**
- 暖阳拿铁（浅色默认）→ Task 1 ✅
- 暖夜可可（深色可切换）→ Task 2 ✅
- 在 index.json 注册 → Task 3 ✅
- 新用户默认激活浅色 → Task 4 ✅（用种子设置 `default/content/settings.json`，比 spec 里提到的 default-template 更直接；spec 已注明「机制在计划确认」）
- `--stc-*` 设计 token → Task 1/2 的 `custom_css` ✅（测试断言 token 名一致）
- 结构润色（非破坏、稳定选择器）→ Task 1/2 `custom_css` 的 `.drawer-content/.mes/#send_form/.menu_button` ✅
- 不引外部字体、WCAG AA、只影响新用户、上游可合并记录 → Global Constraints + Task 4/5 ✅
- 深浅共用 token 名 → Task 2 断言 ✅
- 验证（真机 + 老用户不变）→ Task 5 ✅

**2. Placeholder scan：** 无 TBD/TODO；每个主题 JSON、每处 Edit、每条测试均为完整内容。✅

**3. Type consistency：** `contrastRatio`、`REQUIRED_THEME_KEYS`、`readJson` 在 Task 1 定义，后续 Task 复用同名；主题 `name`（暖阳拿铁/暖夜可可）在 Task 1/2/4 与 index/settings 一致；`--stc-*` token 名两套一致。✅

> 唯一的运行时不确定点：Task 4 种子块是否含 `border_color` 键——已在 Step 3 给出条件分支（缺失则补一行），测试会指明。
