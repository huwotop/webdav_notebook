# 📝 虎窝笔记 - WebDAV 同步记事本 (Cloudflare Pages 版)

> 一款极简、轻量、**零后端服务器**的 Markdown 网络记事本。部署在 **Cloudflare Pages**，通过 **Pages Functions** (Serverless) 对接任意标准 WebDAV 云端存储（坚果云、Nextcloud、群晖 NAS、Alist 等），笔记与媒体附件全自动双向同步。可选接入 **Cloudflare KV** 作为缓存层，显著降低 WebDAV 回源延迟，**个人免费额度完全够用**。

---

## ✨ 核心特性

- 🌐 **Serverless 云原生架构**：无 VPS、无 Node.js 进程常驻、无数据库、无 Docker。直接托管在 Cloudflare Pages，个人站点**免费即可运行**。
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
| 后端 API | **Cloudflare Pages Functions** (Workers Runtime, 原生 Edge Serverless) |
| 缓存层（可选） | **Cloudflare Workers KV**（边缘键值存储） |
| 样式方案 | Tailwind CSS v4 + Lucide Icons + Motion 动画 |
| Markdown 渲染 | `react-markdown` + `remark-gfm`（GitHub 风格表格 / 任务列表） |
| 存储协议 | `webdav` SDK (HTTP/WebDAV over fetch) |

---

## 🚀 部署到 Cloudflare Pages（推荐）

全程无需任何服务器，免费即可上线。

### 0. 前置准备

