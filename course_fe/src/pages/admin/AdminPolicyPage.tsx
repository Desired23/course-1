import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../../components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { SystemSettingsPanel } from '../../components/admin/SystemSettingsPanel'
import { PolicyDocumentsPanel } from '../../components/admin/PolicyDocumentsPanel'
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import {
  createInstructorLevel,
  deleteInstructorLevel,
  getInstructorLevels,
  getInstructorShare,
  parseDecimal,
  updateInstructorLevel,
  type InstructorLevel,
  type InstructorLevelInput,
} from '../../services/instructor-levels.api'

const emptyLevelForm: InstructorLevelInput = {
  name: '',
  description: '',
  min_students: 0,
  min_revenue: '0',
  commission_rate: '30',
  plan_commission_rate: '30',
  min_plan_minutes: 0,
}

export function AdminPolicyPage() {
  const { canAccess } = useAuth()
  const { t } = useTranslation()

  const [levels, setLevels] = useState<InstructorLevel[]>([])
  const [levelDialogOpen, setLevelDialogOpen] = useState(false)
  const [editingLevel, setEditingLevel] = useState<InstructorLevel | null>(null)
  const [levelForm, setLevelForm] = useState<InstructorLevelInput>(emptyLevelForm)
  const [savingLevel, setSavingLevel] = useState(false)
  const [deletingLevel, setDeletingLevel] = useState<InstructorLevel | null>(null)

  useEffect(() => {
    void loadLevels()
  }, [])

  const loadLevels = async () => {
    try {
      setLevels(await getInstructorLevels())
    } catch {
      toast.error(t('admin_policy.levels.load_failed'))
    }
  }

  if (!canAccess(['admin'], ['admin.platform.settings'])) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>{t('platform_settings.permission_denied')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const openCreateLevel = () => {
    setEditingLevel(null)
    setLevelForm(emptyLevelForm)
    setLevelDialogOpen(true)
  }

  const openEditLevel = (level: InstructorLevel) => {
    setEditingLevel(level)
    setLevelForm({
      name: level.name,
      description: level.description || '',
      min_students: level.min_students,
      min_revenue: level.min_revenue,
      commission_rate: level.commission_rate,
      plan_commission_rate: level.plan_commission_rate,
      min_plan_minutes: level.min_plan_minutes,
    })
    setLevelDialogOpen(true)
  }

  const setLevelField = (field: keyof InstructorLevelInput, value: InstructorLevelInput[keyof InstructorLevelInput]) => {
    setLevelForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveLevel = async () => {
    if (!levelForm.name || !levelForm.name.trim()) {
      toast.error(t('admin_policy.levels.name_required'))
      return
    }

    try {
      setSavingLevel(true)
      if (editingLevel) {
        await updateInstructorLevel(editingLevel.id, levelForm)
        toast.success(t('admin_policy.levels.update_success'))
      } else {
        await createInstructorLevel(levelForm)
        toast.success(t('admin_policy.levels.create_success'))
      }
      setLevelDialogOpen(false)
      await loadLevels()
    } catch {
      toast.error(t('admin_policy.levels.save_failed'))
    } finally {
      setSavingLevel(false)
    }
  }

  const handleDeleteLevel = async () => {
    if (!deletingLevel) return

    try {
      await deleteInstructorLevel(deletingLevel.id)
      toast.success(t('admin_policy.levels.delete_success'))
      setDeletingLevel(null)
      await loadLevels()
    } catch {
      toast.error(t('admin_policy.levels.delete_failed'))
    }
  }

  return (
    <motion.div
      className="p-6 space-y-6 overflow-x-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div>
        <h1 className="text-3xl font-bold">{t('admin_policy.title')}</h1>
        <p className="text-muted-foreground">{t('admin_policy.subtitle')}</p>
      </div>

      <Tabs defaultValue="levels" className="space-y-6">
        <TabsList>
          <TabsTrigger value="levels">{t('admin_policy.tabs.levels')}</TabsTrigger>
          <TabsTrigger value="system_settings">{t('admin_policy.tabs.system_settings')}</TabsTrigger>
          <TabsTrigger value="policies">{t('admin_policy.tabs.policies')}</TabsTrigger>
        </TabsList>

        <TabsContent value="levels">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                {t('admin_policy.levels.title')}
              </CardTitle>
              <CardDescription>{t('admin_policy.levels.description')}</CardDescription>
            </div>
            <Button onClick={openCreateLevel}>
              <Plus className="h-4 w-4 mr-2" />
              {t('admin_policy.levels.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin_policy.levels.col_name')}</TableHead>
                <TableHead className="text-right">{t('admin_policy.levels.col_commission')}</TableHead>
                <TableHead className="text-right">{t('admin_policy.levels.col_plan_commission')}</TableHead>
                <TableHead className="text-right">{t('admin_policy.levels.col_min_students')}</TableHead>
                <TableHead className="text-right">{t('admin_policy.levels.col_min_revenue')}</TableHead>
                <TableHead className="text-right">{t('admin_policy.levels.col_min_minutes')}</TableHead>
                <TableHead className="text-right">{t('admin_policy.levels.col_instructors')}</TableHead>
                <TableHead className="text-right">{t('admin_policy.levels.col_actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t('admin_policy.levels.empty')}
                  </TableCell>
                </TableRow>
              ) : levels.map((level) => (
                <TableRow key={level.id}>
                  <TableCell>
                    <div className="font-medium">{level.name}</div>
                    {level.description && <div className="text-xs text-muted-foreground">{level.description}</div>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{parseDecimal(level.commission_rate)}%</Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('admin_policy.levels.instructor_gets', { pct: getInstructorShare(level.commission_rate) })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{parseDecimal(level.plan_commission_rate)}% platform</Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      Instructor gets {(100 - parseDecimal(level.plan_commission_rate)).toFixed(0)}%
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{level.min_students}</TableCell>
                  <TableCell className="text-right">{parseDecimal(level.min_revenue).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{level.min_plan_minutes}</TableCell>
                  <TableCell className="text-right">{level.instructor_count}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEditLevel(level)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeletingLevel(level)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="system_settings">
          <SystemSettingsPanel />
        </TabsContent>

        <TabsContent value="policies">
          <PolicyDocumentsPanel />
        </TabsContent>
      </Tabs>

      <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLevel ? t('admin_policy.levels.edit_title') : t('admin_policy.levels.create_title')}</DialogTitle>
            <DialogDescription>{t('admin_policy.levels.dialog_description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="level-name">{t('admin_policy.levels.col_name')}</Label>
              <Input id="level-name" value={levelForm.name || ''} onChange={(e) => setLevelField('name', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="level-desc">{t('admin_policy.levels.field_description')}</Label>
              <Textarea id="level-desc" rows={2} value={levelForm.description || ''} onChange={(e) => setLevelField('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="level-commission">{t('admin_policy.levels.col_commission')} (%)</Label>
                <Input id="level-commission" type="number" min="0" max="100" value={levelForm.commission_rate ?? ''} onChange={(e) => setLevelField('commission_rate', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="level-plan-commission">{t('admin_policy.levels.col_plan_commission')} (%)</Label>
                <Input id="level-plan-commission" type="number" min="0" max="100" value={levelForm.plan_commission_rate ?? ''} onChange={(e) => setLevelField('plan_commission_rate', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="level-min-students">{t('admin_policy.levels.col_min_students')}</Label>
                <Input id="level-min-students" type="number" min="0" value={levelForm.min_students ?? 0} onChange={(e) => setLevelField('min_students', parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <Label htmlFor="level-min-revenue">{t('admin_policy.levels.col_min_revenue')}</Label>
                <Input id="level-min-revenue" type="number" min="0" value={levelForm.min_revenue ?? '0'} onChange={(e) => setLevelField('min_revenue', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="level-min-minutes">{t('admin_policy.levels.col_min_minutes')}</Label>
                <Input id="level-min-minutes" type="number" min="0" value={levelForm.min_plan_minutes ?? 0} onChange={(e) => setLevelField('min_plan_minutes', parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLevelDialogOpen(false)}>{t('admin_policy.levels.cancel')}</Button>
            <Button onClick={handleSaveLevel} disabled={savingLevel}>
              {savingLevel ? t('admin_policy.saving') : t('admin_policy.levels.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingLevel} onOpenChange={(open) => !open && setDeletingLevel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin_policy.levels.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin_policy.levels.delete_confirm', { name: deletingLevel?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin_policy.levels.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLevel}>{t('admin_policy.levels.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
