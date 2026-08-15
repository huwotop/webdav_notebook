import express from 'express';
import path from 'path';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  createDavClient,
  fetchAllNotes,
  saveNoteToWebDAV,
  deleteNoteFromWebDAV,
  uploadAttachmentToWebDAV,
  deleteAttachmentFromWebDAV,
  getAttachmentFile,
  testWebDAVConnection,
} from './server/webdav.js';
import { Note } from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Setup multer memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for attachments & videos
});

// Server runtime WebDAV Configuration state
let runtimeWebDavConfig = {
  url: process.env.WEBDAV_URL || '',
  username: process.env.WEBDAV_USERNAME || '',
  password: process.env.WEBDAV_PASSWORD || '',
  path: process.env.WEBDAV_PATH || '/WebDAV-Notes',
};

// Access password for notepad.
function getExpectedAccessPassword(): string {
  const envAuthPass = process.env.AUTH_PASSWORD || process.env.LOCK_PASSWORD;
  if (envAuthPass && envAuthPass.trim().length > 0) {
    return envAuthPass.trim();
  }
  return '';
}

// Get WebDAV Client instance
function getClientInstance(customConfig?: Partial<typeof runtimeWebDavConfig>) {
  const cfg = { ...runtimeWebDavConfig, ...customConfig };
  if (!cfg.url) return null;
  return createDavClient(cfg.url, cfg.username, cfg.password);
}

// API Routes
app.get('/api/config', (req, res) => {
  const siteName = process.env.SITE_NAME || '云端网络记事本';
  const hasWebDavEnv = Boolean(process.env.WEBDAV_URL);
  const hasAuthPassword = Boolean(
    process.env.AUTH_PASSWORD ||
    process.env.LOCK_PASSWORD
  );
  res.json({
    siteName,
    webdavUrl: process.env.WEBDAV_URL || runtimeWebDavConfig.url,
    webdavUsername: process.env.WEBDAV_USERNAME || runtimeWebDavConfig.username,
    hasWebDavEnv,
    hasAuthPassword,
    defaultPath: runtimeWebDavConfig.path,
    isConfigured: Boolean(runtimeWebDavConfig.url),
  });
});

// Update WebDAV Configuration dynamically
app.post('/api/config/update', async (req, res) => {
  const { url, username, password, path: subPath } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, message: 'WebDAV 地址不能为空' });
  }

  // Test connection first
  const testRes = await testWebDAVConnection(url, username, password, subPath || '/WebDAV-Notes');
  if (!testRes.success) {
    return res.status(400).json(testRes);
  }

  runtimeWebDavConfig = {
    url: url.trim(),
    username: (username || '').trim(),
    password: password || '',
    path: (subPath || '/WebDAV-Notes').trim(),
  };

  res.json({
    success: true,
    message: 'WebDAV 配置更新成功，已连通存储！',
    config: {
      url: runtimeWebDavConfig.url,
      username: runtimeWebDavConfig.username,
      path: runtimeWebDavConfig.path,
    },
  });
});

// Login Auth Verification
app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  const inputPassword = (password || '').trim();

  const envUrl = process.env.WEBDAV_URL || runtimeWebDavConfig.url;
  const envUser = process.env.WEBDAV_USERNAME || runtimeWebDavConfig.username;
  const envPass = process.env.WEBDAV_PASSWORD || runtimeWebDavConfig.password;

  // 1. 优先校验：如果环境变量配置了 AUTH_PASSWORD / LOCK_PASSWORD（网页访问密码）
  const expectedAccessPass = getExpectedAccessPassword();
  if (expectedAccessPass) {
    if (inputPassword === expectedAccessPass) {
      if (envUrl) {
        runtimeWebDavConfig.url = envUrl;
        runtimeWebDavConfig.username = envUser;
        if (envPass) {
          runtimeWebDavConfig.password = envPass;
        }
      }

      const sessionToken = Buffer.from(`${Date.now()}:auth_ok`).toString('base64');
      return res.json({
        success: true,
        token: sessionToken,
        message: '访问密码验证成功！',
        webdavUrl: runtimeWebDavConfig.url,
      });
    } else {
      return res.status(401).json({
        success: false,
        message: '访问密码错误，请重新输入。',
      });
    }
  }

  // 2. 如果未显式配置 AUTH_PASSWORD，但配置了 WEBDAV_PASSWORD
  if (envPass && envPass.trim().length > 0) {
    if (inputPassword === envPass.trim()) {
      if (envUrl) {
        runtimeWebDavConfig.url = envUrl;
        runtimeWebDavConfig.username = envUser;
        runtimeWebDavConfig.password = envPass;
      }

      const sessionToken = Buffer.from(`${Date.now()}:auth_ok`).toString('base64');
      return res.json({
        success: true,
        token: sessionToken,
        message: '访问密码验证成功！',
        webdavUrl: runtimeWebDavConfig.url,
      });
    } else {
      return res.status(401).json({
        success: false,
        message: '访问密码错误，请重新输入。',
      });
    }
  }

  // 3. 如果环境变量完全未配置任何密码要求，直接允许进入
  const sessionToken = Buffer.from(`${Date.now()}:auth_ok`).toString('base64');
  return res.json({
    success: true,
    token: sessionToken,
    message: '验证通过，已进入记事本。',
    webdavUrl: runtimeWebDavConfig.url,
  });
});

