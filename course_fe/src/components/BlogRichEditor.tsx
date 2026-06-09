import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Unlink,
} from 'lucide-react'
import { uploadFiles } from '../services/upload.api'
import './blog-editor.css'

function ResizableImageView({
  node,
  updateAttributes,
  selected,
}: {
  node: { attrs: { src: string; alt?: string; title?: string; width?: number | null } }
  updateAttributes: (attrs: Record<string, unknown>) => void
  selected: boolean
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const width = node.attrs.width ?? null

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = imgRef.current?.offsetWidth ?? (width ?? 400)

    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(80, startW + (ev.clientX - startX))
      updateAttributes({ width: newW })
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <NodeViewWrapper
      className={`resizable-image-wrapper${selected ? ' is-selected' : ''}`}
      style={width ? { width: `${width}px`, maxWidth: '100%' } : undefined}
    >
      <div style={{ position: 'relative' }}>
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt ?? ''}
          title={node.attrs.title ?? ''}
          style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '0.5rem' }}
        />
        {selected && (
          <div className="img-resize-handle" onMouseDown={startResize} />
        )}
      </div>
    </NodeViewWrapper>
  )
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute('width')
          return w ? Number(w) : null
        },
        renderHTML: (attrs) => (attrs.width ? { width: String(attrs.width) } : {}),
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView as any)
  },
})

interface BlogRichEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: string
}

function ToolbarBtn({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant={isActive ? 'secondary' : 'ghost'}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-8 w-8 p-0 shrink-0"
    >
      {children}
    </Button>
  )
}

export function BlogRichEditor({ content, onChange, placeholder, minHeight = '400px' }: BlogRichEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer' },
      }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: placeholder || 'Bắt đầu viết bài...' }),
      CharacterCount,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    if (!editor) return

    const nextContent = content || ''
    if (nextContent !== editor.getHTML()) {
      editor.commands.setContent(nextContent, { emitUpdate: false })
    }
  }, [content, editor])

  if (!editor) return null

  const wordCount = editor.storage.characterCount.words() as number
  const charCount = editor.storage.characterCount.characters() as number
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    try {
      const [uploaded] = await uploadFiles([file], { folder: 'blog', resource_type: 'image' })
      editor.chain().focus().setImage({ src: uploaded.url }).run()
    } catch {
    }
  }

  const handleSetLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Nhập URL liên kết:', prev ?? 'https://')
    if (!url) return
    editor.chain().focus().setLink({ href: url }).run()
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-2">
        <ToolbarBtn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Hoàn tác (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Làm lại (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Tiêu đề 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Tiêu đề 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Tiêu đề 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="In đậm (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="In nghiêng (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Gạch chân (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Gạch ngang"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Danh sách gạch đầu dòng"
        >
          <List className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Danh sách đánh số"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Trích dẫn"
        >
          <Quote className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Khối code"
        >
          <Code2 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Đường kẻ ngang"
        >
          <Minus className="h-4 w-4" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Căn trái"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Căn giữa"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Căn phải"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarBtn>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarBtn
          onClick={handleSetLink}
          isActive={editor.isActive('link')}
          title={editor.isActive('link') ? 'Xóa liên kết' : 'Chèn liên kết'}
        >
          {editor.isActive('link') ? <Unlink className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => imageInputRef.current?.click()}
          title="Chèn ảnh từ máy tính"
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarBtn>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleImageUpload(f)
            e.target.value = ''
          }}
        />
      </div>

      <EditorContent
        editor={editor}
        className="blog-editor-content"
        style={{ minHeight }}
      />

      <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <span>{wordCount.toLocaleString()} từ · {charCount.toLocaleString()} ký tự</span>
        <span>Đọc khoảng {readingTime} phút</span>
      </div>
    </div>
  )
}
