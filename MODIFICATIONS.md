# SillyTavernchat (STC-MOD) 修改文档

> 本文件记录了在官方 SillyTavern 1.16.0 代码基础上进行的所有修改，
> 以便后续官方版本升级时快速定位和维护这些修改点。
>
> **最后更新**：基于当前实际代码状态同步。

## 架构概述

所有二次开发功能以 **Sidecar Module**（外挂模块）方式实现，集中在 `src/stc-mod/` 目录中。
对官方核心代码的修改仅限于 **1 个文件**（`src/server-main.js`），共 **5 个钩子点**，总计约 **15 行代码**。

## 核心文件修改

### `src/server-main.js`

| 钩子编号 | 实际行号（参考） | 位置描述 | 修改内容 | 目的 |
|---------|----------------|---------|---------|------|
| **A** | ~63 | 文件顶部 `import` 语句之后、`Routers` 注释之前 | 添加 `stcMod` 动态导入 | 加载外挂模块（失败时静默跳过，不影响官方功能） |
| **B** | ~190 | `csrfSync({...})` 的 `skipCsrfProtection` 回调内 | 添加 `stcMod.shouldSkipCsrf(req)` 调用 | 为自定义路由提供 CSRF 豁免 |
| **C** | ~217 | **`app.get('/', ...)` 之前**（静态文件托管开始前） | 调用 `stcMod.setupPublicRoutes(app)` | 注册自定义页面路由（欢迎页/登录页/注册页等）；**必须在官方 `/` 和 `/login` 路由之前，否则欢迎页被官方路由截断** |
| **D** | ~254 | `app.use('/api/users', usersPublicRouter)` 之后 | 调用 `stcMod.setupPublicApi(app)` | 注册无需认证的公开 API 路由 |
| **E** | ~290 | `setupPrivateEndpoints(app)` 调用之后 | 调用 `stcMod.setupPrivateRoutes(app)` | 注册需要认证的私有 API 路由 |

> ⚠ **升级注意**：钩子 C 的位置至关重要——必须插入在 `app.get('/', ...)` **之前**，而非仅在 `app.get('/login', ...)` 之前。若顺序错误，未登录用户访问 `/` 时会被官方路由直接跳转到 `/login`，欢迎页永远不会显示。

### 具体代码差异

#### 钩子 A - 模块加载（约第 63 行）

插入位置：`import cacheBuster from './middleware/cacheBuster.js'` 等 import 语句之后，`// Routers` 注释之前。

```javascript
// [STC-MOD] SillyTavernchat sidecar module loader
let stcMod = null;
try {
    // @ts-expect-error STC-MOD sidecar has no type declarations
    stcMod = await import('./stc-mod/index.js');
    console.log('[STC-MOD] SillyTavernchat module loaded.');
} catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND') console.error('[STC-MOD] Load error:', e.message);
}
```

#### 钩子 B - CSRF 豁免（约第 188–193 行）

插入位置：`csrfSync({...})` 配置对象的 `skipCsrfProtection` 函数体内，紧接 `proxyBypass` 之后。

```javascript
skipCsrfProtection: (req) => {
    const proxyBypass = cliArgs.enableCorsProxy ? /^\/proxy\//.test(req.path) : false;
    // [STC-MOD] Custom CSRF exemption
    const stcBypass = stcMod?.shouldSkipCsrf?.(req) ?? false;
    return proxyBypass || stcBypass;
},
```

#### 钩子 C - 公开页面路由（约第 217 行）

⚠ **插入位置：`// Static files` 注释和 `app.get('/', ...)` 之前。**

```javascript
// [STC-MOD] Public routes and page overrides (must be BEFORE official / and /login routes)
if (stcMod?.setupPublicRoutes) await stcMod.setupPublicRoutes(app);

// Static files
// Host index page
app.get('/', cacheBuster.middleware, (request, response) => {
    // ... 官方代码不变 ...
});
```

