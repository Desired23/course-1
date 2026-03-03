import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Avatar } from '../../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Input } from '../../components/ui/input'
import { 
  Zap, 
  Star, 
  Trophy, 
  Target, 
  Gamepad2, 
  Gift, 
  Coins, 
  Award, 
  Crown,
  Flame,
  Rocket,
  Heart,
  MessageSquare,
  ThumbsUp,
  Share2,
  BookOpen,
  Clock,
  Users,
  TrendingUp,
  Filter,
  Search,
  ChevronRight,
  Bell,
  Settings,
  UserPlus
} from 'lucide-react'
import { toast } from 'sonner@2.0.3'

interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  category: 'learning' | 'social' | 'streak' | 'special'
  points: number
  unlocked: boolean
  unlockedAt?: Date
  progress: number
  maxProgress: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

interface Notification {
  id: string
  type: 'achievement' | 'social' | 'system' | 'course'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  avatar?: string
}

interface UserStats {
  level: number
  totalXP: number
  xpToNextLevel: number
  currentStreak: number
  longestStreak: number
  coursesCompleted: number
  hoursLearned: number
  totalPoints: number
  rank: number
  achievements: number
}

export function AdvancedFeaturesDemo() {
  const { user, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [showOnlyUnread, setShowOnlyUnread] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data
  useEffect(() => {
    const mockStats: UserStats = {
      level: 15,
      totalXP: 12450,
      xpToNextLevel: 1550,
      currentStreak: 7,
      longestStreak: 23,
      coursesCompleted: 8,
      hoursLearned: 127,
      totalPoints: 3250,
      rank: 1247,
      achievements: 24
    }

    const mockAchievements: Achievement[] = [
      {
        id: '1',
        title: 'First Steps',
        description: 'Complete your first course',
        icon: <Star className="w-6 h-6" />,
        category: 'learning',
        points: 100,
        unlocked: true,
        unlockedAt: new Date('2024-01-10'),
        progress: 1,
        maxProgress: 1,
        rarity: 'common'
      },
      {
        id: '2',
        title: 'Knowledge Seeker',
        description: 'Complete 5 courses',
        icon: <BookOpen className="w-6 h-6" />,
        category: 'learning',
        points: 500,
        unlocked: true,
        unlockedAt: new Date('2024-01-20'),
        progress: 5,
        maxProgress: 5,
        rarity: 'rare'
      },
      {
        id: '3',
        title: 'Social Butterfly',
        description: 'Make 10 forum posts',
        icon: <MessageSquare className="w-6 h-6" />,
        category: 'social',
        points: 250,
        unlocked: false,
        progress: 7,
        maxProgress: 10,
        rarity: 'common'
      },
      {
        id: '4',
        title: 'Streak Master',
        description: 'Maintain a 30-day learning streak',
        icon: <Flame className="w-6 h-6" />,
        category: 'streak',
        points: 1000,
        unlocked: false,
        progress: 7,
        maxProgress: 30,
        rarity: 'epic'
      },
      {
        id: '5',
        title: 'Night Owl',
        description: 'Study after midnight 5 times',
        icon: <Crown className="w-6 h-6" />,
        category: 'special',
        points: 300,
        unlocked: true,
        unlockedAt: new Date('2024-01-15'),
        progress: 5,
        maxProgress: 5,
        rarity: 'rare'
      },
      {
        id: '6',
        title: 'Speed Learner',
        description: 'Complete a course in under 2 hours',
        icon: <Rocket className="w-6 h-6" />,
        category: 'special',
        points: 750,
        unlocked: false,
        progress: 0,
        maxProgress: 1,
        rarity: 'epic'
      },
      {
        id: '7',
        title: 'Master of All',
        description: 'Get certified in 3 different categories',
        icon: <Trophy className="w-6 h-6" />,
        category: 'learning',
        points: 2000,
        unlocked: false,
        progress: 1,
        maxProgress: 3,
        rarity: 'legendary'
      }
    ]

    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'achievement',
        title: 'New Achievement Unlocked!',
        message: 'You earned the "Night Owl" achievement for studying late!',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        read: false,
        actionUrl: '/achievements'
      },
      {
        id: '2',
        type: 'social',
        title: 'New Follower',
        message: 'Sarah Wilson started following you',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        read: false,
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop&crop=face',
        actionUrl: '/profile/sarah-wilson'
      },
      {
        id: '3',
        type: 'course',
        title: 'Course Update',
        message: 'React Advanced Patterns has new content available',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
        read: true,
        actionUrl: '/course/react-advanced'
      },
      {
        id: '4',
        type: 'system',
        title: 'Maintenance Notice',
        message: 'Scheduled maintenance on Sunday 2AM-4AM UTC',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        read: true
      },
      {
        id: '5',
        type: 'social',
        title: 'Comment on Your Post',
        message: 'Mike Johnson commented on your blog post',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        read: true,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face',
        actionUrl: '/blog/my-post'
      }
    ]

    setUserStats(mockStats)
    setAchievements(mockAchievements)
    setNotifications(mockNotifications)
  }, [])

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      case 'rare': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'epic': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'legendary': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: Achievement['category']) => {
    switch (category) {
      case 'learning': return <BookOpen className="w-4 h-4" />
      case 'social': return <Users className="w-4 h-4" />
      case 'streak': return <Flame className="w-4 h-4" />
      case 'special': return <Star className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'achievement': return <Trophy className="w-5 h-5 text-yellow-500" />
      case 'social': return <Users className="w-5 h-5 text-blue-500" />
      case 'course': return <BookOpen className="w-5 h-5 text-green-500" />
      case 'system': return <Settings className="w-5 h-5 text-gray-500" />
      default: return <Bell className="w-5 h-5" />
    }
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
    toast.success('All notifications marked as read')
  }

  const filteredNotifications = notifications.filter(n => {
    const matchesFilter = showOnlyUnread ? !n.read : true
    const matchesSearch = searchQuery === '' || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const filteredAchievements = achievements.filter(a => {
    return searchQuery === '' || 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} ngày trước`
    if (hours > 0) return `${hours} giờ trước`
    if (minutes > 0) return `${minutes} phút trước`
    return 'Vừa xong'
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4 text-muted-foreground">
              Please login to access advanced features
            </p>
            <Button>Login</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2">Advanced Features Demo</h1>
          <p className="text-muted-foreground">
            Explore gamification, achievements, notifications, and social features
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="gamification">Gamification</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {userStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Level</p>
                        <p className="text-2xl font-bold">{userStats.level}</p>
                      </div>
                      <Crown className="w-8 h-8 text-yellow-500" />
                    </div>
                    <div className="mt-4">
                      <div className="text-xs text-muted-foreground mb-1">
                        {userStats.totalXP} / {userStats.totalXP + userStats.xpToNextLevel} XP
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(userStats.totalXP / (userStats.totalXP + userStats.xpToNextLevel)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Streak</p>
                        <p className="text-2xl font-bold">{userStats.currentStreak} days</p>
                      </div>
                      <Flame className="w-8 h-8 text-orange-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Best: {userStats.longestStreak} days
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Courses</p>
                        <p className="text-2xl font-bold">{userStats.coursesCompleted}</p>
                      </div>
                      <BookOpen className="w-8 h-8 text-green-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {userStats.hoursLearned} hours learned
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Rank</p>
                        <p className="text-2xl font-bold">#{userStats.rank}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {userStats.totalPoints} points
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Recent Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {achievements.filter(a => a.unlocked).slice(0, 3).map((achievement) => (
                      <div key={achievement.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                        <div className="text-yellow-500">{achievement.icon}</div>
                        <div className="flex-1">
                          <p className="font-medium">{achievement.title}</p>
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        </div>
                        <Badge className={getRarityColor(achievement.rarity)}>
                          +{achievement.points}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notifications.slice(0, 3).map((notification) => (
                      <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                        {notification.avatar ? (
                          <Avatar className="w-8 h-8">
                            <img src={notification.avatar} alt="" />
                          </Avatar>
                        ) : (
                          <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search achievements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAchievements.map((achievement) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative overflow-hidden rounded-lg border ${
                    achievement.unlocked 
                      ? 'bg-card border-border' 
                      : 'bg-muted border-muted opacity-75'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${
                        achievement.unlocked ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        {achievement.icon}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getCategoryIcon(achievement.category)}
                          <span className="ml-1 capitalize">{achievement.category}</span>
                        </Badge>
                        <Badge className={getRarityColor(achievement.rarity)}>
                          {achievement.rarity}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="font-semibold mb-2">{achievement.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {achievement.description}
                    </p>

                    {!achievement.unlocked && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-muted-foreground">Progress</span>
                          <span className="text-sm font-medium">
                            {achievement.progress}/{achievement.maxProgress}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">{achievement.points} points</span>
                      </div>
                      {achievement.unlocked && achievement.unlockedAt && (
                        <span className="text-xs text-muted-foreground">
                          {achievement.unlockedAt.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {achievement.unlocked && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-green-500 text-white rounded-full p-1">
                        <Award className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowOnlyUnread(!showOnlyUnread)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showOnlyUnread ? 'Show All' : 'Unread Only'}
              </Button>
              <Button onClick={markAllAsRead}>
                Mark All Read
              </Button>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredNotifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      notification.read 
                        ? 'bg-card border-border' 
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      {notification.avatar ? (
                        <Avatar className="w-10 h-10">
                          <img src={notification.avatar} alt="" />
                        </Avatar>
                      ) : (
                        <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(notification.timestamp)}
                          </span>
                          {notification.actionUrl && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                              View <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* Gamification Tab */}
          <TabsContent value="gamification" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5" />
                    Daily Challenges
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Study for 30 minutes</span>
                      <Badge variant="outline">+100 XP</Badge>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full w-3/4" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">22/30 minutes</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Complete 3 lessons</span>
                      <Badge variant="outline">+150 XP</Badge>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full w-2/3" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">2/3 lessons</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-muted">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Post in forum</span>
                      <Badge variant="outline">+50 XP</Badge>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-gray-300 dark:bg-gray-600 h-2 rounded-full w-0" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">0/1 posts</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'Alex Chen', points: 15420, rank: 1 },
                      { name: 'Sarah Wilson', points: 14890, rank: 2 },
                      { name: 'Mike Johnson', points: 13250, rank: 3 },
                      { name: user?.name || 'You', points: 12450, rank: 4, isCurrentUser: true },
                      { name: 'Emma Davis', points: 11800, rank: 5 }
                    ].map((player) => (
                      <div key={player.rank} className={`flex items-center gap-3 p-2 rounded ${
                        player.isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          player.rank === 1 ? 'bg-yellow-500 text-white' :
                          player.rank === 2 ? 'bg-gray-400 text-white' :
                          player.rank === 3 ? 'bg-orange-500 text-white' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {player.rank}
                        </div>
                        <Avatar className="w-8 h-8">
                          <div className="w-full h-full bg-muted rounded-full" />
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{player.name}</p>
                          <p className="text-sm text-muted-foreground">{player.points} points</p>
                        </div>
                        {player.rank <= 3 && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Rewards Shop
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Profile Badge</span>
                      <Badge variant="outline">500 pts</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Special badge for your profile
                    </p>
                    <Button size="sm" className="w-full">Redeem</Button>
                  </div>
                  
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Course Discount</span>
                      <Badge variant="outline">1000 pts</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      10% off next course purchase
                    </p>
                    <Button size="sm" className="w-full">Redeem</Button>
                  </div>
                  
                  <div className="p-3 rounded-lg border opacity-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Free Course</span>
                      <Badge variant="outline">5000 pts</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Any course under $50
                    </p>
                    <Button size="sm" className="w-full" disabled>
                      Not Enough Points
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}