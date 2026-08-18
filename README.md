# 📝 虎窝笔记 - WebDAV 同步记事本 (Cloudflare Pages 版)

> 一款极简、轻量、**零后端服务器**的 Markdown 网络记事本。代码推送到 GitHub，通过 **Cloudflare Pages Git 集成**自动构建部署；**Pages Functions**（Serverless） 对接任意标准 WebDAV 云端存储（坚果云、Nextcloud、群晖 NAS、Alist 等），笔记与媒体附件全自动双向同步。可选接入 **Cloudflare KV** 作为缓存层，显著降低 WebDAV 回源延迟，**个人免费额度完全够用**。

---

## ✨ 核心特性

- 🌐 **Serverless 云原生架构**：无 VPS、无 Node.js 进程常驻、无数据库、无 Docker。**推送代码到 GitHub 即可上线**，托管在 Cloudflare Pages，个人站点**免费即可运行**。
- ☁️ **WebDAV 全量实时同步**：所有笔记以标准 JSON 文件形式无缝备份至 WebDAV 云端，数据完全由自己掌控。
- 🖼️ **全媒体附件管理**：支持粘贴剪贴板图片、拖拽上传及文件选择，媒体文件自动保存至 WebDAV 云端 `attachments/` 目录。
- 🎥 **内置视频与音频播放**：支持 MP4/WebM 视频直接在笔记中内嵌播放。
- 🧹 **智能文件清理**：删除笔记时自动清理该笔记独占引用的媒体附件，不占用云端冗余存储。
- 💾 **Cloudflare KV 缓存层（可选）**：笔记列表与附件文件可被就近缓存在 Cloudflare 全球边缘节点，首次命中后**毫秒级响应**。
- 📱 **深度响应式移动端适配**：手机模式下精简顶栏，侧边栏抽屉手势操作；移动端默认阅读模式，点击即可无缝切换编辑。
- 🏷️ **灵活分类体系**：支持文件夹分类、多标签管理（`#标签`）、标题/全文检索与快速过滤。
- 🔒 **访问锁屏与安全认证**：通过统一访问密码口令进入记事本；WebDAV 凭据既可在环境变量中预设（锁定模式），也可在前端界面动态输入（Cookie 会话模式）。

---

## 🛠️ 技术栈

| 层级 | 选型 |
| :--- | :--- |
| 前端界面 | React 19 + TypeScript + Vite 6 |
| 后端 API | **Cloudflare Pages Functions** (Workers Runtime，原生 Edge Serverless) |
| 缓存层（可选） | **Cloudflare Workers KV**（边缘键值存储） |
| 样式方案 | Tailwind CSS v4 + Lucide Icons + Motion 动画 |
| Markdown 渲染 | `react-markdown` + `remark-gfm`（GitHub 风格表格 / 任务列表） |
| 存储协议 | `webdav` SDK (HTTP/WebDAV over fetch) |

---

## 🚀 部署流程（GitHub → Cloudflare Pages）

本项目**仅支持**推送到 GitHub 仓库，然后在 Cloudflare Pages 中通过 Git 集成自动构建与部署的方式。全程无需任何服务器，免费即可上线。

### 0. 前置准备

