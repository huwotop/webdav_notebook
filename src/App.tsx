import React, { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { Note, Attachment, AppConfig } from './types';
import { AuthLockScreen } from './components/AuthLockScreen';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { NoteEditor } from './components/NoteEditor';
import { WebDavSettingsModal } from './components/WebDavSettingsModal';
import { MediaLibraryModal } from './components/MediaLibraryModal';

export default function App() {
  const [appConfig, setAppConfig] = useState<AppConfig>({
    siteName: '云端网络记事本',
    webdavUrl: '',
    hasWebDavEnv: false,
    defaultPath: '/WebDAV-Notes',
  });

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [webdavConnected, setWebdavConnected] = useState<boolean>(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('webdav_notepad_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Sync theme with document class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // 1. Fetch initial configuration
  useEffect(() => {
    fetchConfig();
  }, []);

  // Sync document title with siteName configuration
  useEffect(() => {
    if (appConfig.siteName) {
      document.title = appConfig.siteName;
    }
  }, [appConfig.siteName]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json() as any;
        if (data) {
          setAppConfig({
            siteName: data.siteName || '云端网络记事本',
            webdavUrl: data.webdavUrl || '',
            hasWebDavEnv: Boolean(data.hasWebDavEnv),
            defaultPath: data.defaultPath || '/WebDAV-Notes',
          });
          setWebdavConnected(Boolean(data.isConfigured));
        }
      } else {
        console.warn('Config endpoint did not return valid JSON:', res.status, contentType);
      }

      // Check saved token in localStorage
      const savedToken = localStorage.getItem('webdav_notepad_token');
      if (savedToken) {
        setIsAuthenticated(true);
        loadNotes();
      }
    } catch (err) {
      console.error('Error fetching configuration:', err);
    }
  };

  // 2. Load notes from server/WebDAV
  const loadNotes = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/notes', {
        headers: getAuthHeaders(),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json() as any;
        if (data && data.notes) {
          setNotes(data.notes);
          if (data.notes.length > 0 && !activeNoteId) {
            setActiveNoteId(data.notes[0].id);
          } else if (data.notes.length === 0) {
            // Create a welcome note if no notes exist
            createInitialWelcomeNote();
          }
        }
      }
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Welcome note template
  const createInitialWelcomeNote = async () => {
    const welcomeNote: Note = {
      id: Date.now().toString(),
      title: '👋 欢迎使用 WebDAV 云端网络记事本',
      content: `# 👋 欢迎使用 WebDAV 云端网络记事本\n\n这是一篇自动创建的示例笔记。您的所有文本、图片、视频和附件均安全存储于您的 **WebDAV** 云端存储中。\n\n## 🌟 核心功能一览\n\n- **数据全由自己掌握**: 支持坚果云、Nextcloud、ownCloud、群晖等标准 WebDAV 存储。\n- **📷 插入图片**: 支持拖拽、黏贴剪贴板图片与放大预览。\n- **🎥 插入视频**: 支持 MP4/WebM 视频直接在笔记中内嵌播放。\n- **📎 插入附件**: 支持上传 PDF、文档、压缩包等各种附件供随时下载。\n- **实时双栏预览**: 方便快速排版与阅览。\n- **部署支持**: 支持 Docker 容器化一键部署与私有服务器部署。\n\n--- \n*尝试在上方编辑此笔记，或点击“新建笔记”开始记录吧！*`,
      tags: ['指南', 'WebDAV'],
      folder: '快速入门',
      isPinned: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
    };

    setNotes([welcomeNote]);
    setActiveNoteId(welcomeNote.id);

    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(welcomeNote),
      });
    } catch (_) {}
  };

  // 3. Login handler
  const handleLogin = async (loginData: { password: string }) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        return {
          success: false,
          message: '后端 API 接口返回异常，请检查服务器连接或环境变量配置。',
        };
      }
      const data = await res.json() as any;
      if (data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('webdav_notepad_token', data.token || 'auth_ok');
        if (data.webdavUrl) {
          setAppConfig((prev) => ({ ...prev, webdavUrl: data.webdavUrl }));
          setWebdavConnected(true);
        }
        await loadNotes();
      }
      return data;
    } catch (err) {
      return { success: false, message: '请求失败，请检查网络连接' };
    }
  };

  // 4. Lock / Logout
  const handleLock = () => {
    localStorage.removeItem('webdav_notepad_token');
    setIsAuthenticated(false);
  };

  // 5. Create new note
  const handleNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: '未命名笔记',
      content: '',
      tags: [],
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
    };

    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
    setMobileSidebarOpen(false);

    // Save immediately to backend
    saveNoteToBackend(newNote);
  };

  // 6. Update note & Auto-save to backend
  const handleUpdateNote = (updatedNote: Note) => {
    // Immediate UI update
    setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));

    // Debounced auto-save to WebDAV backend
    setIsSaving(true);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveNoteToBackend(updatedNote);
    }, 1200);
  };

  const saveNoteToBackend = async (noteToSave: Note) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(noteToSave),
      });
      const data = await res.json() as any;
      if (data && data.success) {
        setWebdavConnected(true);
      }
    } catch (err) {
      console.error('Error saving note to WebDAV:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // 7. Toggle Pin
  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = notes.find((n) => n.id === id);
    if (target) {
      const updated = { ...target, isPinned: !target.isPinned };
      handleUpdateNote(updated);
    }
  };

  // 8. Delete note prompt & execution
  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNoteToDeleteId(id);
  };

  const executeDeleteNote = async (id: string) => {
    const nextNotes = notes.filter((n) => n.id !== id);
    setNotes(nextNotes);

    if (activeNoteId === id) {
      setActiveNoteId(nextNotes.length > 0 ? nextNotes[0].id : null);
    }
    setNoteToDeleteId(null);

    try {
      await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  // 9. File upload handler
  const handleUploadFile = async (file: File): Promise<Attachment | null> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsSyncing(true);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = await res.json() as any;
      if (data && data.success && data.attachment) {
        return data.attachment;
      }
    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      setIsSyncing(false);
    }
    return null;
  };

  // 10. Update WebDAV Settings
  const handleSaveWebDavConfig = async (cfg: {
    url: string;
    username: string;
    password?: string;
    path: string;
  }) => {
    try {
      const res = await fetch('/api/config/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(cfg),
      });
      const data = await res.json() as any;
      if (data.success) {
        if (data.token) {
          localStorage.setItem('webdav_notepad_token', data.token);
        }
        setAppConfig((prev) => ({
          ...prev,
          webdavUrl: cfg.url,
          webdavUsername: cfg.username,
          defaultPath: cfg.path,
        }));
        setWebdavConnected(true);
        loadNotes();
      }
      return data;
    } catch (err) {
      return { success: false, message: '保存 WebDAV 配置失败' };
    }
  };

  // Selected active note
  const activeNote = notes.find((n) => n.id === activeNoteId);

  // If not authenticated, show lock screen
  if (!isAuthenticated) {
    return (
      <AuthLockScreen
        siteName={appConfig.siteName}
        hasWebDavEnv={appConfig.hasWebDavEnv}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans overflow-hidden transition-colors">
      {/* Top Navbar */}
      <Navbar
        siteName={appConfig.siteName}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewNote={handleNewNote}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMediaLibrary={() => setIsMediaLibraryOpen(true)}
        onLock={handleLock}
        isSyncing={isSyncing}
        webdavConnected={webdavConnected}
        notesCount={notes.length}
        onToggleSidebarMobile={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar (Desktop + Mobile Drawer) */}
        <div
          className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity ${
            mobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setMobileSidebarOpen(false)}
        />

        <div
          className={`fixed md:relative z-40 md:z-auto transition-transform duration-300 transform ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <Sidebar
            notes={notes}
            activeNoteId={activeNoteId}
            onSelectNote={(id) => {
              setActiveNoteId(id);
              setMobileSidebarOpen(false);
            }}
            onNewNote={handleNewNote}
            onTogglePin={handleTogglePin}
            onDeleteNote={handleDeleteNote}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Note Editor Area */}
        {activeNote ? (
          <NoteEditor
            key={activeNote.id}
            note={activeNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={(id) => handleDeleteNote(id)}
            onUploadFile={handleUploadFile}
            isSaving={isSaving}
            onToggleSidebarMobile={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-white dark:bg-slate-950 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 mb-4 shadow-md dark:shadow-xl">
              📝
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-300 mb-1">未选择或新建笔记</h3>
            <p className="text-xs text-slate-500 max-w-sm mb-6">
              在左侧列表中选择一篇笔记开始编辑，或者点击下方按钮新建一篇存入 WebDAV 的笔记。
            </p>
            <button
              onClick={handleNewNote}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              + 新建笔记
            </button>
          </div>
        )}
      </div>

      {/* WebDAV Settings Modal */}
      <WebDavSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentConfig={{
          url: appConfig.webdavUrl,
          username: '',
          path: appConfig.defaultPath,
        }}
        onSaveConfig={handleSaveWebDavConfig}
      />

      {/* Media Library Modal */}
      <MediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        notes={notes}
        onInsertMediaToCurrentNote={(attachment) => {
          if (activeNote) {
            let snippet = '';
            if (attachment.type === 'image') {
              snippet = `\n![${attachment.name}](${attachment.url})\n`;
            } else if (attachment.type === 'video') {
              snippet = `\n<video controls src="${attachment.url}" title="${attachment.name}"></video>\n`;
            } else {
              snippet = `\n[📎 附件: ${attachment.name}](${attachment.url})\n`;
            }
            handleUpdateNote({
              ...activeNote,
              content: (activeNote.content || '') + snippet,
              attachments: [...(activeNote.attachments || []), attachment],
            });
          }
        }}
      />

      {/* Custom Delete Confirmation Modal */}
      {noteToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">确认彻底删除笔记？</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">此操作不可恢复，并将同步从 WebDAV 云端空间移除。</p>
              </div>
            </div>

            {(() => {
              const target = notes.find((n) => n.id === noteToDeleteId);
              return (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300">
                  <span className="text-slate-500 block mb-1">即将删除的笔记：</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                    {target?.title || '无标题笔记'}
                  </span>
                </div>
              );
            })()}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setNoteToDeleteId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => executeDeleteNote(noteToDeleteId)}
                className="px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
