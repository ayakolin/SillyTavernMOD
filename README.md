# SillyTavern + SillyTavernchat (STC-MOD)

LLM Frontend for Power Users  
本仓库基于 **SillyTavern 1.17.0 官方版本**，在其上通过「外挂模块 / Sidecar Module」方式集成了
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

> 以下步骤以仓库地址 `https://github.com/zhaiiker/SillyTavernMOD`、分支 `stc-mod` 为例，假设当前工作目录为项目根目录。

### 1. 环境准备

- **Node.js**：建议使用 20.x 或 22.x LTS（不要使用过新的 24.x，以免某些依赖尚未兼容）。  
- **Git**：用于克隆仓库。  
- **操作系统**：Windows / Linux / macOS 均可，云服务器推荐 Linux。  

### 2. 获取代码并安装依赖

```bash
git clone https://github.com/zhaiiker/SillyTavernMOD/tree/stc-mod
cd SillyTavernMOD

npm install

sh start.sh 或 npm run start
```

### 3. 初始化配置（启用默认 Basic Auth）

首次运行前，请先在项目根目录创建 `config.yaml`（如不存在，可从 `default/config.yaml` 复制一份）：

```bash
cp default/config.yaml ./config.yaml    # 若文件已存在可跳过
```

然后编辑根目录下的 `config.yaml`，确认以下内容存在且缩进正确：

```yaml
basicAuthMode: true

basicAuthUser:
  username: "admin"
  password: "123456"
```

- `basicAuthMode: true`：默认开启 HTTP Basic Auth 保护，防止云服务器直接暴露在公网。
- 默认访问账号：**admin / 123456**（仅用于进入站点大门，进入 ST 直接点击登录就可以进入，然后需要给默认管理员设置密码）。

### 4. 启动服务

本地或服务器前台启动（调试阶段推荐）：

```bash
node server.js --host 0.0.0.0 --port 8000
```

或使用 npm 脚本（等价于上方命令的默认参数）：

```bash
npm run start
```

默认访问地址：

- SillyTavern 主站（带欢迎页 / 登录页）：`http://127.0.0.1:8000/`
- 公共角色卡库（若在配置中启用）：`http://127.0.0.1:8000/public-characters`
- 社区论坛（若在配置中启用）：`http://127.0.0.1:8000/forum`

> 云服务器上请将 `127.0.0.1` 换成你的公网 IP 或域名，例如：`http://your-ip:8000/`。

---

## 使用 Docker 部署（官方镜像）

本仓库已在 Docker Hub 提供预构建镜像：`zhaiker/sillytavernmod:latest`  
适合不想本地装 Node/npm、只想一条命令跑起来的用户。

### 方式一：直接使用 `docker run`

在服务器任意目录下执行：

```bash
docker run -d \
  --name sillytavernmod \
  -p 8000:8000 \
  -v ./config:/home/node/app/config \
  -v ./data:/home/node/app/data \
  -v ./plugins:/home/node/app/plugins \
  -v ./extensions:/home/node/app/public/scripts/extensions/third-party \
  zhaiker/sillytavernmod:latest
```

说明：

- `-p 8000:8000`：将容器的 8000 端口映射到宿主机 8000 端口，可按需修改。
- 当前目录下会创建 `config` / `data` / `plugins` / `extensions` 四个文件夹，用来持久化配置和数据。

启动完成后，浏览器访问：

- `http://服务器IP:8000/`

> 容器启动脚本会在缺少 `config/config.yaml` 时，自动从 `default/config.yaml` 拷贝一份，并执行 `npm run postinstall` 补全缺省字段；  
> **首次登录 / Basic Auth 流程** 与上面「运行与基础使用」章节完全一致。

### 方式二：使用 `docker-compose`

1. 克隆本仓库并进入 `docker` 目录：

```bash
git clone https://github.com/zhaiiker/SillyTavernMOD.git
cd SillyTavernMOD/docker
```

2. 确认 `docker-compose.yml` 中镜像名为：

```yaml
image: zhaiker/sillytavernmod:latest
```

3. 一键启动：

```bash
docker compose up -d
```

4. 更新到最新镜像时：

```bash
docker pull zhaiker/sillytavernmod:latest
cd SillyTavernMOD/docker
docker compose down
docker compose up -d
```

### 5. 首次登录与关闭 Basic Auth 的推荐流程

1. **通过 Basic Auth 进入站点**
   - 浏览器访问 `http://服务器IP:8000/`。  
   - 在弹出的浏览器登录框中输入：  
     - 用户名：`admin`  
     - 密码：`123456`  
   - 在登录页面用户名输入 `default-user` **直接点击登录**不需要如密码就可以进入后台，然后需要给默认管理员设置密码。

2. **为本地管理员设置密码**
   - 进入 SillyTavern 后，使用默认本地账号（例如 `default-user (admin)`）登录。  
   - 在官方「账户 / 用户管理」管理面板的「用户管理」中，为所有管理员账号设置**强密码**。  

3. **关闭 Basic Auth（可选，但不建议在公网完全裸奔）**
   - 确认所有管理员账户已设置密码后，可在根目录 `config.yaml` 中将：  

     ```yaml
     basicAuthMode: false
     ```

     保存退出，并重启服务。此后访问站点将不再弹出浏览器级别的用户名/密码框，只保留 SillyTavern 自身的登录校验。

> 若以后希望再次启用 Basic Auth，只需将 `basicAuthMode` 改回 `true` 即可。

### 6. 使用 PM2 后台守护（生产环境推荐）

在服务器上建议使用 [PM2](https://pm2.keymetrics.io/) 管理进程，避免 SSH 断开导致服务退出：

```bash
npm install -g pm2

pm2 start server.js --name sillytavern -- \
  --host 0.0.0.0 --port 8000

pm2 save
pm2 startup   # 按提示执行生成的命令，设置开机自启
```

查看运行日志：

```bash
pm2 logs sillytavern
```

### 7. STC 管理面板入口

- 使用管理员账号登录 SillyTavern 后，在聊天界面右下角可以看到 STC 的紫色悬浮按钮。  
- 点击即可打开 STC 管理面板，内含：系统监控、邀请码管理、公告管理、邮件配置、OAuth 配置、默认模板、用户空间、用户管理（含多选与批量删除）、定时任务等功能。

---

## STC-MOD 功能概览

STC-MOD 的主要能力包括（非完整列表）：

- 自定义欢迎页 / 登录 / 注册页（玻璃拟态风格，含激活码与邮箱校验等）。
- 基于邀请码的注册与续期系统（支持多种时长，对接购买链接）。
- 账户有效期与空间配额控制（到期/超限限制登录或写入，并在前端明确提示）。
- 用户「签到扩容」与个人空间使用情况展示。
- 公共角色卡分享与导入（与二开版 SillyTavernchat 功能等价）。
- 社区论坛（发帖、评论、图片上传等）。
- STC 管理面板（系统监控、用户管理多选与批量删除、定时任务、不活跃用户清理等）。

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

