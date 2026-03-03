import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Award, Download, Share2, Printer, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface CertificateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseTitle: string
  instructorName: string
  completionDate: string
  certificateId: string
}

export function CertificateDialog({
  open,
  onOpenChange,
  courseTitle,
  instructorName,
  completionDate,
  certificateId
}: CertificateDialogProps) {
  const { user } = useAuth()
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    // Simulate download delay
    setTimeout(() => {
      // In production, this would generate a PDF certificate
      const link = document.createElement('a')
      link.download = `certificate-${certificateId}.pdf`
      link.click()
      setIsDownloading(false)
    }, 1500)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Course Completion Certificate',
        text: `I just completed ${courseTitle}!`,
        url: window.location.href
      })
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <DialogTitle>Congratulations! 🎉</DialogTitle>
          </div>
          <DialogDescription>
            You've successfully completed this course and earned your certificate
          </DialogDescription>
        </DialogHeader>

        {/* Certificate Preview */}
        <div className="border-4 border-primary/20 rounded-lg p-8 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="text-center space-y-6">
            {/* Header */}
            <div className="flex justify-center">
              <Award className="w-20 h-20 text-primary" />
            </div>

            {/* Title */}
            <div>
              <h2 className="text-3xl font-serif mb-2">Certificate of Completion</h2>
              <p className="text-muted-foreground">This is to certify that</p>
            </div>

            {/* Student Name */}
            <div className="py-4 border-b-2 border-primary/30">
              <p className="text-4xl font-serif text-primary">{user?.full_name || user?.username}</p>
            </div>

            {/* Course Info */}
            <div className="space-y-2">
              <p className="text-muted-foreground">has successfully completed the course</p>
              <h3 className="text-2xl">{courseTitle}</h3>
              <p className="text-muted-foreground">
                Instructed by <span className="font-medium">{instructorName}</span>
              </p>
            </div>

            {/* Date & ID */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Completion Date</p>
                <p className="font-medium">{new Date(completionDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Certificate ID</p>
                <p className="font-medium font-mono">{certificateId}</p>
              </div>
            </div>

            {/* Badge */}
            <div className="flex justify-center pt-4">
              <Badge variant="outline" className="text-lg px-6 py-2">
                Verified Certificate
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-3 pt-4">
          <Button onClick={handleDownload} disabled={isDownloading}>
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? 'Generating...' : 'Download PDF'}
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
