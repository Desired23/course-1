import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { FileText, Clock } from 'lucide-react'
import { cn } from './ui/utils'

interface ArticlePreviewProps {
  title: string
  content?: string
  duration?: string
  className?: string
}

export function ArticlePreview({ 
  title, 
  content, 
  duration,
  className 
}: ArticlePreviewProps) {
  const mockContent = content || `
    <h2>Introduction to React Hooks</h2>
    <p>React Hooks are functions that let you "hook into" React state and lifecycle features from function components. They were introduced in React 16.8 and have revolutionized the way we write React applications.</p>
    
    <h3>Why Use Hooks?</h3>
    <ul>
      <li><strong>Simpler Code:</strong> Hooks allow you to use state and other React features without writing a class.</li>
      <li><strong>Reusability:</strong> You can extract stateful logic from a component so it can be tested and reused independently.</li>
      <li><strong>Better Organization:</strong> Hooks let you organize logic inside a component into reusable isolated units.</li>
    </ul>

    <h3>Most Common Hooks</h3>
    <p>Here are the most frequently used React Hooks:</p>
    
    <h4>1. useState</h4>
    <p>The <code>useState</code> hook allows you to add state to functional components:</p>
    <pre><code>const [count, setCount] = useState(0);</code></pre>

    <h4>2. useEffect</h4>
    <p>The <code>useEffect</code> hook lets you perform side effects in function components:</p>
    <pre><code>useEffect(() => {
  document.title = \`Count: \${count}\`;
}, [count]);</code></pre>

    <h4>3. useContext</h4>
    <p>The <code>useContext</code> hook allows you to access context values without wrapping components:</p>
    <pre><code>const theme = useContext(ThemeContext);</code></pre>

    <h3>Rules of Hooks</h3>
    <p>There are two important rules you must follow when using Hooks:</p>
    <ol>
      <li>Only call Hooks at the top level of your function</li>
      <li>Only call Hooks from React function components or custom Hooks</li>
    </ol>

    <h3>Conclusion</h3>
    <p>React Hooks provide a more direct API to the React concepts you already know. They give you the power to write cleaner, more maintainable code while keeping the flexibility and performance benefits of React.</p>
  `

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="border-b bg-muted/30 p-6">
        <div className="flex items-start gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            {duration && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Reading time: {duration}</span>
              </div>
            )}
          </div>
          <Badge variant="secondary">Article</Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div 
          className="prose prose-sm dark:prose-invert max-w-none
            prose-headings:font-bold
            prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
            prose-h4:text-lg prose-h4:mt-4 prose-h4:mb-2
            prose-p:text-base prose-p:leading-relaxed prose-p:mb-4
            prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
            prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
            prose-li:mb-2
            prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
            prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
            prose-strong:font-semibold prose-strong:text-foreground
            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: mockContent }}
        />
      </div>
    </Card>
  )
}