- 一个 [GitHub](https://github.com/) 账号（免费）
- 一个 [Cloudflare](https://dash.cloudflare.com/sign-up) 账号（免费）
- 一个标准 WebDAV 服务（坚果云 / Nextcloud / 群晖 / Alist 等，见文末常见配置参考）

---

### 步骤 1：推送到 GitHub 仓库

1. 登录 GitHub，右上角 **+** → **New repository**，取一个仓库名（例如 `huwo-notepad`），**Public / Private 都可以**，Cloudflare Pages 均支持。
2. 将本项目所有代码推送到该仓库：

```bash
# 如果你在本地克隆了代码
cd /你的/项目/目录
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/<你的用户名>/huwo-notepad.git
git add -A
git commit -m "init: 虎窝笔记 Cloudflare Pages 版"
git branch -M main
git push -u origin main
```

> 💡 如果你的代码之前没有 Git 仓库，先执行 `git init` 再走上面的步骤。

---

### 步骤 2：创建 Cloudflare Pages 项目（Git 集成）

1. 打开 Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 平台选择 **GitHub**，首次需要授权 Cloudflare 访问你的 GitHub 仓库
3. 选择刚才推送的仓库（`huwo-notepad`）→ **Begin setup**
4. **Build settings** 保持默认即可，Vite 配置已对齐：
   - **Project name**：取一个名字（决定了免费子域名，例如填 `huwo-notepad` 即得到 `https://huwo-notepad.pages.dev`）
   - **Production branch**：`main`（与 Git 默认分支一致）
   - **Framework preset**：Vite
   - **Build command**：`npm run build`（自动填充）
   - **Build output directory**：`dist`（自动填充）
5. 其他地方无需改动，点击 **Save and Deploy**，等待第一次构建完成（通常 1 分钟内）

构建成功后你会得到一个 `*.pages.dev` 的链接。**现在必须做一件事：对齐 wrangler.toml 里的项目名**。

> ⚠️ **关键一步：设置 wrangler.toml 的 name**
> Cloudflare Pages 强制要求 `wrangler.toml` 中的 `name` 字段与你刚创建的 Pages **项目名完全一致**（否则下一次构建会直接报错 `Missing top-level field "name"` 或 `Project not found`）。
>
> 1. 打开 Pages 项目概览页，在项目标题下方找到显示的 **Project name / slug**（就是你刚才在 Project name 输入框里填的那个，和子域名前缀一样，比如你填 `huwo-notepad` 这里就是 `huwo-notepad`）。
> 2. 打开仓库根目录下的 `wrangler.toml`，修改 `name = "webdav-notepad"` 为你的实际项目名，比如：`name = "huwo-notepad"`。
> 3. 提交并推送这个修改（或使用命令行 `git add wrangler.toml && git commit -m "chore: align wrangler.toml name with pages project" && git push`）。
>
> **注意**：此处只改 `name` 即可，**严禁在 wrangler.toml 追加 `[[kv_namespaces]]` / `[vars]` / `[[d1_databases]]` 等绑定声明**——否则会触发控制台「Add binding 被锁定」。

现在还**不能正式使用**，先继续配置 WebDAV 和可选的 KV 缓存（配置完再一起重部署）。

---

### 步骤 3：创建 KV 命名空间（可选，强烈推荐）

为了启用**边缘缓存**，先创建一个 KV Namespace（不创建也不影响基础功能，所有请求将直接回源 WebDAV）：

1. 回到 Cloudflare 控制台 → **Workers & Pages** → 左侧导航栏 **KV** → **Create a namespace**
2. **Name**：`webdav-notepad-cache`（任意名字均可，后面下拉能认出来就行）
3. 点击 **Add** → 看到 Namespace 出现在列表里即可，**不需要复制 ID**（Git 模式下在控制台绑定是下拉选择的）

---

### 步骤 4：绑定 KV 到 Pages 项目

1. 回到 Pages 项目页 → **Settings** 标签 → 左侧 **Functions** → **KV namespace bindings** → **Add binding**
2. **Variable name**：`NOTE_CACHE` ⚠️ **必须完全一致**，代码通过这个名字读取
3. **KV namespace**：下拉选中步骤 3 创建的 `webdav-notepad-cache`
4. （Environment 选择 **Production** 即可）
5. 点击 **Save** 保存

> ⚡ 若需要预览环境（Preview / `main` 分支的预发布）也使用缓存，前往同一个页面的 **Preview** 标签页按同样步骤添加绑定即可。

> ❓ **如果 Add binding 按钮被锁并提示「此项目的绑定在通过 wrangler.toml 进行管理」**：说明 `wrangler.toml` 里被加了 `[[kv_namespaces]]`、`[vars]` 等**绑定声明段落**（注意不是 `name` 字段，`name` 是安全的）。本项目自带的 [wrangler.toml](wrangler.toml) 只有 `name` + 三行运行时配置，**不会触发锁定**；若你改动过，请**删除所有 `[[kv_namespaces]]` / `[vars]` 段落**，保持 wrangler.toml 内容与仓库默认一致，然后推送到 GitHub 重新构建，Settings 页面即解锁。
>
> ❓ **如果构建报错「Missing top-level field "name" in configuration file」或「Project not found」**：说明 wrangler.toml 里没有 `name` 字段或 `name` 填的与 Cloudflare Pages 项目名不一致。参考步骤 2 结尾的「对齐 wrangler.toml 里的项目名」修正并推送即可。

---

### 步骤 5：配置环境变量

前往 Pages 项目 → **Settings** → 左侧 **Environment variables** → **Production** → **Add variables**。

所有变量**无需加任何前缀**（不需要 `VITE_`、`CF_`、`PAGES_`），直接按下方表格填写：

| 变量名 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- |
| `WEBDAV_URL` | ⚠️ 条件必填 | *(留空)* | WebDAV 服务端地址，例如坚果云 `https://dav.jianguoyun.com/dav/`。**一旦填写，前端「设置」弹窗将被锁定**，不允许用户随意修改（个人独享站点推荐填）。 |
| `WEBDAV_USERNAME` | 同上 | *(留空)* | WebDAV 用户名 |
| `WEBDAV_PASSWORD` | 同上 | *(留空)* | **WebDAV 应用授权码 / 独立密码**（坚果云等服务在"第三方应用管理"里生成，不要填 WebDAV 主账号密码） |
| `WEBDAV_PATH` | 否 | `/WebDAV-Notes` | WebDAV 内保存笔记的根目录，如不存在会自动创建 |
| `SITE_NAME` | 否 | `云端网络记事本` | 自定义网页标题与顶栏站点名称 |
| `AUTH_PASSWORD` / `LOCK_PASSWORD` | 否 | *(留空)* | **访问/锁屏密码**。设置后访问网站需输入该密码才能进入，保障隐私。两者填任一即可；若都填优先使用 `AUTH_PASSWORD`。 |
| `KV_CACHE_TTL` | 否 | `3600` | KV 缓存存活时间（秒）。默认 1 小时，改成 `86400` 即缓存一天。 |

点击每一行的 **Add** 添加，填完后页面会显示你设置的所有变量列表。

> 💡 **多人共享场景**：把 `WEBDAV_URL / WEBDAV_USERNAME / WEBDAV_PASSWORD` 全部**留空**，每位用户首次访问时在「设置」弹窗中输入**自己的** WebDAV 凭据即可——凭据以 **HttpOnly Cookie** 保存在对应浏览器会话中，服务端不持久化，多人共用一个 Pages 站点也不会串数据。

---

### 步骤 6：重新部署使配置生效

⚠️ **重要**：在 Settings 里修改绑定或环境变量**不会触发重新构建**，必须重新部署一次，新的配置才会加载到 Functions 运行时。

操作路径（任选其一）：
- **A. 推送一个空 commit**（推荐，最稳定）：
  ```bash
  git commit --allow-empty -m "chore: reload pages env bindings"
  git push
  ```
- **B. 控制台手动重试**：
  Pages 项目 → **Deployments** 标签 → 找到最新那一条成功的部署 → 点右侧 **···** → **Retry deployment**

等部署进度条跑完、状态变绿色 **Active** 后，访问 `https://你的项目名.pages.dev`，如果设置了 `AUTH_PASSWORD` 会先进入锁屏页，输入即可进入记事本。🎉

---

## 💻 本地开发

GitHub + Cloudflare Pages 仅用于**生产部署**，日常改代码在本地直接跑 Vite 即可：

```bash
# 1. 安装依赖
npm install

# 2. 启动 Vite 开发服务器（支持热更新 HMR）
#    本地预览地址：http://localhost:5173
npm run dev

# 3. 想要模拟生产构建产物 + Vite 静态预览（不含 Pages Functions）
npm run build
npm run preview          # 访问 http://localhost:4173
```

> ⚠️ 本地 `npm run dev` / `npm run preview` 只会启动 Vite 前端，**不会运行 Pages Functions**，API 请求（`/api/*`）会返回 404。完整联调需要部署到 Cloudflare Pages 后进行。

其他常用命令：

```bash
npm run lint   # TypeScript 类型检查（tsc --noEmit）
npm run clean  # 删除 dist/ 构建产物
```

---

## 🧠 Cloudflare KV 缓存层工作原理

创建 KV namespace 并绑定 `NOTE_CACHE` 后启用：

```
客户端  →  Cloudflare 边缘节点  →  KV 命中?  ──YES──▶ 直接返回（毫秒级，X-KV-Cache: HIT）
                                  │
                                  NO
                                  ▼
                            回源 WebDAV 服务器
                                  │
                                  ▼
                        异步回填 KV（下次即命中）
```

响应头标识（浏览器 DevTools → Network 可见）：
- **`X-KV-Cache: HIT`**：本次请求来自 KV 边缘缓存，没有访问 WebDAV
- **`X-KV-Cache: MISS`**：KV 未命中，已回源 WebDAV 并异步写入缓存

**缓存失效策略（全部自动处理，无需人工干预）**：
| 操作 | 失效行为 |
| :--- | :--- |
| 保存笔记（POST /api/notes） | 删除 notes list 缓存键 |
| 删除笔记（DELETE /api/notes/:id） | 删除 notes list 缓存键 + 扫描该笔记引用的所有附件并删除对应 media 缓存 |
| 删除单个附件（DELETE /api/media/:f） | 删除对应 `media:<filename>` 缓存键 |
| 上传附件（POST /api/upload） | 立即预填充 `media:<filename>` 缓存 + 失效 notes list |

KV 免费额度：**100,000 次读 / 天、1,000 次写 / 天、1 GB 存储**，对个人笔记使用绰绰有余。

---

## 📖 常见 WebDAV 服务配置参考

| 提供商 / 方案 | `WEBDAV_URL` 参考值 | 获取授权码 / 启用方式 |
| :--- | :--- | :--- |
| **坚果云 (Jianguoyun)** 🇨🇳 推荐 | `https://dav.jianguoyun.com/dav/` | 网页版 → 右上角头像 → 「账户信息」 → 「安全选项」 → 「第三方应用管理」 → 「添加授权密码」（**这里生成的密码才填 WEBDAV_PASSWORD**） |
| **Nextcloud / ownCloud** | `https://<你的域名>/remote.php/dav/files/<用户名>/` | 个人设置 → 安全 → 设备与会话 → 创建新「应用密码」 |
| **群晖 Synology NAS** | `http(s)://<NAS IP>:5005/`（HTTPS 为 5006） | 套件中心 → 安装 **WebDAV Server** → 勾选启用 HTTP/HTTPS；账号使用 DSM 账号密码 |
| **威联通 QNAP NAS** | `http(s)://<NAS IP>/webdav/` | 控制台 → 网络 & 文件服务 → WebDAV → 启用 |
| **Alist（挂载 115 / 阿里云盘 / 百度网盘等）** | `http(s)://<Alist地址>:5244/dav/` | Alist 后台 → 挂载对应网盘驱动 → 在 Alist 账户管理里创建支持读写的账号；WebDAV 用户名密码与 Alist 登录账号一致 |

> 🔐 **安全建议**：无论使用哪种 WebDAV，务必使用**应用专用密码**（不要填主账号登录密码）；WebDAV 连接采用 HTTPS 时流量全程加密。

---

## 📁 项目目录结构

```
虎窝笔记/
├── functions/                         # Cloudflare Pages Functions（Serverless API）
│   ├── _shared.ts                     #     ↳ 共享工具、Env 定义、KV 缓存封装
│   ├── _webdav.ts                     #     ↳ WebDAV 客户端封装（Workers 兼容版）
│   └── api/
│       ├── config.ts                  #     ↳ GET    /api/config
│       ├── config/update.ts           #     ↳ POST   /api/config/update
│       ├── auth/login.ts              #     ↳ POST   /api/auth/login
│       ├── webdav/test.ts             #     ↳ POST   /api/webdav/test
│       ├── notes.ts                   #     ↳ GET/POST /api/notes
│       ├── notes/[id].ts              #     ↳ DELETE /api/notes/:id
│       ├── upload.ts                  #     ↳ POST   /api/upload
│       └── media/[filename].ts        #     ↳ GET/DELETE /api/media/:filename
├── src/                               # 前端 React 源码
│   ├── components/                    #     ↳ UI 组件（编辑器/侧边栏/顶栏等）
│   ├── App.tsx                        #     ↳ 主业务逻辑
│   ├── types.ts                       #     ↳ TypeScript 类型定义
│   ├── main.tsx                       #     ↳ React 入口
│   └── index.css                      #     ↳ Tailwind 样式
├── public/
│   └── _redirects                     # SPA 路由回退规则（/* → /index.html 200）
├── wrangler.toml                      # Pages 运行时配置（保持极简三行）
├── tsconfig.json
├── vite.config.ts
├── package.json
├── .env.example                       # 环境变量示例（仅阅读参考，不生效）
└── index.html                         # Vite HTML 入口
```

---

## 📄 License

MIT License
