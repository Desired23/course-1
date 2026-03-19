import React from 'react'

interface SafeCommentContentProps {
  content: string
  textClassName?: string
  codeClassName?: string
}

interface Segment {
  type: 'text' | 'code'
  value: string
  language?: string
}

function parseSegments(content: string): Segment[] {
  const segments: Segment[] = []
  const codeBlockRegex = /```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: content.slice(lastIndex, match.index),
      })
    }

    segments.push({
      type: 'code',
      language: match[1] || undefined,
      value: match[2] ?? '',
    })

    lastIndex = codeBlockRegex.lastIndex
  }

  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      value: content.slice(lastIndex),
    })
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', value: content })
  }

  return segments
}

export function SafeCommentContent({
  content,
  textClassName = 'text-sm text-muted-foreground whitespace-pre-wrap',
  codeClassName = 'text-xs font-mono',
}: SafeCommentContentProps) {
  const segments = parseSegments(content)

  return (
    <div className="space-y-2">
      {segments.map((segment, index) => {
        if (segment.type === 'code') {
          return (
            <div key={`code-${index}`} className="rounded-md border bg-muted/40">
              {segment.language ? (
                <div className="border-b px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {segment.language}
                </div>
              ) : null}
              <pre className="overflow-x-auto p-3">
                <code className={codeClassName}>{segment.value}</code>
              </pre>
            </div>
          )
        }

        if (!segment.value) return null
        return (
          <p key={`text-${index}`} className={textClassName}>
            {segment.value}
          </p>
        )
      })}
    </div>
  )
}

