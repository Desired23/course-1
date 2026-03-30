const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const srcRoot = path.join(projectRoot, 'src')
const includeExt = new Set(['.ts', '.tsx'])
const excludedSegments = [
  `${path.sep}locales${path.sep}`,
  `${path.sep}mocks${path.sep}`,
  `${path.sep}data${path.sep}`,
  `${path.sep}services${path.sep}`,
  `${path.sep}components${path.sep}ui${path.sep}`,
]
const explicitTsFiles = new Set([
  path.join(srcRoot, 'utils', 'notifications.ts'),
  path.join(srcRoot, 'utils', 'navigation.ts'),
  path.join(srcRoot, 'utils', 'realtimeNotifications.ts'),
  path.join(srcRoot, 'utils', 'formatters.ts'),
  path.join(srcRoot, 'stores', 'auth.store.ts'),
  path.join(srcRoot, 'stores', 'cart.store.ts'),
])

const findings = []

function shouldIgnoreSnippet(snippet) {
  const trimmed = snippet.trim()
  if (!trimmed) return true

  const exactIgnoredSnippets = new Set([
    'Promise',
    'void | Promise',
    'return',
    'default: return',
    'case \'trialing\': return',
    'case \'past_due\': return',
    'case \'canceled\': return',
    'case \'paused\': return',
    'case \'tablet\': return',
    'case \'mobile\': return',
    'case \'Crown\': return',
    'case \'Shield\': return',
    'continue_with',
    'stderr',
    'stdout',
    'URL',
    'API',
    'JD',
    'PDF',
    'UTC',
    'USD',
    'EUR',
    'GBP',
    'VND',
    'sm',
    'md',
    'lg',
    'all',
    'free',
    'paid',
    'mode',
    'sort',
    'limit',
    'items',
    'icon',
    'html',
    'component',
    'show_search',
    'show_stats',
    'use_public_stats',
    'primary_cta_link',
    'secondary_cta_link',
    'pinned_course_ids',
    'payments selected',
    'Fix selected',
    'Select refund mode',
    'attachments?: Array',
    'step.id ?',
    'https://...',
    'https://example.com',
    '#A435F0',
    '#5624D0',
    '#3b82f6',
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Poppins',
    'ACME',
    'StarkInd',
    'Wayne',
    'Tech',
    'Cyber',
    'Dyne',
  ])

  if (exactIgnoredSnippets.has(trimmed)) {
    return true
  }

  // Ignore translation keys and other key-like identifiers after i18n migration.
  if (/^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/i.test(trimmed)) {
    return true
  }

  // Ignore obvious code fragments that the regexes occasionally capture.
  if (/[(){}=>]/.test(trimmed) || trimmed.includes('&&') || trimmed.includes('||')) {
    return true
  }

  if (/^(?:[A-Z][a-z]?|[A-Z]{2,})$/.test(trimmed)) {
    return true
  }

  if (/^(?:[A-Za-z0-9_-]+\/?)+$/.test(trimmed) && /[_/]/.test(trimmed)) {
    return true
  }

  if (/^(?:Manual pin picker|Add item|Add testimonial|Legacy Component|custom_html Settings|stats Settings|testimonial Settings)$/.test(trimmed)) {
    return true
  }

  return false
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath)
      continue
    }
    const ext = path.extname(entry.name)
    if (!includeExt.has(ext)) {
      continue
    }
    if (excludedSegments.some((segment) => fullPath.includes(segment))) {
      continue
    }
    if (ext === '.ts' && !explicitTsFiles.has(fullPath)) {
      continue
    }
    scanFile(fullPath)
  }
}

function lineNumberFor(content, index) {
  return content.slice(0, index).split(/\r?\n/).length
}

function scanPattern(content, filePath, regex, reason) {
  for (const match of content.matchAll(regex)) {
    const snippet = match[1] || match[0]
    if (!snippet) continue
    if (shouldIgnoreSnippet(snippet)) continue
    findings.push({
      filePath: path.relative(projectRoot, filePath),
      lineNumber: lineNumberFor(content, match.index || 0),
      reason,
      snippet: snippet.trim(),
    })
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const ext = path.extname(filePath)

  if (ext === '.tsx') {
    scanPattern(content, filePath, />\s*([A-Za-z][^<{`\n]*?)\s*</g, 'JSX text literal')
  }
  scanPattern(
    content,
    filePath,
    /\b(?:placeholder|title|aria-label|label|description)=["']([^"']*[A-Za-z][^"']*)["']/g,
    'String prop literal'
  )
  scanPattern(
    content,
    filePath,
    /\b(?:toast\.(?:success|error|warning|info)|alert|confirm)\(\s*["']([^"']*[A-Za-z][^"']*)["']/g,
    'Notification/dialog literal'
  )
  scanPattern(
    content,
    filePath,
    /\b(?:label|title|description|message|text|subtitle|heading)\s*:\s*["']([^"']*[A-Za-z][^"']*)["']/g,
    'Object literal text'
  )
}

walk(srcRoot)

if (findings.length === 0) {
  console.log('No suspicious hard-coded UI text found.')
  process.exit(0)
}

console.log(`Found ${findings.length} suspicious hard-coded UI strings:\n`)
for (const finding of findings) {
  console.log(`${finding.filePath}:${finding.lineNumber} [${finding.reason}] ${finding.snippet}`)
}

process.exit(1)
