import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Note, Attachment, ViewMode } from '../types';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  CheckSquare,
  Table,
  Image as ImageIcon,
  Video,
  Paperclip,
  Eye,
  Edit3,
  Columns,
  Download,
  Trash2,
  Save,
  CheckCircle2,
  Tag,
  Folder,
  X,
  Upload,
  FileDown,
  Play,
  FileText,
  Clock,
  Sparkles,
  ChevronLeft,
  Copy,
  Check,
} from 'lucide-react';

// Code block with copy button
const PreBlock: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (preRef.current) {
      const codeText = preRef.current.innerText || '';
      navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative group my-4 select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
      <button
        onClick={handleCopyCode}
        className="absolute top-2.5 right-2.5 px-2.5 py-1 text-xs font-sans bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md border border-slate-700/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10 cursor-pointer select-none"
        title="复制代码"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-medium">已复制</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>复制</span>
          </>
        )}
      </button>
      <pre ref={preRef} className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-sm overflow-x-auto border border-slate-800 shadow-md">
        {children}
      </pre>
    </div>
  );
};

interface Props {
  note: Note;
  onUpdateNote: (updated: Note) => void;
  onDeleteNote: (id: string) => void;
  onUploadFile: (file: File) => Promise<Attachment | null>;
  isSaving: boolean;
  onToggleSidebarMobile?: () => void;
}

