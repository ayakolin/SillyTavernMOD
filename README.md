# SillyTavern + SillyTavernchat (STC-MOD)

LLM Frontend for Power Users  
本仓库基于 **SillyTavern 1.16.0 官方版本**，在其上通过「外挂模块 / Sidecar Module」方式集成了
`SillyTavernchat (STC-MOD)` 的一系列管理与运营功能，同时尽量保持对上游的 **低侵入、易升级**。

---

## 目录

- [项目概览](#项目概览)
- [运行与基础使用](#运行与基础使用)
- [STC-MOD 功能概览](#stc-mod-功能概览)
- [升级与二次开发注意事项](#升级与二次开发注意事项)
- [修改记录 (MODIFICATIONS)](#修改记录-modifications)
- [上游资源与协议](#上游资源与协议)

---

## 项目概览

- 官方前端：保留原生 SillyTavern 体验（聊天、角色管理、扩展系统等）。
- Sidecar 模块：新增在 `src/stc-mod/` 目录下，所有二开逻辑集中于此：
  - 管理后台（STC 管理面板，作为 SillyTavern 扩展加载）。
  - 注册 / 欢迎 / 登录 / 公共角色卡库 / 论坛等页面的外挂实现。
  - 账户有效期、储存空间配额、签到扩容、邀请码注册与续期等后台逻辑。
- 对官方核心代码的修改仅限极少数钩子（主要在 `src/server-main.js`），具体见
  [MODIFICATIONS.md](MODIFICATIONS.md)。

本仓库既可当作「开箱即用的 SillyTavern + 站点运营套件」，也可作为后续跟进官方版本时的二开基线。

---

## 运行与基础使用

> 以下命令假设当前工作目录为仓库根目录 `SillyTavern/`。

1. 安装依赖

```bash
npm install
```

2. 启动服务

```bash
npm run start
```

3. 默认访问地址

- SillyTavern 主站（带欢迎页 / 登录页）：`http://127.0.0.1:8000/`
- 公共角色卡库（若在配置中启用）：`http://127.0.0.1:8000/public-characters`
- 社区论坛（若在配置中启用）：`http://127.0.0.1:8000/forum`

4. STC 管理面板

- 登录具有管理员权限的账号，在聊天界面右下角可见 STC 浮动按钮，点击进入管理面板。
- 管理面板内部包含系统监控、邀请码、公告、邮件配置、OAuth 配置、默认模板、用户空间、用户管理、定时任务等功能。

---

## STC-MOD 功能概览

STC-MOD 的主要能力包括（非完整列表）：

- 自定义欢迎页 / 登录 / 注册页（玻璃拟态风格，含激活码与邮箱校验等）。
- 基于邀请码的注册与续期系统（支持多种时长，对接购买链接）。
- 账户有效期与空间配额控制（到期/超限限制登录或写入，并在前端明确提示）。
- 用户「签到扩容」与个人空间使用情况展示。
- 公共角色卡分享与导入（与二开版 SillyTavernchat 功能等价）。
- 社区论坛（发帖、评论、图片上传等）。
- STC 管理面板（系统监控、批量用户管理、定时任务、不活跃用户清理等）。

所有后端路由均通过 `src/stc-mod/index.js` 注册，前端管理与入口则通过
`public/scripts/extensions/third-party/stc-admin-panel/` 扩展注入。

---

## 升级与二次开发注意事项

为了在跟进上游 SillyTavern 版本时减少冲突，本项目遵循以下原则：

- 尽可能 **不修改** 官方源文件；确需修改时：
  - 仅插入一个「调用钩子函数」或最小逻辑。
  - 所有改动都在 [MODIFICATIONS.md](MODIFICATIONS.md) 中记录行号、目的与注意事项。
- 所有自定义逻辑（路由、服务、配置解析、前端 UI）集中在：
  - 后端：`src/stc-mod/` 目录（`routes/`、`services/`、`user-metadata.js` 等）。
  - 前端：`src/stc-mod/public/` 与 `public/scripts/extensions/third-party/stc-admin-panel/`。

升级官方 SillyTavern 版本时，建议流程：

1. **先合并官方更新**，保证仓库处于干净状态。
2. 打开 [MODIFICATIONS.md](MODIFICATIONS.md)，按钩子编号逐条核对：
   - 对应文件是否仍存在。
   - Hook 附近逻辑是否有破坏性变动。
3. 若官方结构发生变化，优先调整 `stc-mod` 内部实现，而不是继续扩散对官方代码的修改范围。

---

## 修改记录 (MODIFICATIONS)

本仓库相对于官方 SillyTavern 的所有 **核心文件改动** 与 **新增 Sidecar 结构说明**，已完整记录在：

- [`MODIFICATIONS.md`](MODIFICATIONS.md)

若你准备：

- 升级到新的官方版本；
- 调整 / 扩展 STC-MOD 功能；
- 或排查「为何官方行为与文档不一致」的问题，

请务必先阅读该文件。

---

## 上游资源与协议

**Upstream Resources**

- GitHub: <https://github.com/SillyTavern/SillyTavern>
- Docs: <https://docs.sillytavern.app/>
- Discord: <https://discord.gg/sillytavern>
- Reddit: <https://reddit.com/r/SillyTavernAI>

**License**

本项目沿用上游 SillyTavern 许可协议：

- AGPL-3.0

