import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  Trash2, 
  X,
  Move
} from 'lucide-react'
import { motion } from 'motion/react'

interface BulkActionsBarProps {
  selectedCount: number
  onPublishAll: () => void
  onUnpublishAll: () => void
  onDeleteAll: () => void
  onMoveAll?: () => void
  onClearSelection: () => void
}

export function BulkActionsBar({
  selectedCount,
  onPublishAll,
  onUnpublishAll,
  onDeleteAll,
  onMoveAll,
  onClearSelection
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="bg-card border shadow-2xl rounded-xl p-4 min-w-[500px]">
        <div className="flex items-center justify-between gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {selectedCount} {selectedCount === 1 ? 'lesson' : 'lessons'} selected
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="h-7 px-2"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPublishAll}
              className="h-8 gap-1.5"
            >
              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs">Publish</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onUnpublishAll}
              className="h-8 gap-1.5"
            >
              <XCircle className="h-3.5 w-3.5 text-gray-600" />
              <span className="text-xs">Unpublish</span>
            </Button>
            
            {onMoveAll && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMoveAll}
                className="h-8 gap-1.5"
              >
                <Move className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs">Move to...</span>
              </Button>
            )}
            
            <div className="w-px h-6 bg-border mx-1" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteAll}
              className="h-8 gap-1.5 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="text-xs">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
