import { CheckCircle2, Clock, AlertCircle, ChevronRight, Filter } from "lucide-react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Card } from "./ui/card"
import { cn } from "./ui/utils"
import { useState } from "react"
import { useRouter } from "./Router"

interface Task {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed'
  dueDate?: Date
  actionUrl?: string
  category: string
}

interface PendingTasksProps {
  userRole: 'admin' | 'instructor' | 'user'
  className?: string
}

export function PendingTasks({ userRole, className }: PendingTasksProps) {
  const { navigate } = useRouter()
  const [filter, setFilter] = useState<'all' | 'pending' | 'urgent'>('all')

  // Mock tasks based on user role
  const getMockTasks = (): Task[] => {
    if (userRole === 'admin') {
      return [
        {
          id: '1',
          title: 'Review Pending Courses',
          description: '12 courses waiting for approval',
          priority: 'high',
          status: 'pending',
          actionUrl: '/admin/courses',
          category: 'Courses'
        },
        {
          id: '2',
          title: 'Process Refund Requests',
          description: '5 refund requests need attention',
          priority: 'urgent',
          status: 'pending',
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
          actionUrl: '/admin/refunds',
          category: 'Payments'
        },
        {
          id: '3',
          title: 'Review Reported Content',
          description: '8 forum posts flagged by users',
          priority: 'high',
          status: 'in_progress',
          actionUrl: '/admin/forum',
          category: 'Moderation'
        },
        {
          id: '4',
          title: 'Update Platform Settings',
          description: 'Configure new payment gateway',
          priority: 'medium',
          status: 'pending',
          actionUrl: '/admin/settings',
          category: 'Settings'
        },
        {
          id: '5',
          title: 'Review User Reports',
          description: '3 users reported for violation',
          priority: 'high',
          status: 'pending',
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 48),
          actionUrl: '/admin/users',
          category: 'Users'
        },
      ]
    }

    if (userRole === 'instructor') {
      return [
        {
          id: '6',
          title: 'Answer Student Questions',
          description: '15 unanswered Q&A questions',
          priority: 'high',
          status: 'pending',
          actionUrl: '/instructor/qna',
          category: 'Q&A'
        },
        {
          id: '7',
          title: 'Update Course Content',
          description: 'React course needs new module',
          priority: 'medium',
          status: 'in_progress',
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 72),
          actionUrl: '/instructor/courses',
          category: 'Content'
        },
        {
          id: '8',
          title: 'Review Student Assignments',
          description: '23 assignments pending review',
          priority: 'high',
          status: 'pending',
          actionUrl: '/instructor/courses',
          category: 'Grading'
        },
        {
          id: '9',
          title: 'Respond to Reviews',
          description: '5 new reviews need response',
          priority: 'low',
          status: 'pending',
          actionUrl: '/instructor/reviews',
          category: 'Reviews'
        },
        {
          id: '10',
          title: 'Course Approval Pending',
          description: 'Advanced Node.js waiting for admin approval',
          priority: 'medium',
          status: 'in_progress',
          actionUrl: '/instructor/courses',
          category: 'Courses'
        },
      ]
    }

    // User tasks
    return [
      {
        id: '11',
        title: 'Complete Course Module',
        description: 'Finish Module 5 of React Fundamentals',
        priority: 'medium',
        status: 'in_progress',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
        actionUrl: '/my-learning',
        category: 'Learning'
      },
      {
        id: '12',
        title: 'Submit Assignment',
        description: 'JavaScript project due soon',
        priority: 'urgent',
        status: 'pending',
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 12),
        actionUrl: '/my-learning',
        category: 'Assignments'
      },
      {
        id: '13',
        title: 'Rate Completed Course',
        description: 'Share your feedback on Web Development',
        priority: 'low',
        status: 'pending',
        actionUrl: '/my-learning',
        category: 'Feedback'
      },
    ]
  }

  const tasks = getMockTasks()

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return task.status === 'pending'
    if (filter === 'urgent') return task.priority === 'urgent' || task.priority === 'high'
    return true
  })

  const getPriorityConfig = (priority: string) => {
    const configs = {
      low: { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: Clock },
      medium: { color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20', icon: Clock },
      high: { color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', icon: AlertCircle },
      urgent: { color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: AlertCircle },
    }
    return configs[priority as keyof typeof configs] || configs.low
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { label: 'To Do', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
      in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
      completed: { label: 'Done', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    }
    return configs[status as keyof typeof configs] || configs.pending
  }

  const formatDueDate = (date: Date) => {
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffHours < 24) return `${diffHours}h left`
    return `${diffDays}d left`
  }

  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const urgentCount = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-medium mb-1">Pending Tasks</h2>
          <p className="text-sm text-muted-foreground">
            {pendingCount} pending • {urgentCount} urgent
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            To Do
          </Button>
          <Button
            variant={filter === 'urgent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('urgent')}
          >
            Urgent
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>All tasks completed!</p>
            <p className="text-sm mt-1">Great job staying on top of things</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const priorityConfig = getPriorityConfig(task.priority)
            const statusConfig = getStatusConfig(task.status)
            const PriorityIcon = priorityConfig.icon

            return (
              <div
                key={task.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => task.actionUrl && navigate(task.actionUrl)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center border",
                    priorityConfig.color
                  )}>
                    <PriorityIcon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium text-sm">{task.title}</h3>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {task.description}
                    </p>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className={statusConfig.color}>
                        {statusConfig.label}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {task.category}
                      </Badge>
                      <Badge variant="outline" className={cn("capitalize", priorityConfig.color)}>
                        {task.priority}
                      </Badge>
                      {task.dueDate && (
                        <Badge variant="outline" className="text-xs">
                          ⏰ {formatDueDate(task.dueDate)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {filteredTasks.length > 0 && (
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => {
            if (userRole === 'admin') navigate('/admin')
            else if (userRole === 'instructor') navigate('/instructor')
            else navigate('/my-learning')
          }}
        >
          View All Tasks
        </Button>
      )}
    </Card>
  )
}
