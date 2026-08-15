# 📝 WebDAV Notebook (云端同步记事本)

> 一款极简、轻量、无需数据库的 Markdown 网络记事本。支持将笔记内容与媒体附件（图片、视频、PDF 及常用文档）自动实时同步至任意标准 WebDAV 云端存储服务（如 坚果云、Nextcloud、Synology NAS、海康威视 NAS、自建 WebDAV 等）。支持标准 Docker 容器化一键部署。

---

## ✨ 核心特性

- ☁️ **WebDAV 全量实时同步**：所有笔记以标准 `.md` 格式无缝备份至 WebDAV 云端，数据完全由自己掌控。
- 🖼️ **全媒体附件管理**：支持粘贴剪贴板图片、拖拽上传及文件选择，媒体文件自动保存至 WebDAV 云端 `attachments/` 目录。
- 🎥 **内置视频与音频播放**：支持 MP4/WebM 视频直接在笔记中内嵌播放。
- 🧹 **智能文件清理**：删除笔记时，系统会自动清理该笔记独占引用的媒体附件，不占用云端冗余存储。
- 📱 **深度响应式移动端适配**：
  - 手机模式下精简顶栏，侧边栏抽屉手势操作。
  - 移动端默认阅读模式，阅览更流畅，点击即可无缝切换编辑。
- 🏷️ **灵活分类体系**：支持文件夹分类、多标签管理（`#标签`）、标题/全文检索与快速过滤。
- 🔒 **访问锁屏与安全认证**：通过统一访问密码口令进入记事本，保障私密笔记安全。
- 🐳 **Docker 容器化开箱即用**：零数据库配置，单镜像运行，资源开销极小。

---

## 🛠️ 技术栈

- **前端界面**：React 19 + TypeScript + Vite 6
- **后端服务**：Express 4 (Node.js API Proxy)
- **样式方案**：Tailwind CSS v4 + Lucide Icons
- **Markdown 渲染**：`react-markdown` + `remark-gfm`
- **存储协议**：`webdav` Node.js SDK
- **容器环境**：Alpine Linux + Node.js 22 LTS

---

## 🐳 Docker 部署指南 (推荐)

### 方法一：使用 Docker Compose 部署 (推荐)

1. 在服务器上创建项目目录并新建 `docker-compose.yml` 文件：

```bash
mkdir -p /opt/webdav-notepad && cd /opt/webdav-notepad
nano docker-compose.yml
```

2. 写入以下配置并根据需要填写环境变量：

```yaml
services:
  webdav-notepad:
    image: webdav-notepad:latest
    build:
      context: .
      dockerfile: Dockerfile
    container_name: webdav-notepad
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SITE_NAME=云端网络记事本
      # 网页访问/锁屏密码 (独立于 WebDAV 密码，留空则无需访问密码)
      - AUTH_PASSWORD=
      # WebDAV 存储配置 (可预设，也可在网页端初次登录时输入)
      - WEBDAV_URL=https://dav.jianguoyun.com/dav/
      - WEBDAV_USERNAME=your_email@example.com
      - WEBDAV_PASSWORD=your_webdav_app_password
      - WEBDAV_PATH=/WebDAV-Notes
```

3. 一键启动容器：

```bash
docker compose up -d
```

4. 打开浏览器访问 `http://<服务器IP>:3000` 即可开始使用！

---

### 方法二：使用 Docker CLI 运行

如果已有构建好的镜像或直接运行容器：

```bash
# 1. 构建镜像 (在项目根目录下)
docker build -t webdav-notepad:latest .

# 2. 运行容器
docker run -d \
  --name webdav-notepad \
  --restart unless-stopped \
  -p 3000:3000 \
  -e SITE_NAME="云端网络记事本" \
  -e AUTH_PASSWORD="your_site_password" \
  -e WEBDAV_URL="https://dav.jianguoyun.com/dav/" \
  -e WEBDAV_USERNAME="your_email@example.com" \
  -e WEBDAV_PASSWORD="your_webdav_app_password" \
  -e WEBDAV_PATH="/WebDAV-Notes" \
  webdav-notepad:latest
```

---

## ⚙️ 环境变量说明

| 环境变量 | 必填 | 默认值 | 说明 |
| :--- | :---: | :---: | :--- |
| `PORT` | 否 | `3000` | 容器内部及服务监听端口 |
| `SITE_NAME` | 否 | `云端网络记事本` | 自定义网页标题与顶栏站点名称 |
| `AUTH_PASSWORD` | 否 | *(留空)* | **网页访问/锁屏密码**。设置后访问网站需输入该密码，保障隐私安全 |
| `WEBDAV_URL` | 否 | *(留空)* | WebDAV 服务端接口地址 (如 `https://dav.jianguoyun.com/dav/`) |
| `WEBDAV_USERNAME` | 否 | *(留空)* | WebDAV 登录用户名/账号邮箱 |
| `WEBDAV_PASSWORD` | 否 | *(留空)* | **WebDAV 应用独立授权码/密码** (与 AUTH_PASSWORD 独立) |
| `WEBDAV_PATH` | 否 | `/WebDAV-Notes` | WebDAV 云端保存笔记的主目录路径 |

> 💡 **提示**：如果未在环境变量中配置 `WEBDAV_*` 参数，首次打开网页时系统会引导你在界面中输入连接信息，同样支持随时在设置中修改。

---

## 📖 常见 WebDAV 服务配置参考

| WebDAV 提供商 | 服务器地址 (WEBDAV_URL) | 推荐存储路径 | 授权码/密码获取方式 |
| :--- | :--- | :--- | :--- |
| **坚果云 (Jianguoyun)** | `https://dav.jianguoyun.com/dav/` | `/WebDAV-Notes` | 登录坚果云网页版 ➔ 账户信息 ➔ 安全选项 ➔ 第三方应用管理 ➔ 添加授权密码 |
| **Nextcloud / ownCloud** | `https://your-domain.com/remote.php/dav/files/username/` | `/WebDAV-Notes` | 个人设置 ➔ 安全 ➔ 设备与会话 ➔ 创建新应用密码 |
| **Synology 群晖 NAS** | `http(s)://your-nas-ip:5005/` (或 5006) | `/WebDAV-Notes` | 套件中心安装 WebDAV Server ➔ 启用 HTTP/HTTPS 端口 |
| **海康威视 NAS** | `http://your-nas-ip:8080/webdav/` | `/WebDAV-Notes` | 系统设置 ➔ 文件共享 ➔ 启用 WebDAV 服务 |
| **Alist / 115 / 百度网盘 WebDAV** | `http://your-alist-ip:5244/dav/` | `/WebDAV-Notes` | 在 Alist 中配置 WebDAV 挂载与读写权限 |

---

## 💻 本地开发与源码运行

如果你希望在本地直接运行开发环境：

```bash
# 1. 克隆代码并安装依赖
git clone https://github.com/huwotop/webdav_notebook.git
cd webdav_notebook
npm install

# 2. 复制环境配置文件
cp .env.example .env

# 3. 启动开发服务器 (支持热重载)
npm run dev

# 4. 生产环境本地编译与预览
npm run build
npm start
```

访问 `http://localhost:3000` 即可预览。

---

## 📄 License

MIT License
