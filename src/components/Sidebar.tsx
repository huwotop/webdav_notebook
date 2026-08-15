import React, { useState } from 'react';
import { Note } from '../types';
import {
  Pin,
  Trash2,
  Tag,
  Folder,
  FileText,
  Clock,
  Image as ImageIcon,
  Video,
  Paperclip,
  ChevronRight,
  Filter,
  Github,
} from 'lucide-react';

interface Props {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Sidebar: React.FC<Props> = ({
  notes,
  activeNoteId,
  onSelectNote,
  onNewNote,
  onTogglePin,
  onDeleteNote,
  searchQuery,
  onSearchChange,
}) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Collect all unique tags and folders
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || []))).filter(Boolean);
  const allFolders = Array.from(new Set(notes.map((n) => n.folder).filter(Boolean))) as string[];

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    // Search query filter
    const matchesSearch =
      !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    // Tag filter
    const matchesTag = !selectedTag || note.tags?.includes(selectedTag);

    // Folder filter
    const matchesFolder = !selectedFolder || note.folder === selectedFolder;

    return matchesSearch && matchesTag && matchesFolder;
  });

  // Separate pinned and unpinned notes
  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const regularNotes = filteredNotes.filter((n) => !n.isPinned);

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));

      if (diffDays === 0) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return '昨天';
      } else if (diffDays < 7) {
        return `${diffDays}天前`;
      } else {
        return d.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
      }
    } catch (_) {
      return '';
    }
  };

  const renderNoteCard = (note: Note) => {
    const isActive = note.id === activeNoteId;
    const hasAttachments = note.attachments && note.attachments.length > 0;
    const imageCount = note.attachments?.filter((a) => a.type === 'image').length || 0;
    const videoCount = note.attachments?.filter((a) => a.type === 'video').length || 0;
    const fileCount = note.attachments?.filter((a) => a.type === 'file').length || 0;

    // Clean excerpt snippet
    const excerpt = note.content
      .replace(/#+\s+/g, '')
      .replace(/!\[.*?\]\(.*?\)/g, '[图片]')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/`{3}[\s\S]*?`{3}/g, '[代码]')
      .trim();

    return (
      <div
        key={note.id}
        onClick={() => onSelectNote(note.id)}
        className={`group relative p-3.5 rounded-xl transition-all cursor-pointer border ${
          isActive
            ? 'bg-blue-50/90 border-blue-400/80 text-blue-900 dark:bg-blue-900/30 dark:border-blue-500/50 dark:text-white shadow-xs'
            : 'bg-white hover:bg-slate-100/80 border-slate-200/90 hover:border-slate-300 text-slate-700 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 dark:border-slate-800/80 dark:hover:border-slate-700/80 dark:text-slate-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3
            className={`font-semibold text-sm line-clamp-1 flex-1 ${
              isActive ? 'text-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-white'
            }`}
          >
            {note.title || '无标题笔记'}
          </h3>
          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
            <button
              onClick={(e) => onTogglePin(note.id, e)}
              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-colors ${
                note.isPinned ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
              title={note.isPinned ? '取消置顶' : '置顶笔记'}
            >
              <Pin className="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              onClick={(e) => onDeleteNote(note.id, e)}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-500 dark:hover:text-rose-400 dark:hover:bg-slate-700/60 transition-colors opacity-0 group-hover:opacity-100"
              title="删除笔记"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2.5">
          {excerpt || <span className="italic text-slate-400 dark:text-slate-600">无正文内容</span>}
        </p>

        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              {formatDate(note.updatedAt)}
            </span>
            {note.folder && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300">
                <Folder className="w-2.5 h-2.5 text-blue-500 dark:text-blue-400" />
                {note.folder}
              </span>
            )}
          </div>

          {hasAttachments && (
            <div className="flex items-center gap-1.5 text-slate-400">
              {imageCount > 0 && (
                <span className="flex items-center gap-0.5" title={`${imageCount} 张图片`}>
                  <ImageIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  {imageCount}
                </span>
              )}
              {videoCount > 0 && (
                <span className="flex items-center gap-0.5" title={`${videoCount} 个视频`}>
                  <Video className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  {videoCount}
                </span>
              )}
              {fileCount > 0 && (
                <span className="flex items-center gap-0.5" title={`${fileCount} 个附件`}>
                  <Paperclip className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  {fileCount}
                </span>
              )}
            </div>
          )}
        </div>

        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/60">
            {note.tags.map((tag) => (
              <span
                key={tag}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTag(tag === selectedTag ? null : tag);
                }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-300/80 dark:hover:text-blue-200 dark:hover:bg-slate-700 transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-80 max-w-[85vw] bg-slate-50 border-r border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 flex flex-col h-[calc(100vh-4rem)] shrink-0 select-none shadow-2xl md:shadow-none transition-colors">
      {/* Mobile search bar */}
      <div className="p-3 sm:hidden border-b border-slate-200 dark:border-slate-800">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜索笔记..."
          className="w-full bg-white border border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-white rounded-xl px-3 py-1.5 text-sm focus:outline-none"
        />
      </div>

      {/* Category / Filter tags bar */}
      {(allFolders.length > 0 || allTags.length > 0) && (
        <div className="p-3 border-b border-slate-200 dark:border-slate-800/80 space-y-2 bg-slate-100/70 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> 快速筛选
            </span>
            {(selectedTag || selectedFolder) && (
              <button
                onClick={() => {
                  setSelectedTag(null);
                  setSelectedFolder(null);
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline text-[11px]"
              >
                清除筛选
              </button>
            )}
          </div>

          {/* Folders */}
          {allFolders.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase shrink-0">分类:</span>
              {allFolders.map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFolder(f === selectedFolder ? null : f)}
                  className={`text-xs px-2 py-0.5 rounded-lg shrink-0 flex items-center gap-1 transition-colors ${
                    selectedFolder === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700'
                  }`}
                >
                  <Folder className="w-3 h-3" />
                  {f}
                </button>
              ))}
            </div>
          )}

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase shrink-0">标签:</span>
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(t === selectedTag ? null : t)}
                  className={`text-xs px-2 py-0.5 rounded-lg shrink-0 flex items-center gap-1 transition-colors ${
                    selectedTag === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-400 dark:text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">未找到笔记</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              {searchQuery || selectedTag || selectedFolder
                ? '尝试更改搜索词或筛选条件'
                : '点击上方“新建笔记”按钮开始记录'}
            </p>
            <button
              onClick={onNewNote}
              className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              创建第一篇笔记
            </button>
          </div>
        ) : (
          <>
            {/* Pinned section */}
            {pinnedNotes.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400/90 tracking-wider uppercase flex items-center gap-1 px-1">
                  <Pin className="w-3 h-3 fill-current" /> 已置顶 ({pinnedNotes.length})
                </div>
                <div className="space-y-2">{pinnedNotes.map(renderNoteCard)}</div>
              </div>
            )}

            {/* Regular notes section */}
            {regularNotes.length > 0 && (
              <div className="space-y-2">
                {pinnedNotes.length > 0 && (
                  <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase px-1 pt-2">
                    更多笔记 ({regularNotes.length})
                  </div>
                )}
                <div className="space-y-2">{regularNotes.map(renderNoteCard)}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sidebar Footer Copyright */}
      <div className="p-3 bg-white dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
        <span>作者：<span className="text-slate-700 dark:text-slate-200 font-medium">可乐虎</span></span>
        <a
          href="https://github.com/huwotop/webdav_notebook"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
          title="GitHub 源码仓库"
        >
          <Github className="w-3.5 h-3.5" />
          <span>开源项目</span>
        </a>
      </div>
    </aside>
  );
};
