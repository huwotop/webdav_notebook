import { createClient, WebDAVClient } from 'webdav';
import path from 'path';
import fs from 'fs';
import { Note, Attachment } from '../src/types';

// In-memory or local file cache for high speed & fallback
const LOCAL_STORAGE_DIR = path.join(process.cwd(), '.local_notes_cache');
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  try {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
    fs.mkdirSync(path.join(LOCAL_STORAGE_DIR, 'attachments'), { recursive: true });
  } catch (err) {
    console.error('Failed to create local cache dir', err);
  }
}

export function normalizePath(p: string): string {
  if (!p) return '/';
  let clean = p.replace(/\\/g, '/').replace(/\/+/g, '/');
  if (!clean.startsWith('/')) clean = '/' + clean;
  if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);
  return clean;
}

export function createDavClient(url: string, username?: string, password?: string): WebDAVClient | null {
  if (!url) return null;
  try {
    // Sanitize URL
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    cleanUrl = cleanUrl.replace(/\/+$/, '');
    return createClient(cleanUrl, {
      username: username || '',
      password: password || '',
    });
  } catch (err) {
    console.error('Error initializing WebDAV client:', err);
    return null;
  }
}

async function ensureDirectoryExists(client: WebDAVClient, dirPath: string): Promise<void> {
  const normPath = normalizePath(dirPath);
  if (normPath === '/') return;

  const segments = normPath.split('/').filter(Boolean);
  let currentPath = '';

  for (const segment of segments) {
    currentPath += '/' + segment;
    try {
      const exists = await client.exists(currentPath);
      if (!exists) {
        await client.createDirectory(currentPath);
      }
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      const msg = err?.message || String(err);
      if (status === 405 || status === 409 || msg.includes('405') || msg.includes('409')) {
        continue;
      }
      console.warn(`Notice ensuring WebDAV directory ${currentPath}:`, msg);
    }
  }
}

export async function initWebDAVStructure(client: WebDAVClient, subPath: string = '/WebDAV-Notes'): Promise<boolean> {
  try {
    const cleanPath = normalizePath(subPath);
    if (cleanPath !== '/') {
      await ensureDirectoryExists(client, cleanPath);
    }
    const attachPath = normalizePath(`${cleanPath}/attachments`);
    await ensureDirectoryExists(client, attachPath);
    return true;
  } catch (err) {
    console.warn('WebDAV directory creation check notice:', (err as Error).message);
    return false;
  }
}

export async function testWebDAVConnection(url: string, username?: string, password?: string, subPath: string = '/WebDAV-Notes'): Promise<{ success: boolean; message: string }> {
  try {
    const client = createDavClient(url, username, password);
    if (!client) {
      return { success: false, message: 'WebDAV URL 无效' };
    }
    const exists = await client.exists('/');
    if (exists) {
      await initWebDAVStructure(client, subPath);
      return { success: true, message: 'WebDAV 连接成功！已准备好存储结构。' };
    } else {
      return { success: false, message: '连接成功，但无法访问根目录' };
    }
  } catch (err) {
    return { success: false, message: `连接失败: ${(err as Error).message || '网络或凭据错误'}` };
  }
}