#### 钩子 D - 公开 API 路由（约第 254 行）

插入位置：`app.use('/api/users', usersPublicRouter)` 之后、`app.use(requireLoginMiddleware)` 之前。

```javascript
// [STC-MOD] Additional public API routes (no auth required)
if (stcMod?.setupPublicApi) await stcMod.setupPublicApi(app);
```

#### 钩子 E - 私有 API 路由（约第 290 行）

插入位置：`setupPrivateEndpoints(app)` 调用之后（已登录区域内）。

```javascript
// [STC-MOD] Private routes (requires authentication)
if (stcMod?.setupPrivateRoutes) await stcMod.setupPrivateRoutes(app);
```

## 新增依赖

在 `package.json` 中新增以下依赖（已写入）：

| 包名 | 用途 | 可选 |
|------|------|------|
| `nodemailer` | 邮件服务（注册验证、密码恢复、用户通知） | 是（不安装则邮件功能自动禁用） |
| `yaml` | 读写 config.yaml 配置文件 | 是（官方若已引入则无需重复安装） |

> `node-persist`（node-persist）为官方已有依赖，STC-MOD 在 `user-extend.js` 中直接复用，**无需额外安装**。

## 依赖的官方 `src/users.js` 导出接口

升级时需确认以下接口在新版 `users.js` 中仍然存在且签名未变：

| 导出名称 | 使用文件 | 用途 |
|---------|---------|------|
| `requireAdminMiddleware` | 所有 `private/` 路由 | 鉴权：仅管理员可访问 |
| `requireLoginMiddleware` | `index.js` 注册 | 鉴权：登录用户才可访问私有路由 |
| `getAllUserHandles` | `user-extend.js`、`scheduled-tasks.js` | 获取所有用户 handle 列表 |
| `getUserDirectories` | `user-extend.js` | 获取用户数据目录路径（用于清理数据） |
| `toKey` | `user-extend.js` | 将 handle 转换为 node-persist 存储 key |
| `getPasswordSalt` | `register-helper.js` | 生成密码盐 |
| `getPasswordHash` | `register-helper.js` | 生成密码哈希 |
| `ensurePublicDirectoriesExist` | `register-helper.js` | 确保用户公共目录存在 |
| `shouldRedirectToLogin` | 官方 `server-main.js`（参考） | 判断是否需要跳转登录 |

## 新增目录结构

```
src/stc-mod/
├── index.js                         # 模块入口（5个导出函数）
├── config.js                        # 配置系统（读写 config.yaml）
├── user-metadata.js                 # 扩展用户数据存储
├── middleware/
│   ├── csrf-exemption.js            # CSRF 豁免规则
│   └── expiration-check.js          # 用户过期检查中间件
├── routes/
│   ├── public/
│   │   ├── register.js              # 用户注册
│   │   ├── register-helper.js       # 注册辅助（调用官方用户创建）
│   │   ├── oauth.js                 # OAuth 第三方登录
│   │   ├── invitation-status.js     # 邀请码状态
│   │   ├── announcements-public.js  # 登录页公告
│   │   ├── email-status.js          # 邮件服务状态
│   │   └── public-config.js         # 公开配置（功能开关）
│   └── private/
│       ├── invitation-codes.js      # 邀请码管理（管理员）
│       ├── user-extend.js           # 用户扩展（续费、存储、签到）
│       ├── announcements.js         # 公告管理（管理员）
│       ├── email-config.js          # 邮件配置（管理员）
│       ├── oauth-config.js          # OAuth 配置（管理员）
│       ├── forum.js                 # 社区论坛
│       ├── public-characters.js     # 公共角色卡库
│       ├── system-load.js           # 系统监控（管理员）
│       ├── user-storage.js          # 存储空间管理（管理员）
│       ├── default-config.js        # 默认模板管理（管理员）
│       └── scheduled-tasks.js       # 定时任务（管理员）
├── services/
│   ├── email-service.js             # 邮件服务
│   ├── invitation-codes.js          # 邀请码逻辑
│   ├── system-monitor.js            # 系统监控
│   ├── storage-quota.js             # 存储配额
│   └── default-template.js          # 默认用户模板
└── public/
    ├── login.html                   # 自定义登录页（含 OAuth 按钮）
    ├── register.html                # 注册页
    ├── welcome.html                 # 欢迎页
    ├── forum.html                   # 论坛页
    └── public-characters.html       # 角色卡库页
```

