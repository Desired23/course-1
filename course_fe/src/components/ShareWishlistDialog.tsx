import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { 
  Share2, 
  Copy, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Mail,
  Check
} from 'lucide-react'
import { toast } from 'sonner@2.0.3'

interface ShareWishlistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wishlistUrl?: string
  coursesCount: number
}

export function ShareWishlistDialog({
  open,
  onOpenChange,
  wishlistUrl = window.location.origin + '/wishlist/shared/',
  coursesCount
}: ShareWishlistDialogProps) {
  const [copied, setCopied] = useState(false)
  
  // Generate shareable link
  const shareableLink = wishlistUrl + Math.random().toString(36).substring(7)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy link')
    }
  }

  const shareToSocial = (platform: string) => {
    const text = `Check out my wishlist with ${coursesCount} courses on Udemy!`
    let url = ''

    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareableLink)}`
        break
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareableLink)}`
        break
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareableLink)}`
        break
      case 'email':
        url = `mailto:?subject=${encodeURIComponent('My Udemy Wishlist')}&body=${encodeURIComponent(text + '\n\n' + shareableLink)}`
        break
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Wishlist</DialogTitle>
          <DialogDescription>
            Share your wishlist with friends and family
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Copy Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Shareable Link</label>
            <div className="flex gap-2">
              <Input
                value={shareableLink}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can view your wishlist
            </p>
          </div>

          {/* Social Share Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share via</label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => shareToSocial('facebook')}
              >
                <Facebook className="w-5 h-5 text-[#1877F2]" />
                <span className="text-xs">Facebook</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => shareToSocial('twitter')}
              >
                <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                <span className="text-xs">Twitter</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => shareToSocial('linkedin')}
              >
                <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                <span className="text-xs">LinkedIn</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-3"
                onClick={() => shareToSocial('email')}
              >
                <Mail className="w-5 h-5" />
                <span className="text-xs">Email</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