export async function fetchAllNotes(client: WebDAVClient | null, subPath: string = '/WebDAV-Notes'): Promise<Note[]> {
  const notes: Note[] = [];
  const cleanPath = normalizePath(subPath);

  if (client) {
    try {
      await initWebDAVStructure(client, subPath);
      const directoryItems = await client.getDirectoryContents(cleanPath);
      if (Array.isArray(directoryItems)) {
        for (const item of directoryItems) {
          if (item.type === 'file' && item.filename.endsWith('.json') && !item.filename.includes('index.json')) {
            try {
              const fileContent = await client.getFileContents(item.filename, { format: 'text' });
              if (typeof fileContent === 'string') {
                const parsed = JSON.parse(fileContent);
                if (parsed && parsed.id && parsed.title !== undefined) {
                  notes.push(parsed);
                }
              }
            } catch (fileErr) {
              console.error(`Error reading note file ${item.filename}:`, fileErr);
            }
          }
        }
      }
      // Return notes sorted by updatedAt desc
      return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (err) {
      console.warn('WebDAV fetch failed, falling back to local cache:', (err as Error).message);
    }
  }

  // Local fallback
  try {
    const files = fs.readdirSync(LOCAL_STORAGE_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const fullPath = path.join(LOCAL_STORAGE_DIR, file);
        const data = fs.readFileSync(fullPath, 'utf-8');
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.id) {
            notes.push(parsed);
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.error('Error reading local cache:', err);
  }

  return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function saveNoteToWebDAV(
  client: WebDAVClient | null,
  note: Note,
  subPath: string = '/WebDAV-Notes'
): Promise<boolean> {
  const cleanPath = normalizePath(subPath);
  const fileName = `note_${note.id}.json`;
  const remoteFilePath = normalizePath(`${cleanPath}/${fileName}`);
  const localFilePath = path.join(LOCAL_STORAGE_DIR, fileName);
  const jsonContent = JSON.stringify(note, null, 2);

  // Always save to local cache
  let localSaved = false;
  try {
    fs.writeFileSync(localFilePath, jsonContent, 'utf-8');
    localSaved = true;
  } catch (err) {
    console.error('Error writing local note cache:', err);
  }

  // Save to WebDAV
  if (client) {
    try {
      await initWebDAVStructure(client, subPath);
      const buffer = Buffer.from(jsonContent, 'utf-8');
      await client.putFileContents(remoteFilePath, buffer, { overwrite: true });
      return true;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.warn(`Primary save note ${note.id} to ${remoteFilePath} notice (${errMsg}), attempting lock clearing & retry...`);

      // If locked (423) or error occurs, try custom UNLOCK request on the remote file
      try {
        await client.customRequest(remoteFilePath, { method: 'UNLOCK' });
      } catch (_) {}

      try {
        const buffer = Buffer.from(jsonContent, 'utf-8');
        await client.putFileContents(remoteFilePath, buffer, { overwrite: true });
        return true;
      } catch (retryErr: any) {
        const retryMsg = retryErr?.message || String(retryErr);
        console.warn(`Fallback save note ${note.id} to WebDAV notice:`, retryMsg);

        // If local file was written, treat as successful save so client doesn't error
        if (localSaved) {
          return true;
        }
        return false;
      }
    }
  }

  return true;
}

export function extractMediaFilenamesFromNote(note: Note): Set<string> {
  const filenames = new Set<string>();

  // 1. From note.attachments array
  if (Array.isArray(note.attachments)) {
    for (const att of note.attachments) {
      if (att.filename) {
        filenames.add(att.filename);
      } else if (att.url) {
        const parts = att.url.split('/api/media/');
        if (parts.length > 1) {
          filenames.add(parts[1].split('?')[0]);
        }
      }
    }
  }

  // 2. From note.content markdown text using regex
  if (note.content) {
    const regex = /\/api\/media\/([a-zA-Z0-9_.-]+)/g;
    let match;
    while ((match = regex.exec(note.content)) !== null) {
      if (match[1]) {
        filenames.add(match[1]);
      }
    }
  }

  return filenames;
}

export async function deleteAttachmentFromWebDAV(
  client: WebDAVClient | null,
  filename: string,
  subPath: string = '/WebDAV-Notes'
): Promise<boolean> {
  const cleanPath = normalizePath(subPath);
  const localAttachPath = path.join(LOCAL_STORAGE_DIR, 'attachments', filename);

  // Delete local file cache
  if (fs.existsSync(localAttachPath)) {
    try {
      fs.unlinkSync(localAttachPath);
    } catch (err) {
      console.error(`Error deleting local attachment file ${filename}:`, err);
    }
  }

  // Delete remote file on WebDAV
  if (client) {
    try {
      const remoteAttachPath = normalizePath(`${cleanPath}/attachments/${filename}`);
      const exists = await client.exists(remoteAttachPath);
      if (exists) {
        await client.deleteFile(remoteAttachPath);
      }
      return true;
    } catch (err) {
      console.error(`Failed to delete attachment ${filename} from WebDAV:`, err);
      return false;
    }
  }

  return true;
}

export async function deleteNoteFromWebDAV(
  client: WebDAVClient | null,
  noteId: string,
  subPath: string = '/WebDAV-Notes'
): Promise<boolean> {
  const cleanPath = normalizePath(subPath);
  const fileName = `note_${noteId}.json`;
  const remoteFilePath = normalizePath(`${cleanPath}/${fileName}`);
  const localFilePath = path.join(LOCAL_STORAGE_DIR, fileName);

  // Clean up associated attachments if they are not referenced by any other note
  try {
    const allNotes = await fetchAllNotes(client, subPath);
    const targetNote = allNotes.find((n) => n.id === noteId);

    if (targetNote) {
      const targetFilenames = extractMediaFilenamesFromNote(targetNote);
      if (targetFilenames.size > 0) {
        const otherNotes = allNotes.filter((n) => n.id !== noteId);
        const otherFilenames = new Set<string>();
        for (const other of otherNotes) {
          const files = extractMediaFilenamesFromNote(other);
          files.forEach((f) => otherFilenames.add(f));
        }

        for (const filename of targetFilenames) {
          if (!otherFilenames.has(filename)) {
            await deleteAttachmentFromWebDAV(client, filename, subPath);
          }
        }
      }
    }
  } catch (attErr) {
    console.error(`Error cleaning up attachments for note ${noteId}:`, attErr);
  }

  // Remove local cache file
  if (fs.existsSync(localFilePath)) {
    try {
      fs.unlinkSync(localFilePath);
    } catch (err) {
      console.error('Error deleting local cache file:', err);
    }
  }

  if (client) {
    try {
      const exists = await client.exists(remoteFilePath);
      if (exists) {
        await client.deleteFile(remoteFilePath);
      }
      return true;
    } catch (err) {
      console.error(`Failed to delete note ${noteId} from WebDAV:`, err);
      return false;
    }
  }

  return true;
}

export async function uploadAttachmentToWebDAV(
  client: WebDAVClient | null,
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  subPath: string = '/WebDAV-Notes'
): Promise<Attachment> {
  const ext = path.extname(originalName) || '';
  const fileId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  const safeFilename = `${fileId}${ext}`;
  const cleanPath = normalizePath(subPath);
  const remoteAttachPath = normalizePath(`${cleanPath}/attachments/${safeFilename}`);
  const localAttachPath = path.join(LOCAL_STORAGE_DIR, 'attachments', safeFilename);

  // Determine media type
  let mediaCategory: 'image' | 'video' | 'file' = 'file';
  if (mimeType.startsWith('image/')) {
    mediaCategory = 'image';
  } else if (mimeType.startsWith('video/')) {
    mediaCategory = 'video';
  }

  // Save to local cache
  try {
    fs.writeFileSync(localAttachPath, fileBuffer);
  } catch (err) {
    console.error('Error saving local attachment:', err);
  }

  // Upload to WebDAV if available
  if (client) {
    try {
      await initWebDAVStructure(client, subPath);
      await client.putFileContents(remoteAttachPath, fileBuffer, { overwrite: true });
    } catch (err) {
      console.error('Error uploading attachment to WebDAV:', err);
    }
  }

  return {
    id: fileId,
    name: originalName,
    size: fileBuffer.length,
    type: mediaCategory,
    mimeType,
    url: `/api/media/${safeFilename}`,
    filename: safeFilename,
    uploadedAt: new Date().toISOString(),
  };
}

export async function getAttachmentFile(
  client: WebDAVClient | null,
  filename: string,
  subPath: string = '/WebDAV-Notes'
): Promise<{ buffer: Buffer; mimeType?: string } | null> {
  const localAttachPath = path.join(LOCAL_STORAGE_DIR, 'attachments', filename);

  // First try local cache
  if (fs.existsSync(localAttachPath)) {
    try {
      const buffer = fs.readFileSync(localAttachPath);
      return { buffer };
    } catch (err) {
      console.error('Error reading local attachment cache:', err);
    }
  }

  // Next try WebDAV
  if (client) {
    try {
      const cleanPath = normalizePath(subPath);
      const remoteAttachPath = normalizePath(`${cleanPath}/attachments/${filename}`);
      const contents = await client.getFileContents(remoteAttachPath, { format: 'binary' });
      const buffer = Buffer.from(contents as ArrayBuffer);
      // Save to local cache for subsequent fast reads
      try {
        fs.writeFileSync(localAttachPath, buffer);
      } catch (_) {}
      return { buffer };
    } catch (err) {
      console.error(`Error fetching attachment ${filename} from WebDAV:`, err);
    }
  }

  return null;
}