## 数据存储

所有外挂模块数据存储在 `data/stc-mod/` 目录中，**不修改**官方用户数据结构：

| 文件/目录 | 内容 |
|-----------|------|
| `user-metadata.json` | 扩展用户字段（OAuth ID、邮箱、过期时间、存储限额等） |
| `invitation-codes.json` | 邀请码数据 |
| `storage-codes.json` | 存储激活码数据 |
| `announcements/` | 公告数据 |
| `forum_data/` | 论坛帖子和图片 |
| `public_characters/` | 公共角色卡索引和文件 |
| `default-template/` | 新用户默认配置模板 |
| `system-monitor-history.json` | 系统监控历史 |

## 配置项

在 `config.yaml` 中添加的配置项（首次启动时自动写入默认值）：

```yaml
enableInvitationCodes: false    # 启用邀请码系统
enableForum: false              # 启用论坛
enablePublicCharacters: false   # 启用公共角色卡库
purchaseLink: ''                # 续费购买链接

oauth:
  github:
    enabled: false
    clientId: ''
    clientSecret: ''
    callbackUrl: ''
  discord:
    enabled: false
    clientId: ''
    clientSecret: ''
    callbackUrl: ''
  linuxdo:
    enabled: false
    clientId: ''
    clientSecret: ''
    callbackUrl: ''

email:
  enabled: false
  smtp:
    host: ''
    port: 587
    secure: false
    user: ''
    password: ''
  from: ''
  fromName: 'SillyTavern'

userStorage:
  enabled: false
  defaultLimitMiB: 500
  dailyCheckInMiB: 0
```

## API 路由汇总

### 公开 API（无需认证）

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/stc/public-config/public-pages` | 获取功能开关状态 |
| GET | `/api/stc/invitation-codes/status` | 邀请码系统状态 |
| GET | `/api/stc/announcements/login/current` | 登录页公告 |
| GET | `/api/stc/email/status` | 邮件服务状态 |
| POST | `/api/stc/users/register` | 用户注册 |
| POST | `/api/stc/users/send-verification` | 发送邮箱验证码 |
| POST | `/api/stc/users/renew-expired` | 过期用户续费 |
| GET | `/api/stc/oauth/:provider` | 发起 OAuth 登录 |
| GET | `/api/stc/oauth/:provider/callback` | OAuth 回调 |
| POST | `/api/stc/oauth/complete-registration` | 完成 OAuth 注册（带邀请码） |

### 私有 API（需认证）

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/stc/users/me-ext` | 获取当前用户扩展信息 |
| POST | `/api/stc/users/renew` | 续费（使用邀请码） |
| POST | `/api/stc/users/heartbeat` | 心跳（更新在线时间） |
| GET | `/api/stc/users/storage` | 获取存储信息 |
| POST | `/api/stc/users/check-in` | 每日签到 |
| POST | `/api/stc/users/use-storage-code` | 使用存储激活码 |
| GET | `/api/stc/announcements/current` | 获取当前公告 |