// Test WebDAV Connection
app.post('/api/webdav/test', async (req, res) => {
  const { url, username, password, path: subPath } = req.body;
  const targetUrl = url || runtimeWebDavConfig.url;
  const targetUser = username !== undefined ? username : runtimeWebDavConfig.username;
  const targetPass = password !== undefined ? password : runtimeWebDavConfig.password;
  const targetPath = subPath || runtimeWebDavConfig.path;

  if (!targetUrl) {
    return res.json({ success: false, message: '未设置 WebDAV 地址' });
  }

  const result = await testWebDAVConnection(targetUrl, targetUser, targetPass, targetPath);
  res.json(result);
});

// Get Notes list
app.get('/api/notes', async (req, res) => {
  try {
    const client = getClientInstance();
    const notes = await fetchAllNotes(client, runtimeWebDavConfig.path);
    res.json({ success: true, notes });
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ success: false, message: '获取笔记失败', notes: [] });
  }
});

// Save or Update Note
app.post('/api/notes', async (req, res) => {
  try {
    const note: Note = req.body;
    if (!note || !note.id || note.title === undefined) {
      return res.status(400).json({ success: false, message: '无效的笔记数据' });
    }

    note.updatedAt = new Date().toISOString();
    if (!note.createdAt) {
      note.createdAt = note.updatedAt;
    }

    const client = getClientInstance();
    const saved = await saveNoteToWebDAV(client, note, runtimeWebDavConfig.path);

    res.json({
      success: true,
      message: saved ? '已成功保存至 WebDAV 存储' : '已保存至本地（WebDAV 同步中）',
      note,
    });
  } catch (err) {
    console.error('Error saving note:', err);
    res.status(500).json({ success: false, message: '保存笔记失败' });
  }
});

// Delete Note
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: '缺失笔记ID' });
    }

    const client = getClientInstance();
    await deleteNoteFromWebDAV(client, id, runtimeWebDavConfig.path);

    res.json({ success: true, message: '笔记已成功删除' });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ success: false, message: '删除笔记失败' });
  }
});

// Upload Attachment (Images, Videos, Files)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '没有接收到上传文件' });
    }

    const client = getClientInstance();
    const attachment = await uploadAttachmentToWebDAV(
      client,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      runtimeWebDavConfig.path
    );

    res.json({
      success: true,
      message: '附件上传成功并已同步至 WebDAV',
      attachment,
    });
  } catch (err) {
    console.error('Error uploading attachment:', err);
    res.status(500).json({ success: false, message: `上传失败: ${(err as Error).message}` });
  }
});

// Stream/Serve Media and Attachment files
app.get('/api/media/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const client = getClientInstance();
    const fileResult = await getAttachmentFile(client, filename, runtimeWebDavConfig.path);

    if (!fileResult) {
      return res.status(404).send('File not found');
    }

    // Guess content type by extension if needed
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
      contentType = ext === '.svg' ? 'image/svg+xml' : `image/${ext.replace('.', '').replace('jpg', 'jpeg')}`;
    } else if (['.mp4', '.webm', '.mov', '.mkv'].includes(ext)) {
      contentType = `video/${ext.replace('.', '')}`;
    } else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
      contentType = `audio/${ext.replace('.', '')}`;
    } else if (ext === '.pdf') {
      contentType = 'application/pdf';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours cache
    res.send(fileResult.buffer);
  } catch (err) {
    console.error('Error serving media file:', err);
    res.status(500).send('Error serving file');
  }
});

// Delete Media / Attachment file
app.delete('/api/media/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({ success: false, message: '缺失文件名' });
    }
    const client = getClientInstance();
    await deleteAttachmentFromWebDAV(client, filename, runtimeWebDavConfig.path);
    res.json({ success: true, message: '附件文件已从 WebDAV 删除' });
  } catch (err) {
    console.error('Error deleting attachment:', err);
    res.status(500).json({ success: false, message: '删除附件失败' });
  }
});

// Start server function
async function startServer() {
  // Vite integration in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Static file serving in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WebDAV Notepad Server running at http://localhost:${PORT}`);
  });
}

startServer();
