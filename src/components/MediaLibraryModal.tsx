import React, { useState } from 'react';
import { X, Image as ImageIcon, Video, Paperclip, Download, Copy, Check, Search, ExternalLink } from 'lucide-react';
import { Note, Attachment } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onInsertMediaToCurrentNote?: (attachment: Attachment) => void;
}

export const MediaLibraryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  notes,
  onInsertMediaToCurrentNote,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'file'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Flatten all attachments from all notes
  const allAttachments: { attachment: Attachment; noteTitle: string }[] = [];
  notes.forEach((note) => {
    (note.attachments || []).forEach((att) => {
      allAttachments.push({ attachment: att, noteTitle: note.title || '无标题笔记' });
    });
  });

  // Filter
  const filtered = allAttachments.filter(({ attachment, noteTitle }) => {
    const matchesType = filterType === 'all' || attachment.type === filterType;
    const matchesSearch =
      !searchQuery ||
      attachment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      noteTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] transition-colors">
        {/* Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">网络记事本媒体与附件库</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
              {filtered.length} 个文件
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Filter */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700/60 w-full sm:w-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                filterType === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              全部附件
            </button>
            <button
              onClick={() => setFilterType('image')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 ${
                filterType === 'image' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> 图片
            </button>
            <button
              onClick={() => setFilterType('video')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 ${
                filterType === 'video' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Video className="w-3.5 h-3.5" /> 视频
            </button>
            <button
              onClick={() => setFilterType('file')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 ${
                filterType === 'file' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" /> 文档/附件
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="按文件名搜索..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder-slate-500 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400 dark:text-slate-500">
              <Paperclip className="w-12 h-12 mx-auto mb-3 text-slate-400 dark:text-slate-600 stroke-[1.5]" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">尚无媒体文件或附件</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">在笔记编辑器中上传图片、视频或文档附件，文件将自动展示于此处</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(({ attachment, noteTitle }) => (
                <div
                  key={attachment.id}
                  className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden flex flex-col group hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-xs dark:shadow-md"
                >
                  {/* Thumbnail */}
                  <div className="h-36 bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative overflow-hidden">
                    {attachment.type === 'image' ? (
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : attachment.type === 'video' ? (
                      <video
                        src={attachment.url}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="p-4 text-center">
                        <Paperclip className="w-10 h-10 text-amber-500 dark:text-amber-400 mx-auto mb-1" />
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono">
                          {attachment.mimeType || 'FILE'}
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-slate-800 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        title="在新标签页预览 / 下载"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleCopyLink(attachment.url, attachment.id)}
                        className="p-2 bg-slate-800 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                        title="复制链接"
                      >
                        {copiedId === attachment.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Metadata info */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1" title={attachment.name}>
                        {attachment.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">来源笔记: {noteTitle}</p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700/40">
                      <span>{formatSize(attachment.size)}</span>
                      {onInsertMediaToCurrentNote && (
                        <button
                          onClick={() => {
                            onInsertMediaToCurrentNote(attachment);
                            onClose();
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          插入当前笔记
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
