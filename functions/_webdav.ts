import { createClient, WebDAVClient } from 'webdav';

export type { WebDAVClient };

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

export async function fetchAllNotes(client: WebDAVClient | null, subPath: string = '/WebDAV-Notes'): Promise<any[]> {
  const notes: any[] = [];
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
      return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (err) {
      console.warn('WebDAV fetch failed:', (err as Error).message);
    }
  }

  return notes;
}

export async function saveNoteToWebDAV(
  client: WebDAVClient | null,
  note: any,
  subPath: string = '/WebDAV-Notes'
): Promise<boolean> {
  if (!client) return false;

  const cleanPath = normalizePath(subPath);
  const fileName = `note_${note.id}.json`;
  const remoteFilePath = normalizePath(`${cleanPath}/${fileName}`);
  const jsonContent = JSON.stringify(note, null, 2);

  try {
    await initWebDAVStructure(client, subPath);
    const encoder = new TextEncoder();
    const buffer = encoder.encode(jsonContent);
    await client.putFileContents(remoteFilePath, buffer, { overwrite: true });
    return true;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn(`Primary save note ${note.id} to ${remoteFilePath} notice (${errMsg}), retrying...`);

    try {
      await client.customRequest(remoteFilePath, { method: 'UNLOCK' });
    } catch (_) {}

    try {
      const encoder = new TextEncoder();
      const buffer = encoder.encode(jsonContent);
      await client.putFileContents(remoteFilePath, buffer, { overwrite: true });
      return true;
    } catch (retryErr: any) {
      const retryMsg = retryErr?.message || String(retryErr);
      console.warn(`Fallback save note ${note.id} to WebDAV notice:`, retryMsg);
      return false;
    }
  }
}

export function extractMediaFilenamesFromNote(note: any): Set<string> {
  const filenames = new Set<string>();

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
  if (!client) return false;

  try {
    const cleanPath = normalizePath(subPath);
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

export async function deleteNoteFromWebDAV(
  client: WebDAVClient | null,
  noteId: string,
  subPath: string = '/WebDAV-Notes'
): Promise<boolean> {
  if (!client) return false;

  const cleanPath = normalizePath(subPath);
  const fileName = `note_${noteId}.json`;
  const remoteFilePath = normalizePath(`${cleanPath}/${fileName}`);

  try {
    const allNotes = await fetchAllNotes(client, subPath);
    const targetNote = allNotes.find((n: any) => n.id === noteId);

    if (targetNote) {
      const targetFilenames = extractMediaFilenamesFromNote(targetNote);
      if (targetFilenames.size > 0) {
        const otherNotes = allNotes.filter((n: any) => n.id !== noteId);
        const otherFilenames = new Set<string>();
        for (const other of otherNotes) {
          const files = extractMediaFilenamesFromNote(other);
          files.forEach((f: string) => otherFilenames.add(f));
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

export async function uploadAttachmentToWebDAV(
  client: WebDAVClient | null,
  fileBuffer: ArrayBuffer,
  originalName: string,
  mimeType: string,
  subPath: string = '/WebDAV-Notes'
): Promise<any> {
  const ext = originalName.split('.').pop() ? '.' + originalName.split('.').pop()! : '';
  const fileId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  const safeFilename = `${fileId}${ext}`;
  const cleanPath = normalizePath(subPath);
  const remoteAttachPath = normalizePath(`${cleanPath}/attachments/${safeFilename}`);

  let mediaCategory: 'image' | 'video' | 'file' = 'file';
  if (mimeType.startsWith('image/')) {
    mediaCategory = 'image';
  } else if (mimeType.startsWith('video/')) {
    mediaCategory = 'video';
  }

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
    size: fileBuffer.byteLength,
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
): Promise<{ buffer: ArrayBuffer; mimeType?: string } | null> {
  if (!client) return null;

  try {
    const cleanPath = normalizePath(subPath);
    const remoteAttachPath = normalizePath(`${cleanPath}/attachments/${filename}`);
    const contents = await client.getFileContents(remoteAttachPath, { format: 'binary' });
    return { buffer: contents as ArrayBuffer };
  } catch (err) {
    console.error(`Error fetching attachment ${filename} from WebDAV:`, err);
  }

  return null;
}
