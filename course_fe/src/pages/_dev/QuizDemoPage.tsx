import { QuizPlayer, Quiz } from '../../components/QuizPlayer'
import { Button } from '../../components/ui/button'
import { useRouter } from '../../components/Router'
import { ArrowLeft } from 'lucide-react'

const demoQuiz: Quiz = {
  id: 1,
  title: 'Web Development Fundamentals',
  description: 'Test your knowledge of basic web development concepts',
  passingScore: 70,
  timeLimit: 10,
  questions: [
    {
      id: 1,
      question: 'What does HTML stand for?',
      type: 'single',
      options: [
        'Hyper Text Markup Language',
        'High Tech Modern Language',
        'Home Tool Markup Language',
        'Hyperlinks and Text Markup Language'
      ],
      correctAnswer: 0,
      explanation: 'HTML stands for Hyper Text Markup Language. It is the standard markup language for creating web pages.',
      points: 1
    },
    {
      id: 2,
      question: 'Which of the following are front-end technologies? (Select all that apply)',
      type: 'multiple',
      options: [
        'HTML',
        'CSS',
        'JavaScript',
        'MongoDB',
        'React'
      ],
      correctAnswer: [0, 1, 2, 4],
      explanation: 'HTML, CSS, JavaScript, and React are all front-end technologies. MongoDB is a back-end database.',
      points: 2
    },
    {
      id: 3,
      question: 'What is the purpose of CSS?',
      type: 'single',
      options: [
        'To add interactivity to web pages',
        'To style and layout web pages',
        'To store data',
        'To create server-side logic'
      ],
      correctAnswer: 1,
      explanation: 'CSS (Cascading Style Sheets) is used to style and layout web pages, controlling colors, fonts, spacing, and positioning.',
      points: 1
    },
    {
      id: 4,
      question: 'Which protocol is used for transferring web pages?',
      type: 'single',
      options: [
        'FTP',
        'SMTP',
        'HTTP/HTTPS',
        'SSH'
      ],
      correctAnswer: 2,
      explanation: 'HTTP (HyperText Transfer Protocol) and HTTPS (secure version) are used for transferring web pages between servers and browsers.',
      points: 1
    },
    {
      id: 5,
      question: 'What are the main components of a URL? (Select all that apply)',
      type: 'multiple',
      options: [
        'Protocol',
        'Domain name',
        'Path',
        'CSS file',
        'Port number'
      ],
      correctAnswer: [0, 1, 2, 4],
      explanation: 'A URL consists of protocol (http/https), domain name, path, and optionally port number. CSS files are resources, not URL components.',
      points: 2
    }
  ],
  attempts: 0,
  bestScore: undefined
}

export function QuizDemoPage() {
  const { navigate } = useRouter()

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl mb-2">Quiz Demo</h1>
          <p className="text-muted-foreground">
            This is a demo of the interactive quiz component used in course lessons
          </p>
        </div>

        <QuizPlayer
          quiz={demoQuiz}
          onComplete={(score, passed) => {
            console.log('Quiz completed!', { score, passed })
          }}
        />
      </div>
    </div>
  )
}
