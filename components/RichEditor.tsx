'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEffect, useCallback, useState } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Minus, Undo, Redo, Link as LinkIcon,
  Eye, Code2,
} from 'lucide-react';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  showWordCount?: boolean;
  /** 'full' = toolbar lengkap untuk naskah, 'comment' = toolbar minimal untuk komentar */
  mode?: 'full' | 'comment';
}

export function RichEditor({
  value,
  onChange,
  placeholder = 'Mulai menulis...',
  minHeight = 200,
  showWordCount = true,
  mode = 'full',
}: RichEditorProps) {
  const [viewMode, setViewMode] = useState<'editor' | 'html' | 'preview'>('editor');
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: mode === 'full' ? { levels: [1, 2, 3] } : false,
        blockquote: { HTMLAttributes: { class: 'tiptap-blockquote' } },
        bulletList: { HTMLAttributes: { class: 'tiptap-ul' } },
        orderedList: { HTMLAttributes: { class: 'tiptap-ol' } },
        horizontalRule: mode === 'full' ? {} : false,
        codeBlock: false,
        code: false,
      }),
      Underline,
      ...(mode === 'full'
        ? [
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({
              openOnClick: false,
              HTMLAttributes: { class: 'tiptap-link' },
            }),
          ]
        : []),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: [
          'tiptap-content outline-none',
          'prose prose-sm dark:prose-invert max-w-none',
          'text-gray-800 dark:text-gray-200',
        ].join(' '),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Emit empty string kalau hanya ada tag kosong
      onChange(html === '<p></p>' ? '' : html);
    },
    immediatelyRender: false,
  });

  // Sync value dari luar (misal saat load data)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== (current === '<p></p>' ? '' : current)) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL:', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const btnBase = 'p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30';
  const btnActive = 'bg-accent/15 text-accent';
  const btn = (active: boolean) => `${btnBase} ${active ? btnActive : 'text-gray-600 dark:text-gray-400'}`;

  const wordCount = editor.storage.characterCount?.words() ?? 0;
  const charCount = editor.storage.characterCount?.characters() ?? 0;

  return (
    <div className="border border-subtle dark:border-gray-700 rounded-xl overflow-hidden bg-brand-bg dark:bg-gray-900">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-subtle dark:border-gray-700 bg-brand-muted dark:bg-gray-800">

        {/* Heading (full only) */}
        {mode === 'full' && (
          <>
            <select
              value={
                editor.isActive('heading', { level: 1 }) ? '1'
                : editor.isActive('heading', { level: 2 }) ? '2'
                : editor.isActive('heading', { level: 3 }) ? '3'
                : '0'
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v === 0) editor.chain().focus().setParagraph().run();
                else editor.chain().focus().toggleHeading({ level: v as 1|2|3 }).run();
              }}
              className="text-xs px-2 py-1 rounded bg-transparent border border-subtle dark:border-gray-600 text-gray-700 dark:text-gray-300 mr-1"
            >
              <option value="0">Paragraf</option>
              <option value="1">Judul 1</option>
              <option value="2">Judul 2</option>
              <option value="3">Judul 3</option>
            </select>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
          </>
        )}

        {/* Bold / Italic / Underline / Strike */}
        <button title="Tebal" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))}>
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button title="Miring" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))}>
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button title="Garis bawah" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btn(editor.isActive('underline'))}>
          <UnderlineIcon className="h-3.5 w-3.5" />
        </button>
        <button title="Coret" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))}>
          <Strikethrough className="h-3.5 w-3.5" />
        </button>

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Align (full only) */}
        {mode === 'full' && (
          <>
            <button title="Rata kiri" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={btn(editor.isActive({ textAlign: 'left' }))}>
              <AlignLeft className="h-3.5 w-3.5" />
            </button>
            <button title="Rata tengah" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={btn(editor.isActive({ textAlign: 'center' }))}>
              <AlignCenter className="h-3.5 w-3.5" />
            </button>
            <button title="Rata kanan" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={btn(editor.isActive({ textAlign: 'right' }))}>
              <AlignRight className="h-3.5 w-3.5" />
            </button>
            <button title="Rata penuh" onClick={() => editor.chain().focus().setTextAlign('justify').run()} className={btn(editor.isActive({ textAlign: 'justify' }))}>
              <AlignJustify className="h-3.5 w-3.5" />
            </button>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
          </>
        )}

        {/* List */}
        <button title="Daftar poin" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))}>
          <List className="h-3.5 w-3.5" />
        </button>
        <button title="Daftar nomor" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))}>
          <ListOrdered className="h-3.5 w-3.5" />
        </button>

        {/* Blockquote & HR (full only) */}
        {mode === 'full' && (
          <>
            <button title="Kutipan" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))}>
              <Quote className="h-3.5 w-3.5" />
            </button>
            <button title="Garis pemisah" onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btn(false)}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button title="Link" onClick={setLink} className={btn(editor.isActive('link'))}>
              <LinkIcon className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

        {/* Undo / Redo */}
        <button title="Batalkan" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={btn(false)}>
          <Undo className="h-3.5 w-3.5" />
        </button>
        <button title="Ulangi" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={btn(false)}>
          <Redo className="h-3.5 w-3.5" />
        </button>

        {/* Word count + toggle view (kanan) */}
        <div className="ml-auto flex items-center gap-1.5 pr-1">
          {showWordCount && (
            <span className="text-[10px] text-gray-400 mr-1">
              {wordCount} kata · {charCount} karakter
            </span>
          )}
          {/* Tombol Preview */}
          <button
            title="Pratinjau tampilan"
            onClick={() => setViewMode(viewMode === 'preview' ? 'editor' : 'preview')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              viewMode === 'preview'
                ? 'bg-accent/15 text-accent'
                : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pratinjau</span>
          </button>
          {/* Tombol HTML source */}
          <button
            title="Lihat kode HTML"
            onClick={() => setViewMode(viewMode === 'html' ? 'editor' : 'html')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              viewMode === 'html'
                ? 'bg-gray-800 text-green-400'
                : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">HTML</span>
          </button>
        </div>
      </div>

      {/* ── Editor area ──────────────────────────────────────────────────── */}
      {viewMode === 'editor' && (
        <EditorContent
          editor={editor}
          style={{ minHeight }}
          className="px-4 py-3 cursor-text"
        />
      )}

      {viewMode === 'preview' && (
        <div
          className="story-reader-preview px-6 py-5"
          style={{ minHeight }}
        >
          <div
            className="tiptap-reader"
            style={{ fontSize: '16px', lineHeight: 1.9 }}
            dangerouslySetInnerHTML={{ __html: editor.getHTML() }}
          />
        </div>
      )}

      {viewMode === 'html' && (
        <div style={{ minHeight }} className="relative">
          <textarea
            value={editor.getHTML()}
            onChange={(e) => {
              editor.commands.setContent(e.target.value, false);
              onChange(e.target.value);
            }}
            style={{ minHeight, resize: 'vertical' }}
            className="w-full px-4 py-3 font-mono text-xs text-green-400 bg-gray-900 dark:bg-gray-950 outline-none leading-relaxed"
            spellCheck={false}
          />
          <span className="absolute top-2 right-3 text-[10px] text-gray-500 select-none">HTML source</span>
        </div>
      )}
    </div>
  );
}

/* ── Komponen kecil untuk render HTML komentar (safe) ─────────────────────── */
export function RichContent({ html, className = '' }: { html: string; className?: string }) {
  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none tiptap-output ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
