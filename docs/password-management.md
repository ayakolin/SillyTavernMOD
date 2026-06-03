# OAuth 用户密码设置功能说明

## 功能概述

为 OAuth 登录用户（GitHub/Discord/LinuxDO）提供设置密码的能力，使其可以在不依赖第三方服务的情况下，使用用户名和密码登录。

## 设计原则

- **非强制性**：不强制用户设置密码，仅通过友好提醒引导
- **简单安全**：最低 8 位密码要求，无复杂规则
- **用户友好**：登录后延迟提醒，每天仅提示一次
- **向后兼容**：不影响现有本地账户和 OAuth 登录流程

## 功能实现

### 后端实现

#### 1. 用户元数据扩展 (`src/stc-mod/user-metadata.js`)

新增字段：
```typescript
{
  hasPassword: boolean,          // 是否已设置密码
  passwordSetAt: number,         // 密码设置时间戳
  registrationMethod: string     // 注册方式: 'local' | 'github' | 'discord' | 'linuxdo'
}
```

#### 2. 密码管理 API (`src/stc-mod/routes/private/set-password.js`)

提供 3 个 API 端点：

| API | 方法 | 功能 |
|-----|------|------|
| `/api/stc/users/password-status` | GET | 检查用户密码状态 |
| `/api/stc/users/set-password` | POST | 设置/修改密码 |
| `/api/stc/users/verify-password` | POST | 验证当前密码 |

**设置密码接口** (`POST /api/stc/users/set-password`)：
- **首次设置**：仅需提供 `{ password }`
- **修改密码**：需提供 `{ password, oldPassword }`
- 自动验证旧密码（如果已设置）
- 使用官方 `getPasswordSalt()` 和 `getPasswordHash()` 保证与本地账户一致性
- 成功后更新用户元数据标记

#### 3. 注册流程集成

**OAuth 注册** (`src/stc-mod/routes/public/oauth.js`)：
- 创建用户时标记 `hasPassword: false`
- 记录 `registrationMethod: 'github'|'discord'|'linuxdo'`

**本地注册** (`src/stc-mod/routes/public/register.js`)：
- 创建用户时标记 `hasPassword: true`（如提供密码）
- 记录 `registrationMethod: 'local'`

### 前端实现

#### 1. 用户面板密码卡片 (`public/scripts/extensions/third-party/stc-admin-panel/index.js`)

**位置**：在"我的账户"面板中，位于"存储空间"和"API 密钥保险箱"之间

**功能**：
- 显示密码状态徽章（未设置 / 已设置）
- OAuth 用户显示注册来源提示
- 动态渲染操作按钮：
  - **未设置**：显示"设置密码"按钮
  - **已设置**：显示"修改密码"按钮

**交互流程**：
1. 点击按钮弹出密码输入对话框
2. 设置密码时需确认输入（防止输错）
3. 修改密码时需先验证当前密码
4. 密码要求最少 8 位字符
5. 成功后提示用户登录凭据信息

#### 2. 登录后提醒 Toast

**触发条件**：
- OAuth 用户首次登录
- 且未设置密码
- 每天每个会话仅提示一次

**显示时机**：
- 页面加载后延迟 3 秒显示
- 避免干扰用户正常使用

**内容**：
- 显示当前 OAuth 提供商（GitHub/Discord/LinuxDO）
- 建议设置密码以备用
- 提供"立即设置"和"稍后提醒"按钮
- 15 秒后自动消失

**去重机制**：
- 使用 `sessionStorage` 存储每日提醒标记
- Key: `stc_password_reminded_YYYY-MM-DD`
- 每天自动重置提醒

## 用户使用流程

### 场景 1：OAuth 用户首次设置密码

1. 通过 GitHub/Discord/LinuxDO 登录
2. 登录后 3 秒弹出提醒 Toast
3. 点击"立即设置"或手动打开"我的账户"面板
4. 在"密码安全"卡片点击"设置密码"
5. 输入新密码并确认（最少 8 位）
6. 设置成功后显示登录凭据提示
7. 下次可使用用户名和密码登录