### 管理员 API

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/stc/invitation-codes/create` | 创建邀请码 |
| GET | `/api/stc/invitation-codes/list` | 列出所有邀请码 |
| POST | `/api/stc/invitation-codes/delete` | 删除邀请码 |
| GET/POST | `/api/stc/email-config/config` | 获取/设置邮件配置 |
| POST | `/api/stc/email-config/test` | 测试邮件发送 |
| GET/POST | `/api/stc/oauth-config/config` | 获取/设置 OAuth 配置 |
| GET | `/api/stc/system-load/current` | 当前系统负载 |
| GET | `/api/stc/system-load/history` | 系统负载历史 |
| GET/POST | `/api/stc/user-storage/config` | 存储配额配置 |
| POST | `/api/stc/user-storage/create-code` | 创建存储激活码 |
| POST | `/api/stc/user-storage/delete-code` | 删除存储激活码 |
| GET | `/api/stc/users/all-meta` | 所有用户扩展元数据 |
| GET | `/api/stc/users/expiration-list` | 用户过期列表 |
| POST | `/api/stc/users/delete-inactive` | 彻底删除长期未登录用户（账号+数据目录+元数据），支持 `dryRun` 预览、`minStorageMB` 存储过滤、`sendEmailNotice` 通知 |
| POST | `/api/stc/users/warn-inactive` | 向未登录用户发送提醒邮件（不删除），支持 `minStorageMB` 存储过滤 |
| GET | `/api/stc/announcements/list` | 所有公告列表 |
| POST | `/api/stc/announcements/create` | 创建公告 |
| PUT | `/api/stc/announcements/:id` | 更新公告 |
| POST | `/api/stc/announcements/delete` | 删除公告 |
| GET | `/api/stc/scheduled-tasks/storage-analysis` | 用户存储分析（按用户统计聊天/角色卡/备份等） |
| POST | `/api/stc/scheduled-tasks/clean-backups` | 立即清理备份文件（指定用户或全部） |
| GET/POST | `/api/stc/scheduled-tasks/config` | 获取/保存定时清理配置 |
| GET/POST | `/api/stc/default-config/template` | 获取/保存新用户默认配置模板 |

## 升级指南

当官方 SillyTavern 发布新版本时：

### 必须操作

1. **拉取官方更新**：正常合并/覆盖官方代码
2. **重新插入 5 个钩子**（在新版 `src/server-main.js` 中）：
   - 在文件中搜索 `[STC-MOD]` 注释，若已存在则无需修改
   - 若被覆盖，按上方「具体代码差异」章节逐一插回
   - **特别注意钩子 C**：必须插在 `app.get('/', ...)` 之前，不能只放在 `/login` 之前

3. **保留目录**（升级时不要删除）：
   - `src/stc-mod/` — 全部外挂模块代码
   - `public/scripts/extensions/third-party/stc-admin-panel/` — 管理面板前端扩展
   - `data/stc-mod/` — 所有运行时数据（用户元数据、公告、邀请码等）

### 需要验证的兼容性

| 检查项 | 说明 |
|--------|------|
| `src/users.js` 导出接口 | 见上方「依赖的官方导出接口」表格，逐一确认签名未变 |
| `node-persist` API | `storage.removeItem(key)` 接口是否变更 |
| `cookie-session` 中的 `req.session.handle` | STC-MOD 用此字段判断登录态 |
| `req.user.profile.handle` | 私有路由用此获取当前用户 handle |
| `csrfSync` 配置结构 | `skipCsrfProtection` 回调参数是否变更 |

### 快速验证步骤

```bash
# 启动后观察控制台，应出现：
# [STC-MOD] SillyTavernchat module loaded.
# [STC-MOD] Public routes registered.
# [STC-MOD] Public API routes registered.
# [STC-MOD] Private API routes registered.

# 若出现 [STC-MOD] Load error: ... 则说明模块加载失败，需排查
```

访问测试：
- `GET /` → 未登录应显示欢迎页（`welcome.html`），已登录应显示主界面
- `GET /login` → 应显示自定义登录页（含 OAuth 按钮）
- `GET /register` → 应显示注册页
- `GET /api/stc/public-config/public-pages` → 应返回 JSON（无需登录）

## 延迟功能

以下功能因侵入性过高暂缓实现，将在后续版本中考虑：

- **聊天文件分段存储优化**：需要深度修改核心数据读写逻辑，与非侵入式架构冲突
