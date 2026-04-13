import { useEffect, useRef, useState } from 'react'
import { loader } from '@monaco-editor/react'
import { Loader2 } from 'lucide-react'
import type { editor } from 'monaco-editor'
import { useUIStore } from '../stores/ui.store'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language: string
  height?: string
  readOnly?: boolean
  onSave?: () => void
  showMinimap?: boolean
  fontSize?: number
  autoHeight?: boolean
}

export function CodeEditor({
  value,
  onChange,
  language,
  height = '700px',
  readOnly = false,
  onSave,
  showMinimap = true,
  fontSize = 14,
  autoHeight = false,
}: CodeEditorProps) {
  const darkMode = useUIStore((state) => state.darkMode)
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)


  const getMonacoLanguage = (lang: string): string => {
    if (!lang) return 'javascript'
    const languageMap: Record<string, string> = {
      'javascript': 'javascript',
      'python': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'csharp': 'csharp',
      'php': 'php',
      'ruby': 'ruby',
      'go': 'go',
      'rust': 'rust',
      'typescript': 'typescript',
      'kotlin': 'kotlin',
      'swift': 'swift',
      'sql': 'sql',
    }
    return languageMap[lang.toLowerCase()] || 'javascript'
  }

  const monacoLanguage = getMonacoLanguage(language)


  useEffect(() => {
    let isMounted = true

    const initMonaco = async () => {
      try {
        const monaco = await loader.init()

        if (!isMounted) return

        monacoRef.current = monaco


        monaco.editor.defineTheme('udemy-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [
            { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
            { token: 'keyword', foreground: 'C586C0' },
            { token: 'string', foreground: 'CE9178' },
            { token: 'number', foreground: 'B5CEA8' },
            { token: 'function', foreground: 'DCDCAA' },
          ],
          colors: {
            'editor.background': '#1e1e1e',
            'editor.foreground': '#d4d4d4',
            'editor.lineHighlightBackground': '#2a2a2a',
            'editorLineNumber.foreground': '#858585',
            'editor.selectionBackground': '#264f78',
            'editor.inactiveSelectionBackground': '#3a3d41',
          },
        })

        monaco.editor.defineTheme('udemy-light', {
          base: 'vs',
          inherit: true,
          rules: [
            { token: 'comment', foreground: '008000', fontStyle: 'italic' },
            { token: 'keyword', foreground: '0000FF' },
            { token: 'string', foreground: 'A31515' },
            { token: 'number', foreground: '098658' },
            { token: 'function', foreground: '795E26' },
          ],
          colors: {
            'editor.background': '#ffffff',
            'editor.foreground': '#000000',
            'editor.lineHighlightBackground': '#f0f0f0',
            'editorLineNumber.foreground': '#237893',
            'editor.selectionBackground': '#add6ff',
            'editor.inactiveSelectionBackground': '#e5ebf1',
          },
        })

        if (containerRef.current && !editorRef.current) {
          const editorInstance = monaco.editor.create(containerRef.current, {
            value: value,
            language: monacoLanguage,
            theme: darkMode ? 'udemy-dark' : 'udemy-light',
            readOnly,
            fontSize,
            fontFamily: "'Fira Code', 'Monaco', 'Courier New', monospace",
            fontLigatures: true,
            minimap: { enabled: showMinimap },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            rulers: [80, 120],
            folding: true,
            bracketPairColorization: { enabled: true },
            formatOnPaste: true,
            formatOnType: true,
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoIndent: 'full',
            contextmenu: true,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            selectOnLineNumbers: true,
            matchBrackets: 'always',
            renderLineHighlight: 'all',
          })

          editorRef.current = editorInstance


          editorInstance.onDidChangeModelContent(() => {
            const currentValue = editorInstance.getValue()
            onChange(currentValue)
          })


          editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            if (onSave) onSave()
          })

          setIsLoading(false)
        }
      } catch (error) {
        console.error('Failed to initialize Monaco Editor:', error)
      }
    }

    initMonaco()

    return () => {
      isMounted = false
      if (editorRef.current) {
        editorRef.current.dispose()
        editorRef.current = null
      }
    }
  }, [])


  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel()
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, monacoLanguage)
      }
    }
  }, [monacoLanguage])

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        theme: darkMode ? 'udemy-dark' : 'udemy-light',
        readOnly,
        fontSize,
        minimap: { enabled: showMinimap }
      })
    }
  }, [darkMode, readOnly, fontSize, showMinimap])


  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue()
      if (value !== currentValue) {
        editorRef.current.setValue(value)
      }
    }
  }, [value])

  return (
    <div className="relative rounded-lg overflow-hidden border h-full bg-background">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />

      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border opacity-60 hover:opacity-100 transition-opacity z-10 pointer-events-none">
        {onSave && <span>💾 Ctrl+S to save | </span>}
        <span>🔍 Ctrl+F to find | 💬 Ctrl+/ to comment</span>
      </div>
    </div>
  )
}


export function useCodeEditor() {





  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  return {
    editorRef,
    getEditor: () => editorRef.current,
    format: () => {},
    undo: () => {},
    redo: () => {}
  }
}