### 场景 2：已有密码用户修改密码

1. 打开"我的账户"面板
2. 在"密码安全"卡片点击"修改密码"
3. 输入当前密码和新密码（需确认）
4. 修改成功后提示完成
5. 下次登录使用新密码

### 场景 3：本地注册用户

- 注册时已设置密码
- 面板显示"已设置"状态
- 可随时修改密码

## 安全机制

1. **密码加密**：
   - 使用官方 `getPasswordSalt()` 生成随机盐
   - 使用官方 `getPasswordHash()` 加密存储
   - 与本地账户使用相同的加密算法（scrypt）

2. **修改密码验证**：
   - 必须先验证当前密码
   - 防止未授权修改

3. **最小长度要求**：
   - 8 位最低要求
   - 无复杂规则，用户友好

4. **API 鉴权**：
   - 所有密码管理 API 需登录后访问
   - 仅能操作当前用户密码

## 与现有系统的兼容性

### 登录系统
- OAuth 用户设置密码后，官方登录逻辑自动识别
- 密码哈希存储在官方 `user.password` 字段
- 完全兼容官方密码验证流程

### 用户管理
- 不修改官方用户数据结构
- 扩展信息存储在 `data/stc-mod/user-metadata.json`
- 官方用户操作不受影响

### 升级兼容
- 旧版用户自动迁移（元数据按需加载）
- 本地注册用户自动标记 `hasPassword: true`
- OAuth 用户保持 `hasPassword: false` 直到主动设置

## 数据存储

### 密码数据
- 存储位置：官方 `node-persist` 存储（`data/default-user/users/user:用户名`）
- 字段：`user.password`（scrypt 哈希）和 `user.salt`（随机盐）

### 元数据
- 存储位置：`data/stc-mod/user-metadata.json`
- 字段：
  ```json
  {
    "用户名": {
      "hasPassword": true,
      "passwordSetAt": 1735891234567,
      "registrationMethod": "github"
    }
  }
  ```

## 未来扩展

本版本**未实现**以下功能（可在后续版本添加）：

1. **密码重置**：
   - 需邮件服务支持
   - 需实现邮箱验证码流程
   - 当前由管理员手动重置

2. **密码强度检测**：
   - 当前仅要求最少 8 位
   - 可添加强度提示（弱/中/强）

3. **密码策略配置**：
   - 最小长度可配置
   - 复杂度要求可配置
   - 过期时间可配置

4. **登录历史**：
   - 记录密码登录时间
   - 显示最近登录记录

## 开发规范遵循

按照 `MODIFICATIONS.md` 的开发规范实施：

1. ✅ 非侵入式：不修改官方代码，仅通过钩子扩展
2. ✅ 数据隔离：扩展数据存储在 `data/stc-mod/`
3. ✅ API 规范：遵循 `/api/stc/` 路由前缀
4. ✅ 中文优先：所有提示信息使用简体中文
5. ✅ 文档完善：更新 `MODIFICATIONS.md` 和本文档

## 代码文件清单

### 新增文件
- `src/stc-mod/routes/private/set-password.js` - 密码管理 API

### 修改文件
- `src/stc-mod/user-metadata.js` - 添加密码状态字段
- `src/stc-mod/routes/public/oauth.js` - OAuth 注册标记密码状态
- `src/stc-mod/routes/public/register.js` - 本地注册标记密码状态
- `src/stc-mod/index.js` - 注册密码管理路由
- `public/scripts/extensions/third-party/stc-admin-panel/index.js` - 前端面板和提醒

### 文档更新
- `MODIFICATIONS.md` - 添加功能说明
- `docs/password-management.md` - 本文档（功能详细说明）

---

**版本**: 1.0.0  
**更新日期**: 2026-06-02  
**作者**: STC-MOD Team