- 一个 [Cloudflare](https://dash.cloudflare.com/sign-up) 账号（免费）
- 一个标准 WebDAV 服务（坚果云 / Nextcloud / 群晖 / Alist 等，见文末常见配置参考）

---

### 方式一：通过 Git 仓库自动部署

最稳定、最推荐的方式。推送代码后自动构建并发布。

**步骤 1：创建 KV 命名空间（可选，但强烈推荐）**

为了启用**边缘缓存**，先创建一个 KV Namespace（不创建也不影响基础功能，会直接回源 WebDAV）：

1. 打开 Cloudflare 控制台 → **Workers & Pages** → **KV** → **Create a namespace**
2. Name 填写：`webdav-notepad-cache`（任意名字均可）
3. 点击 **Add** → 复制生成的 **Namespace ID**（稍后绑定要用）

**步骤 2：上传代码并创建 Pages 项目**

1. 先把本仓库推送到你自己的 GitHub / GitLab 仓库
2. Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 选择你的仓库 → **Begin setup**
4. 构建配置（Build settings）保持默认即可，Vite 配置已对齐：
   - **Project name**：取一个名字（决定了子域名，如 `huwo-notepad.pages.dev`）
   - **Framework preset**：Vite
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`
5. 点击 **Save and Deploy** 等待第一次构建完成（大约 1 分钟）

**步骤 3：绑定 KV 缓存（如果步骤 1 创建了）**

1. Pages 项目页 → **Settings** → **Functions** → **KV namespace bindings** → **Add binding**
2. **Variable name**：`NOTE_CACHE` ⚠️ **必须完全一致**，代码通过这个名字读取
3. **KV namespace**：下拉选中步骤 1 创建的 `webdav-notepad-cache`
4. **Save** 保存

> ⚡ 此绑定属于「生产环境」。若需要预览环境也用缓存，前往 **Preview** 栏位做同样绑定。

**步骤 4：配置环境变量**

前往 Pages 项目 → **Settings** → **Environment variables** → **Production** → **Add variables**

所有变量**无需加任何前缀**（不需要 `VITE_`、`CF_`），直接按下方表格填写：

| 变量名 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- |
| `WEBDAV_URL` | ⚠️ 条件必填 | *(留空)* | WebDAV 服务端地址，例如 `https://dav.jianguoyun.com/dav/`。**一旦填写，前端「设置」弹窗将被锁定，不允许用户随意修改**（适合个人独享站点）|
| `WEBDAV_USERNAME` | 同上 | *(留空)* | WebDAV 用户名 |
| `WEBDAV_PASSWORD` | 同上 | *(留空)* | WebDAV 应用授权码 / 密码 |
| `WEBDAV_PATH` | 否 | `/WebDAV-Notes` | WebDAV 内保存笔记的根目录 |
| `SITE_NAME` | 否 | `云端网络记事本` | 自定义网页标题与顶栏站点名称 |
| `AUTH_PASSWORD` / `LOCK_PASSWORD` | 否 | *(留空)* | **访问/锁屏密码**。设置后访问网页需要先输入该密码，保障隐私 |
| `KV_CACHE_TTL` | 否 | `3600` | KV 缓存存活秒数，默认 1 小时（`3600` 秒），改为 `86400` 为一天 |

> 💡 **多人使用场景**：把 `WEBDAV_URL` 等变量**留空**，每位用户首次访问时在「设置」弹窗中输入自己的 WebDAV 凭据即可——凭据以 **HttpOnly Cookie** 保存在对应浏览器会话中，服务端不持久化。

**步骤 5：重新部署生效**

Settings 里修改绑定或环境变量都不会重新构建。在 **Deployments** 标签里点击最新一次部署旁的 **···** → **Retry deployment** 或推送一个空 commit 即可触发重新部署并加载配置。

---

### 方式二：通过 Wrangler CLI 本地一键部署

如果你不想用 Git 集成，或需要从本地直接发布：

```bash
# 1. 克隆并安装依赖
git clone <your-repo> huwo-notepad && cd huwo-notepad
npm install

# 2. 构建
npm run build

# 3. 首次部署（会要求登录 Cloudflare 并选择 Pages 项目名）
npm run deploy
```

部署后 KV 绑定和环境变量仍需在控制台按方式一的「步骤 3/4」配置一次即可。

---

### 本地预览（模拟 Cloudflare Pages 环境）

```bash
# 安装依赖
npm install

# 启动 Vite 前端热更新开发服务器（不带 Functions）
npm run dev

# 或者：构建后用 wrangler pages dev 完整模拟 Pages + Functions + KV 绑定
# （需先在 wrangler.toml 配置 [[kv_namespaces]] 的 preview_id）
npm run build
npm run preview
```

访问 `http://localhost:8788`（wrangler pages dev 默认端口）或 `http://localhost:5173`（Vite dev）。

---

## ⚙️ 环境变量完整说明

所有变量均在 **Cloudflare Pages 控制台 → Settings → Environment variables** 设置，**不要创建 `.env` 文件**。

| 变量名 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- |
| `WEBDAV_URL` | 条件必填 | *(留空)* | WebDAV 服务器完整 URL。留空时用户可在网页端「设置」弹窗手动输入凭据。 |
| `WEBDAV_USERNAME` | 同上 | *(留空)* | WebDAV 登录用户名 |
| `WEBDAV_PASSWORD` | 同上 | *(留空)* | WebDAV 应用授权码 / 独立密码（**不要填登录主密码**） |
| `WEBDAV_PATH` | 否 | `/WebDAV-Notes` | WebDAV 内的根目录，如不存在会自动创建 |
| `SITE_NAME` | 否 | `云端网络记事本` | 站点标题与顶栏显示名 |
| `AUTH_PASSWORD` | 否 | *(留空)* | 全局访问/锁屏密码。留空时任何人打开网址即可进入。 |
| `LOCK_PASSWORD` | 否 | *(留空)* | `AUTH_PASSWORD` 的别名，两者填任一即可；若都填优先使用 `AUTH_PASSWORD`。 |
| `KV_CACHE_TTL` | 否 | `3600` | Cloudflare KV 缓存存活时间（秒），设太短会频繁回源，太长需等自然过期才刷新 |

---

## 📖 常见 WebDAV 服务配置参考

| 提供商 / 方案 | `WEBDAV_URL` 参考值 | 获取授权码 / 启用方式 |
| :--- | :--- | :--- |
| **坚果云 (Jianguoyun)** 🇨🇳 推荐 | `https://dav.jianguoyun.com/dav/` | 网页版 → 右上角头像 → 「账户信息」 → 「安全选项」 → 「第三方应用管理」 → 「添加授权密码」（**这里生成的密码才填 WEBDAV_PASSWORD**）|
| **Nextcloud / ownCloud** | `https://<你的域名>/remote.php/dav/files/<用户名>/` | 个人设置 → 安全 → 设备与会话 → 创建新「应用密码」 |
| **群晖 Synology NAS** | `http(s)://<NAS IP>:5005/`（HTTPS 为 5006） | 套件中心 → 安装 **WebDAV Server** → 勾选启用 HTTP/HTTPS；账号使用 DSM 账号密码 |
| **威联通 QNAP NAS** | `http(s)://<NAS IP>/webdav/` | 控制台 → 网络 & 文件服务 → WebDAV → 启用 |
| **Alist（挂载 115 / 阿里云盘 / 百度网盘等）** | `http(s)://<Alist地址>:5244/dav/` | Alist 后台 → 挂载对应网盘驱动 → 在 Alist 账户管理里创建支持读写的账号；WebDAV 用户名密码与 Alist 登录账号一致 |
| **Infisical / 腾讯云 COS WebDAV 网关** | 各网关服务地址 | 按各网关文档配置 |

> 🔐 **安全建议**：无论使用哪种 WebDAV，务必使用**应用专用密码**，避免泄漏主账号密码。WebDAV 连接采用 HTTPS 时流量全程加密。

---

## 🧠 Cloudflare KV 缓存层工作原理

启用后（绑定 `NOTE_CACHE`），所有 GET 请求都会优先走 KV：

```
客户端  →  Cloudflare Edge  →  KV 命中?  ──YES──▶ 直接返回（毫秒级，带 X-KV-Cache: HIT）
                                  │
                                  NO
                                  ▼
                            回源 WebDAV 服务器
                                  │
                                  ▼
                        异步回填 KV（下次即命中）
```

响应头会额外带：
- `X-KV-Cache: HIT` — 本次请求来自 KV 边缘缓存
- `X-KV-Cache: MISS` — KV 未命中，从 WebDAV 回源并写入缓存

**缓存失效策略（自动处理，无需人工干预）**：
- 保存笔记 → 删除 `notes:list` 键
- 删除笔记 → 删除 `notes:list` 键 + 该笔记所有关联附件的 media 键
- 删除单个附件 → 删除对应 `media:<filename>` 键
- 上传附件 → 立即预填充 `media:<filename>` KV 键 + 失效 notes list

KV 免费额度：**10 万次读/天、1000 次写/天、1GB 存储**，对个人笔记使用绰绰有余。

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
├── wrangler.toml                      # Cloudflare Pages / Wrangler CLI 配置
├── tsconfig.json
├── vite.config.ts
├── package.json
├── .env.example                       # 环境变量示例（参考用，不生效）
└── index.html                         # Vite HTML 入口
```

---

## 📝 常用命令速查

```bash
npm install          # 安装依赖
npm run dev          # 启动 Vite 前端开发服务器（热更新）
npm run build        # 生产构建到 dist/ 目录
npm run preview      # 使用 wrangler pages dev 本地完整模拟 Pages 环境
npm run deploy       # 一键部署 dist/ 到 Cloudflare Pages
npm run lint         # TypeScript 类型检查 (tsc --noEmit)
```

---

## 📄 License

MIT License
