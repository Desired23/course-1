import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { 
  Monitor, 
  Smartphone, 
  Tablet,
  X,
  Eye,
  Lock,
  Play,
  Check,
  XCircle,
  Code2,
  BookOpen,
  Loader2,
  ChevronUp,
  ChevronDown,
  Terminal,
  MessageSquare,
  Send,
  User,
  ThumbsUp,
  CornerDownRight,
  MoreVertical,
  Reply
} from 'lucide-react'
import { VideoPlayerPreview } from './VideoPlayerPreview'
import { QuizPreview } from './QuizPreview'
import { ArticlePreview } from './ArticlePreview'
import { cn } from './ui/utils'
import { useState, useEffect, useRef } from 'react'
import { CommentItem } from './CommentItem'

interface Lesson {
  id: number
  title: string
  type: string
  content_type?: string
  duration: string
  status: string
  is_free?: boolean
  description?: string
  videoUrl?: string
  content?: string
}

interface LessonPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lesson: Lesson
}

type DeviceType = 'desktop' | 'tablet' | 'mobile'
type ViewMode = 'free' | 'enrolled'

export function LessonPreviewModal({ 
  open, 
  onOpenChange, 
  lesson 
}: LessonPreviewModalProps) {
  const [device, setDevice] = useState<DeviceType>('desktop')
  const [viewMode, setViewMode] = useState<ViewMode>('enrolled')
  const [activeTab, setActiveTab] = useState<'problem' | 'code'>('problem')
  const [isRunning, setIsRunning] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [consoleOutput, setConsoleOutput] = useState<any>(null)
  const codeRef = useRef('')
  
  // Mock Comment Data (Based on LessonComment schema)
  const [comments, setComments] = useState<any[]>([
    {
      id: 1,
      user: 'Sarah Mitchell',
      avatar: 'S',
      date: '2 days ago',
      content: 'Is this solution definitely O(n)? I thought the string replacement might add overhead.',
      likes: 12,
      parentId: null,
      replies: [
        {
          id: 101,
          user: 'Instructor Team',
          avatar: 'I',
          date: '1 day ago',
          content: 'Good catch! The replace regex is also O(n), so the total complexity remains O(n) + O(n) which simplifies to O(n).',
          likes: 5,
          parentId: 1,
          replies: []
        }
      ]
    },
    {
      id: 2,
      user: 'David Chen',
      avatar: 'D',
      date: '5 days ago',
      content: 'Would a recursive solution be acceptable for this problem?',
      likes: 3,
      parentId: null,
      replies: []
    }
  ])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)

  // Initialize code when lesson changes
  useEffect(() => {
    if (lesson) {
      const quizData = (lesson as any).quizData || {}
      const initialCode = quizData.starterCode?.[63] || quizData.starterCode?.['javascript'] || '// Write your code here'
      codeRef.current = initialCode
    }
  }, [lesson])

  const contentType = lesson.content_type || lesson.type
  const quizQuestions = Array.isArray((lesson as any)?.quizData?.questions)
    ? (lesson as any).quizData.questions
    : []

  const previewQuizQuestions = quizQuestions.map((q: any, index: number) => {
    const options = Array.isArray(q.options) ? q.options : []
    if (q.type === 'multiple-choice') {
      return {
        id: q.id || index + 1,
        question: q.question || '',
        type: 'single' as const,
        options,
        correctAnswer: Number(q.correctAnswer),
        explanation: q.explanation || '',
      }
    }
    if (q.type === 'true-false') {
      return {
        id: q.id || index + 1,
        question: q.question || '',
        type: 'single' as const,
        options: ['True', 'False'],
        correctAnswer: String(q.correctAnswer).toLowerCase() === 'false' ? 1 : 0,
        explanation: q.explanation || '',
      }
    }
    return {
      id: q.id || index + 1,
      question: q.question || '',
      type: 'text' as const,
      options: [],
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
    }
  })

  const deviceSizes = {
    desktop: 'sm:max-w-[95vw] w-[95vw]',
    tablet: 'sm:max-w-3xl',
    mobile: 'sm:max-w-md'
  }

  const runCode = async (quizData: any) => {
    setIsRunning(true)
    setConsoleOpen(true)
    setConsoleOutput(null)

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800))

    try {
      const userCode = codeRef.current
      const results = quizData.testCases?.map((tc: any) => {
        try {
          const run = new Function(`
            ${userCode}
            try {
              return isPalindrome(${tc.input})
            } catch (e) {
              return "Error: " + e.message
            }
          `)
          
          const result = run()
          const passed = String(result) === tc.expectedOutput
          
          return {
            id: tc.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: String(result),
            passed,
            isHidden: tc.isHidden
          }
        } catch (e: any) {
          return {
            id: tc.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: "Runtime Error: " + e.message,
            passed: false,
            isHidden: tc.isHidden
          }
        }
      })

      setConsoleOutput({
        type: 'test-results',
        results
      })

    } catch (e: any) {
      setConsoleOutput({
        type: 'error',
        message: e.message
      })
    } finally {
      setIsRunning(false)
    }
  }

  const handlePostComment = () => {
     if (!newComment.trim()) return
     const comment = {
       id: Date.now(),
       user: 'You',
       avatar: 'Y',
       date: 'Just now',
       content: newComment,
       likes: 0,
       parentId: null,
       replies: []
     }
     setComments([comment, ...comments])
     setNewComment('')
  }

  const handlePostReply = (parentId: number, content: string) => {
     if (!content.trim()) return
     
     const newReply = {
       id: Date.now(),
       user: 'You',
       avatar: 'Y',
       date: 'Just now',
       content: content,
       likes: 0,
       parentId: parentId,
       replies: []
     }

     // Recursive update
     const addReply = (items: any[]): any[] => {
       return items.map(item => {
         if (item.id === parentId) {
           return { ...item, replies: [...item.replies, newReply] }
         }
         if (item.replies && item.replies.length > 0) {
           return { ...item, replies: addReply(item.replies) }
         }
         return item
       })
     }
     
     setComments(addReply(comments))
     setReplyingTo(null)
  }

  const renderPreview = () => {
    if (viewMode === 'free' && !lesson.is_free) {
      return (
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="bg-muted rounded-full p-6 mb-6">
            <Lock className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">This lesson is locked</h3>
          <p className="text-muted-foreground mb-6">
            Enroll in this course to access this lesson and many more!
          </p>
          <Button>Enroll Now</Button>
        </div>
      )
    }

    switch (contentType) {
      case 'video':
        return (
          <div className={cn(
            "flex h-[600px] border rounded-lg overflow-hidden bg-background shadow-sm",
            device === 'desktop' ? "flex-row" : "flex-col h-auto min-h-[600px]"
          )}>
             {/* Video Player Area */}
             <div className={cn(
               "bg-black flex items-center justify-center relative",
               device === 'desktop' ? "w-2/3 h-full" : "w-full aspect-video"
             )}>
               <VideoPlayerPreview
                 videoUrl={lesson.videoUrl}
                 title={lesson.title}
                 duration={lesson.duration}
                 className="w-full h-full border-0 rounded-none"
               />
             </div>

             {/* Sidebar */}
             <div className={cn(
               "flex flex-col border-l bg-background",
               device === 'desktop' ? "w-1/3 h-full" : "w-full flex-1 h-[400px]"
             )}>
                <Tabs defaultValue="overview" className="flex-1 flex flex-col h-full">
                   <div className="border-b px-4 bg-muted/5">
                     <TabsList className="w-full justify-start bg-transparent p-0 h-11">
                       <TabsTrigger 
                         value="overview" 
                         className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 h-11"
                       >
                         Overview
                       </TabsTrigger>
                       <TabsTrigger 
                         value="comments" 
                         className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 h-11"
                       >
                         Comments
                       </TabsTrigger>
                       <TabsTrigger 
                         value="notes" 
                         className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 h-11"
                       >
                         Notes
                       </TabsTrigger>
                     </TabsList>
                   </div>
                   
                   <TabsContent value="overview" className="flex-1 overflow-y-auto p-6 m-0">
                      <h3 className="font-bold text-xl mb-3">{lesson.title}</h3>
                      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="rounded-sm">Video</Badge>
                        <span>{lesson.duration}</span>
                        <span>•</span>
                        <span>Last updated June 2024</span>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                        <p>{lesson.description || "No description available for this lesson."}</p>
                        <h4>In this lesson, you will learn:</h4>
                        <ul>
                          <li>Key concepts of string manipulation</li>
                          <li>How to optimize your approach</li>
                          <li>Common pitfalls to avoid</li>
                        </ul>
                      </div>
                   </TabsContent>

                   <TabsContent value="comments" className="flex-1 overflow-hidden m-0 h-full">
                      <div className="flex flex-col h-full bg-background">
                        {/* Comment Input */}
                        <div className="p-4 border-b">
                           <div className="flex gap-3">
                             <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                               <User className="h-4 w-4" />
                             </div>
                             <div className="flex-1">
                               <textarea
                                 value={newComment}
                                 onChange={(e) => setNewComment(e.target.value)}
                                 placeholder="Add a comment..."
                                 className="w-full bg-muted/30 border rounded-md p-2 text-sm min-h-[80px] focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                               />
                               <div className="flex justify-end mt-2">
                                 <Button 
                                   size="sm" 
                                   disabled={!newComment.trim()}
                                   onClick={handlePostComment}
                                 >
                                   Post Comment
                                 </Button>
                               </div>
                             </div>
                           </div>
                        </div>

                        {/* Comments List */}
                        <div className="flex-1 overflow-y-auto p-4">
                          {comments.length > 0 ? (
                            comments.map((comment) => (
                              <CommentItem 
                                key={comment.id} 
                                comment={comment} 
                                replyingTo={replyingTo}
                                setReplyingTo={setReplyingTo}
                                onPostReply={handlePostReply}
                              />
                            ))
                          ) : (
                            <div className="text-center text-muted-foreground py-10">
                              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                              <p>No comments yet. Be the first to start the discussion!</p>
                            </div>
                          )}
                        </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="notes" className="flex-1 overflow-y-auto p-6 m-0 flex flex-col items-center justify-center text-center text-muted-foreground">
                      <div className="bg-muted p-4 rounded-full mb-3">
                         <BookOpen className="h-6 w-6" />
                      </div>
                      <p>Click the "Create Note" button at specific times to save notes.</p>
                      <Button variant="outline" size="sm" className="mt-4">Start Taking Notes</Button>
                   </TabsContent>
                </Tabs>
             </div>
          </div>
        )
      
      case 'quiz':
        return (
          <QuizPreview
            title={lesson.title}
            questions={previewQuizQuestions}
            passingScore={70}
            showAnswers={false}
          />
        )

      case 'code':
        const quizData = (lesson as any).quizData || {}
        const isMobileOrTablet = device === 'mobile' || device === 'tablet'

        const ProblemDescription = () => (
          <div className="w-full h-full overflow-y-auto bg-muted/10 p-6">
             <div className="flex items-center gap-2 mb-4">
               <Code2 className="h-5 w-5 text-primary" />
               <h3 className="font-bold text-lg">{quizData.title || lesson.title}</h3>
             </div>
             
             <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                <p className="whitespace-pre-wrap">{quizData.problemStatement?.description || lesson.description}</p>
             </div>
             
             {/* Examples */}
             {quizData.examples?.length > 0 && (
               <div className="mt-6 space-y-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" /> Examples
                  </h4>
                  {quizData.examples.map((ex: any, i: number) => (
                    <div key={i} className="bg-muted/50 border rounded-md p-3 text-sm font-mono">
                       <div className="mb-1"><span className="text-muted-foreground select-none">Input: </span>{ex.input}</div>
                       <div><span className="text-muted-foreground select-none">Output: </span>{ex.output}</div>
                    </div>
                  ))}
               </div>
             )}

             {/* Constraints */}
             {quizData.constraints?.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-sm mb-2">Constraints</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {quizData.constraints.map((c: any, i: number) => (
                      <li key={i}>{c.description}</li>
                    ))}
                  </ul>
                </div>
             )}
          </div>
        )

        // Using simple textarea for code editor as requested to avoid Monaco issues
        const CodeEditor = () => (
          <div className="flex-1 flex flex-col bg-[#1e1e1e] text-white h-full min-h-[400px] relative">
             <div className="p-2 px-4 bg-[#252526] flex justify-between items-center text-xs text-gray-400 border-b border-[#333]">
                <div className="flex items-center gap-2">
                  <span className="bg-[#1e1e1e] px-2 py-1 rounded text-yellow-500">JavaScript</span>
                </div>
                <span>solution.js</span>
             </div>
             <textarea 
               className="flex-1 w-full bg-[#1e1e1e] p-4 font-mono text-sm resize-none focus:outline-none text-[#d4d4d4]"
               defaultValue={codeRef.current}
               onChange={(e) => { codeRef.current = e.target.value }}
               spellCheck={false}
             />
             
             {/* Console / Output Panel */}
             {consoleOpen && (
               <div className="absolute bottom-[57px] left-0 right-0 bg-[#1e1e1e] border-t border-[#333] max-h-[50%] overflow-y-auto z-10 shadow-xl">
                 <div className="flex items-center justify-between p-2 bg-[#252526] sticky top-0">
                   <span className="text-xs text-gray-400 flex items-center gap-2">
                     <Terminal className="h-3 w-3" />
                     Console
                   </span>
                   <button onClick={() => setConsoleOpen(false)} className="text-gray-400 hover:text-white">
                     <ChevronDown className="h-4 w-4" />
                   </button>
                 </div>
                 <div className="p-4 font-mono text-sm">
                   {isRunning ? (
                     <div className="flex items-center gap-2 text-gray-400">
                       <Loader2 className="h-4 w-4 animate-spin" />
                       Running tests...
                     </div>
                   ) : consoleOutput?.type === 'error' ? (
                     <div className="text-red-400">
                       {consoleOutput.message}
                     </div>
                   ) : consoleOutput?.type === 'test-results' ? (
                     <div className="space-y-4">
                       <div className="flex items-center justify-between">
                         <h4 className="font-bold text-gray-300">Test Results</h4>
                         <span className={cn(
                           "text-xs px-2 py-1 rounded",
                           consoleOutput.results.every((r: any) => r.passed) ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
                         )}>
                           {consoleOutput.results.filter((r: any) => r.passed).length}/{consoleOutput.results.length} Passed
                         </span>
                       </div>
                       
                       <div className="space-y-3">
                         {consoleOutput.results.map((result: any, i: number) => (
                           <div key={i} className="bg-[#252526] rounded p-3 text-xs">
                             <div className="flex items-center justify-between mb-2">
                               <span className="font-semibold text-gray-400">Test Case {i + 1}</span>
                               {result.passed ? (
                                 <span className="flex items-center gap-1 text-green-500">
                                   <Check className="h-3 w-3" /> Passed
                                 </span>
                               ) : (
                                 <span className="flex items-center gap-1 text-red-500">
                                   <XCircle className="h-3 w-3" /> Failed
                                 </span>
                               )}
                             </div>
                             
                             {!result.isHidden && (
                               <div className="space-y-1 text-gray-400">
                                 <div className="grid grid-cols-[60px_1fr] gap-2">
                                   <span>Input:</span>
                                   <span className="text-gray-300">{result.input}</span>
                                 </div>
                                 <div className="grid grid-cols-[60px_1fr] gap-2">
                                   <span>Expected:</span>
                                   <span className="text-gray-300">{result.expectedOutput}</span>
                                 </div>
                                 {!result.passed && (
                                   <div className="grid grid-cols-[60px_1fr] gap-2">
                                     <span>Actual:</span>
                                     <span className="text-red-400">{result.actualOutput}</span>
                                   </div>
                                 )}
                               </div>
                             )}
                             {result.isHidden && (
                               <div className="text-gray-500 italic">Hidden test case</div>
                             )}
                           </div>
                         ))}
                       </div>
                     </div>
                   ) : (
                     <div className="text-gray-500 italic">Ready to run code...</div>
                   )}
                 </div>
               </div>
             )}

             <div className="p-3 bg-[#252526] border-t border-[#333] flex justify-between items-center shrink-0 z-20">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <button 
                    onClick={() => setConsoleOpen(!consoleOpen)}
                    className="hover:text-gray-300 flex items-center gap-1"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    Console
                    {consoleOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="bg-[#333] text-white hover:bg-[#444] border-0 h-8"
                    onClick={() => runCode(quizData)}
                    disabled={isRunning}
                  >
                    {isRunning ? (
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5 mr-2" />
                    )}
                    Run Code
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8">
                    Submit
                  </Button>
                </div>
             </div>
          </div>
        )

        if (isMobileOrTablet) {
          return (
            <div className="flex flex-col h-[600px] border rounded-lg overflow-hidden bg-background shadow-sm">
               <div className="flex border-b">
                 <button 
                   onClick={() => setActiveTab('problem')}
                   className={cn(
                     "flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
                     activeTab === 'problem' 
                       ? "border-primary text-primary" 
                       : "border-transparent text-muted-foreground hover:text-foreground"
                   )}
                 >
                   <Code2 className="h-4 w-4" /> Problem
                 </button>
                 <button 
                   onClick={() => setActiveTab('code')}
                   className={cn(
                     "flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
                     activeTab === 'code' 
                       ? "border-primary text-primary" 
                       : "border-transparent text-muted-foreground hover:text-foreground"
                   )}
                 >
                   <Terminal className="h-4 w-4" /> Code
                 </button>
               </div>

               <div className="flex-1 overflow-hidden relative">
                  {activeTab === 'problem' ? <ProblemDescription /> : <CodeEditor />}
               </div>
            </div>
          )
        }

        return (
          <div className="flex h-[600px] border rounded-lg overflow-hidden bg-background shadow-sm">
             <div className="w-1/3 border-r h-full flex flex-col">
               <ProblemDescription />
             </div>
             <div className="w-2/3 h-full flex flex-col">
               <CodeEditor />
             </div>
          </div>
        )

      case 'article':
        return (
          <div className="h-[600px] overflow-y-auto border rounded-lg bg-background p-6">
            <ArticlePreview title={lesson.title} content={lesson.content} />
          </div>
        )

      default:
        return <div>Unsupported content type</div>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 gap-0 overflow-hidden", deviceSizes[device])}>
        <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/50">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-sm font-medium">Lesson Preview</DialogTitle>
          </div>
          
          <div className="flex items-center gap-2 bg-background border rounded-md p-1">
            <button 
              onClick={() => setDevice('desktop')}
              className={cn("p-1.5 rounded-sm transition-colors", device === 'desktop' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Desktop view"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setDevice('tablet')}
              className={cn("p-1.5 rounded-sm transition-colors", device === 'tablet' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Tablet view"
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setDevice('mobile')}
              className={cn("p-1.5 rounded-sm transition-colors", device === 'mobile' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Mobile view"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
             <div className="flex items-center bg-background border rounded-md px-1 h-8">
               <button 
                 onClick={() => setViewMode('enrolled')}
                 className={cn("text-xs px-2 py-1 rounded-sm transition-colors", viewMode === 'enrolled' ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground")}
               >
                 Enrolled
               </button>
               <div className="w-[1px] h-4 bg-border mx-1" />
               <button 
                 onClick={() => setViewMode('free')}
                 className={cn("text-xs px-2 py-1 rounded-sm transition-colors", viewMode === 'free' ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground")}
               >
                 Visitor
               </button>
             </div>
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
               <X className="h-4 w-4" />
             </Button>
          </div>
        </div>
        
        <div className="bg-muted/10 p-6 max-h-[85vh] overflow-y-auto">
           {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