// Auto fix headings without space after #, e.g. "#标题" -> "# 标题"
function formatMarkdownContent(raw: string): string {
  if (!raw) return '';
  return raw.replace(/^(#{1,6})([^#\s])/gm, '$1 $2');
}

export const NoteEditor: React.FC<Props> = ({
  note,
  onUpdateNote,
  onDeleteNote,
  onUploadFile,
  isSaving,
  onToggleSidebarMobile,
}) => {
  // Default viewMode is 'preview' for existing notes, 'edit'/'split' for new notes
  const [viewMode, setViewMode] = useState<ViewMode>('preview');

  const [tagInput, setTagInput] = useState('');
  const [folderInput, setFolderInput] = useState(note.folder || '');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [copiedContent, setCopiedContent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaTypeRef = useRef<'image' | 'video' | 'file'>('image');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopyNoteContent = async () => {
    try {
      const fullText = `# ${note.title}\n\n${note.content || ''}`;
      await navigator.clipboard.writeText(fullText);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 2000);
    } catch (err) {
      console.error('Copy note failed:', err);
    }
  };

  // Automatically switch away from split mode on resize if window is small
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode === 'split') {
        setViewMode('edit');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  useEffect(() => {
    setFolderInput(note.folder || '');

    // Check if this is a newly created note or empty note
    const createdTime = new Date(note.createdAt).getTime();
    const isNewNote =
      !note.content ||
      note.title === '未命名笔记' ||
      (!isNaN(createdTime) && Date.now() - createdTime < 30000);

    if (isNewNote) {
      setViewMode(window.innerWidth >= 1024 ? 'split' : 'edit');
      // Auto focus content editor for quick typing
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setViewMode('preview');
    }
  }, [note.id]);

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNote({
      ...note,
      title: e.target.value,
    });
  };

  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateNote({
      ...note,
      content: e.target.value,
    });
  };

  // Add tag
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/^#/, '');
      if (!note.tags?.includes(newTag)) {
        onUpdateNote({
          ...note,
          tags: [...(note.tags || []), newTag],
        });
      }
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateNote({
      ...note,
      tags: (note.tags || []).filter((t) => t !== tagToRemove),
    });
  };

  // Handle folder blur/change
  const handleFolderChange = (val: string) => {
    setFolderInput(val);
    onUpdateNote({
      ...note,
      folder: val.trim() || undefined,
    });
  };

  // Markdown Toolbar helper to insert markdown syntax at cursor
  const insertSyntax = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || defaultText;
    const replacement = `${before}${selectedText}${after}`;

    const newContent =
      textarea.value.substring(0, start) + replacement + textarea.value.substring(end);

    onUpdateNote({
      ...note,
      content: newContent,
    });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 50);
  };

  // Upload file handler
  const processFileUpload = async (file: File, type: 'image' | 'video' | 'file') => {
    setUploadingMedia(true);
    setUploadProgressMsg(`正在上传并同步 ${file.name} 至 WebDAV 存储...`);

    try {
      const attachment = await onUploadFile(file);
      if (attachment) {
        // Append attachment metadata to note
        const updatedAttachments = [...(note.attachments || []), attachment];

        // Insert snippet into markdown editor content
        let markdownSnippet = '';
        if (type === 'image' || attachment.type === 'image') {
          markdownSnippet = `\n![${file.name}](${attachment.url})\n`;
        } else if (type === 'video' || attachment.type === 'video') {
          markdownSnippet = `\n<video controls src="${attachment.url}" title="${file.name}"></video>\n`;
        } else {
          markdownSnippet = `\n[📎 附件: ${file.name}](${attachment.url})\n`;
        }

        const newContent = (note.content || '') + markdownSnippet;

        onUpdateNote({
          ...note,
          content: newContent,
          attachments: updatedAttachments,
        });
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setUploadingMedia(false);
      setUploadProgressMsg('');
    }
  };

  // Trigger file picker for media
  const handleOpenMediaPicker = (type: 'image' | 'video' | 'file') => {
    mediaTypeRef.current = type;
    if (fileInputRef.current) {
      if (type === 'image') {
        fileInputRef.current.accept = 'image/*';
      } else if (type === 'video') {
        fileInputRef.current.accept = 'video/*';
      } else {
        fileInputRef.current.accept = '*/*';
      }
      fileInputRef.current.click();
    }
  };

  // File input change handler
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFileUpload(files[0], mediaTypeRef.current);
    }
    e.target.value = '';
  };

  // Handle Drag & Drop files directly onto editor
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      let type: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      processFileUpload(file, type);
    }
  };

  // Handle Clipboard Paste (e.g. screenshot or copied image file)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          e.preventDefault();
          const file = new File([blob], `image_${Date.now()}.png`, { type: blob.type });
          processFileUpload(file, 'image');
          break;
        }
      }
    }
  };

  // Export note as Markdown (.md) or JSON
  const handleExportMarkdown = () => {
    const element = document.createElement('a');
    const file = new Blob([note.content], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${note.title || '笔记'}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-100 overflow-hidden relative transition-colors">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Editor Header */}
      <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800 space-y-2.5 sm:space-y-3 transition-colors">
        {/* Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {onToggleSidebarMobile && (
              <button
                onClick={onToggleSidebarMobile}
                className="md:hidden px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-medium flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                title="返回笔记列表"
              >
                <ChevronLeft className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span>列表</span>
              </button>
            )}

            <input
              type="text"
              value={note.title}
              onChange={handleTitleChange}
              placeholder="输入笔记标题..."
              className="text-lg sm:text-2xl font-bold bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none w-full border-b border-transparent focus:border-slate-300 dark:focus:border-slate-700 pb-0.5 sm:pb-1 transition-colors truncate"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* View Mode Switcher */}
            <div className="bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700/80 flex items-center">
              <button
                onClick={() => setViewMode('edit')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors ${
                  viewMode === 'edit'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="纯编辑模式"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="inline">编辑</span>
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`hidden sm:flex px-2.5 py-1 text-xs font-medium rounded-lg items-center gap-1 transition-colors ${
                  viewMode === 'split'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="双栏实时预览"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>双栏</span>
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="纯阅览模式"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="inline">预览</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Sync status badge */}
              <div className="hidden lg:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-800/80 dark:border-slate-700/80 dark:text-slate-300">
                {isSaving ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-amber-600 dark:text-amber-400">正在同步...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-slate-700 dark:text-slate-300">已同步 WebDAV</span>
                  </>
                )}
              </div>

              {/* Copy Note Content */}
              <button
                onClick={handleCopyNoteContent}
                className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                title="一键复制笔记全文内容"
              >
                {copiedContent ? (
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {/* Export Markdown */}
              <button
                onClick={handleExportMarkdown}
                className="p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                title="导出 Markdown 文件 (.md)"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Delete note */}
              <button
                onClick={() => onDeleteNote(note.id)}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                title="删除此笔记"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Folder & Tags Bar */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-0.5 overflow-x-auto no-scrollbar">
          {/* Folder Category */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/60 shrink-0">
            <Folder className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <input
              type="text"
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              onBlur={(e) => handleFolderChange(e.target.value)}
              placeholder="设置分类..."
              className="bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none w-20 sm:w-28 text-xs"
            />
          </div>

          {/* Tags list */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Tag className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
            {(note.tags || []).map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700/60 shrink-0"
              >
                #{t}
                <button
                  onClick={() => handleRemoveTag(t)}
                  className="hover:text-rose-500 dark:hover:text-rose-400 p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="+ 标签"
              className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-md px-2 py-0.5 text-xs focus:outline-none focus:border-indigo-500 w-20 sm:w-28"
            />
          </div>
        </div>

        {/* Media & Formatting Toolbar (Mobile Touch Scrollable) */}
        {viewMode !== 'preview' && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 overflow-x-auto no-scrollbar pb-0.5">
            {/* Formatting shortcuts */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => insertSyntax('**', '**', '粗体文本')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                title="加粗"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertSyntax('*', '*', '斜体文本')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                title="斜体"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertSyntax('~~', '~~', '删除线文本')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                title="删除线"
              >
                <Strikethrough className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-slate-300 dark:bg-slate-800 mx-0.5" />
              <button
                onClick={() => insertSyntax('# ', '', '一级标题')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                title="一级标题"
              >
                <Heading1 className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertSyntax('## ', '', '二级标题')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                title="二级标题"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-slate-300 dark:bg-slate-800 mx-0.5" />
              <button
                onClick={() => insertSyntax('- ', '', '无序列表项')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                title="无序列表"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertSyntax('1. ', '', '有序列表项')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                title="有序列表"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertSyntax('- [ ] ', '', '待办任务')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                title="待办清单"
              >
                <CheckSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertSyntax('> ', '', '引用文本')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                title="引用"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertSyntax('```javascript\n', '\n```', '// 代码内容')}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                title="代码块"
              >
                <Code className="w-4 h-4" />
              </button>
            </div>

            {/* Media Upload Buttons (Featured) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleOpenMediaPicker('image')}
                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 dark:text-emerald-300 dark:border-emerald-500/30 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="插入图片并上传至 WebDAV 存储"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>图片</span>
              </button>

              <button
                onClick={() => handleOpenMediaPicker('video')}
                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 dark:text-indigo-300 dark:border-indigo-500/30 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="插入视频并上传至 WebDAV 存储"
              >
                <Video className="w-3.5 h-3.5" />
                <span>视频</span>
              </button>

              <button
                onClick={() => handleOpenMediaPicker('file')}
                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-600/20 dark:hover:bg-amber-600/30 dark:text-amber-300 dark:border-amber-500/30 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="插入 PDF / 文档 / 压缩包附件"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>附件</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Uploading overlay message */}
      {uploadingMedia && (
        <div className="bg-blue-50 border-b border-blue-200 dark:bg-blue-600/20 dark:border-blue-500/40 px-4 py-2 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-200 animate-pulse">
          <Upload className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-bounce" />
          <span>{uploadProgressMsg}</span>
        </div>
      )}

      {/* Main Content Workspace (Editor + Markdown Preview) */}
      <div className="flex-1 flex overflow-hidden relative" onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
        {/* Left: Raw Textarea Editor */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div
            className={`h-full flex flex-col ${
              viewMode === 'split' ? 'w-1/2 border-r border-slate-200 dark:border-slate-800' : 'w-full'
            }`}
          >
            <textarea
              ref={textareaRef}
              value={note.content}
              onChange={handleContentChange}
              onPaste={handlePaste}
              placeholder="在此处输入 Markdown 内容，可直接拖拽图片、视频或文档附件放置于此处，或使用 Ctrl+V 黏贴剪贴板图片..."
              className="w-full h-full p-3.5 sm:p-5 bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none resize-none font-mono text-base sm:text-sm leading-relaxed custom-scrollbar"
            />
          </div>
        )}

        {/* Right: Markdown Live Previewer */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className={`h-full overflow-y-auto p-3.5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 custom-scrollbar select-text ${
              viewMode === 'split' ? 'w-1/2' : 'w-full max-w-4xl mx-auto'
            }`}
            style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
          >
            <article
              className="prose dark:prose-invert max-w-none prose-p:leading-relaxed text-slate-800 dark:text-slate-200 select-text"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Paragraph container replacement to prevent invalid nesting inside <p>
                  p: ({ node, children, ...props }) => {
                    return <div className="mb-4 leading-relaxed">{children}</div>;
                  },
                  // Headings
                  h1: ({ children }) => (
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-6 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800 leading-tight">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-5 mb-2.5 pb-1 border-b border-slate-200/60 dark:border-slate-800/60 leading-tight">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2 leading-tight">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-3 mb-1.5 leading-tight">
                      {children}
                    </h4>
                  ),
                  h5: ({ children }) => (
                    <h5 className="text-sm sm:text-base font-bold text-slate-700 dark:text-slate-300 mt-3 mb-1">
                      {children}
                    </h5>
                  ),
                  h6: ({ children }) => (
                    <h6 className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 mb-1 uppercase tracking-wider">
                      {children}
                    </h6>
                  ),
                  // Text formatting
                  strong: ({ children }) => (
                    <strong className="font-bold text-slate-900 dark:text-white">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-slate-800 dark:text-slate-200">
                      {children}
                    </em>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="my-4 pl-4 border-l-4 border-blue-500 dark:border-blue-400 italic text-slate-700 dark:text-slate-300 bg-blue-50/50 dark:bg-blue-950/30 py-2 pr-3 rounded-r-lg">
                      {children}
                    </blockquote>
                  ),
                  // Lists
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside my-3 space-y-1 text-slate-800 dark:text-slate-200 pl-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside my-3 space-y-1 text-slate-800 dark:text-slate-200 pl-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">
                      {children}
                    </li>
                  ),
                  // Code blocks & Inline code
                  code: ({ inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    if (inline || !match) {
                      return (
                        <code className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 font-mono text-sm font-semibold border border-slate-200 dark:border-slate-700">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: PreBlock,
                  hr: () => (
                    <hr className="my-6 border-slate-200 dark:border-slate-800" />
                  ),
                  // Tables
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-sm text-slate-800 dark:text-slate-200 border-collapse">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="bg-slate-100 dark:bg-slate-800 p-2.5 font-bold border-b border-slate-200 dark:border-slate-700">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="p-2.5 border-b border-slate-100 dark:border-slate-800/60">
                      {children}
                    </td>
                  ),
                  // Custom Image Renderer with Lightbox support
                  img: ({ node, ...props }) => {
                    const src = props.src || '';
                    return (
                      <span className="my-4 group relative inline-block">
                        <img
                          {...props}
                          src={src}
                          alt={props.alt || '图片'}
                          className="rounded-xl max-h-96 object-contain border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-xl cursor-pointer transition-transform hover:scale-[1.01]"
                          onClick={() => setSelectedImageModal(src)}
                        />
                        {props.alt && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block text-center italic">
                            {props.alt}
                          </span>
                        )}
                      </span>
                    );
                  },
                  // Custom Video Renderer
                  video: ({ node, ...props }: any) => {
                    return (
                      <div className="my-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-2 shadow-lg dark:shadow-2xl">
                        <div className="flex items-center gap-2 mb-2 px-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                          <Video className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                          <span>{props.title || '视频预览'}</span>
                        </div>
                        <video
                          controls
                          src={props.src}
                          className="w-full max-h-[420px] rounded-xl bg-black"
                        >
                          您的浏览器不支持视频播放。
                        </video>
                      </div>
                    );
                  },
                  // Custom Attachment Link Renderer
                  a: ({ node, children, ...props }) => {
                    const href = props.href || '';
                    const labelStr = String(children);
                    const isAttachment = labelStr.includes('附件') || href.includes('/api/media/');

                    if (isAttachment) {
                      return (
                        <a
                          {...props}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="my-3 inline-flex items-center gap-3 p-3 bg-white hover:bg-slate-50 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-blue-500/60 rounded-xl text-slate-800 dark:text-slate-200 transition-all no-underline shadow-xs"
                        >
                          <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                            <Paperclip className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {labelStr.replace(/^\[?📎\s*附件:\s*/, '').replace(/\]?$/, '')}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">点击下载 / 在新标签页打开</div>
                          </div>
                          <FileDown className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                        </a>
                      );
                    }

                    return (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {formatMarkdownContent(note.content) || '*无内容，在左侧输入 Markdown...*'}
              </ReactMarkdown>
            </article>
          </div>
        )}
      </div>

      {/* Image Lightbox Modal */}
      {selectedImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setSelectedImageModal(null)}
        >
          <img
            src={selectedImageModal}
            alt="大图预览"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
          <button
            onClick={() => setSelectedImageModal(null)}
            className="absolute top-4 right-4 text-white bg-slate-800/80 p-2 rounded-full hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
