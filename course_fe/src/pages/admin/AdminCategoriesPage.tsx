import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Badge } from "../../components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { AdminConfirmDialog } from "../../components/admin/AdminConfirmDialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Switch } from "../../components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Plus, Edit, Trash2, Folder, Search, Tag, Layers, Code, Briefcase, Palette, Megaphone, Database, Music, BookOpen } from 'lucide-react'
import { toast } from "sonner"
import { getAllCategories, createCategory as createCategoryApi, updateCategory as updateCategoryApi, deleteCategory as deleteCategoryApi } from '../../services/category.api'
import type { Category as ApiCategory } from '../../services/category.api'

interface Category {
  id: string
  name: string
  slug: string
  description: string
  parentId: string | null
  icon: string
  color: string
  isActive: boolean
  coursesCount: number
  order: number
  createdAt: string
}

interface Subcategory {
  id: string
  name: string
  slug: string
  categoryId: string
  coursesCount: number
  isActive: boolean
}

const ICON_MAP: Record<string, any> = {
  Code,
  Briefcase,
  Palette,
  Megaphone,
  Database,
  Music,
  BookOpen,
  Folder,
}

type ConfirmState = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  destructive: boolean
  loading: boolean
  action: null | (() => Promise<void> | void)
}

const DEFAULT_CONFIRM_STATE: ConfirmState = {
  open: false,
  title: '',
  description: '',
  confirmLabel: '',
  destructive: false,
  loading: false,
  action: null,
}

export function AdminCategoriesPage() {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubcategoryDialogOpen, setIsSubcategoryDialogOpen] = useState(false)
  const [isSavingCategory, setIsSavingCategory] = useState(false)
  const [isSavingSubcategory, setIsSavingSubcategory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState>(DEFAULT_CONFIRM_STATE)

  const [categoryName, setCategoryName] = useState('')
  const [categorySlug, setCategorySlug] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [categoryIcon, setCategoryIcon] = useState('Folder')
  const [categoryColor, setCategoryColor] = useState('#3b82f6')

  const [subcategoryName, setSubcategoryName] = useState('')
  const [subcategorySlug, setSubcategorySlug] = useState('')
  const [subcategoryParent, setSubcategoryParent] = useState('')

  const mapApiCategory = (c: ApiCategory, idx: number): Category => ({
    id: String(c.id),
    name: c.name,
    slug: c.name.toLowerCase().replace(/\s+/g, '-'),
    description: c.description || '',
    parentId: c.parent_category ? String(c.parent_category) : null,
    icon: c.icon || 'Folder',
    color: '#3b82f6',
    isActive: c.status === 'active',
    coursesCount: 0,
    order: idx + 1,
    createdAt: c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
  })

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setErrorMessage('')
      const res = await getAllCategories({ page_size: 200 })
      const all = res.results ?? []
      const parents = all.filter(c => !c.parent_category)
      const children = all.filter(c => c.parent_category)
      setCategories(parents.map((c, i) => mapApiCategory(c, i)))
      setSubcategories(children.map(c => ({
        id: String(c.id),
        name: c.name,
        slug: c.name.toLowerCase().replace(/\s+/g, '-'),
        categoryId: String(c.parent_category),
        coursesCount: 0,
        isActive: c.status === 'active',
      })))
    } catch {
      setErrorMessage(t('admin_categories.toasts.load_failed'))
      toast.error(t('admin_categories.toasts.load_failed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const openConfirm = (
    title: string,
    description: string,
    confirmLabel: string,
    action: () => Promise<void> | void,
    destructive = false
  ) => {
    setConfirmState({
      open: true,
      title,
      description,
      confirmLabel,
      destructive,
      loading: false,
      action,
    })
  }

  const runConfirmedAction = async () => {
    if (!confirmState.action) return
    try {
      setConfirmState(prev => ({ ...prev, loading: true }))
      await confirmState.action()
      setConfirmState(DEFAULT_CONFIRM_STATE)
    } catch {
      setConfirmState(prev => ({ ...prev, loading: false }))
    }
  }

  const resetCategoryForm = () => {
    setCategoryName('')
    setCategorySlug('')
    setCategoryDescription('')
    setCategoryIcon('Folder')
    setCategoryColor('#3b82f6')
    setEditingCategory(null)
  }

  const resetSubcategoryForm = () => {
    setSubcategoryName('')
    setSubcategorySlug('')
    setSubcategoryParent('')
  }

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast.error(t('admin_categories.toasts.name_required'))
      return
    }
    try {
      setIsSavingCategory(true)
      const created = await createCategoryApi({
        name: categoryName,
        description: categoryDescription,
        icon: categoryIcon,
        status: 'active',
      })
      setCategories(prev => [...prev, mapApiCategory(created, prev.length)])
      toast.success(t('admin_categories.toasts.create_success'))
      resetCategoryForm()
      setIsDialogOpen(false)
    } catch {
      toast.error(t('admin_categories.toasts.create_failed'))
    } finally {
      setIsSavingCategory(false)
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return
    try {
      setIsSavingCategory(true)
      await updateCategoryApi(Number(editingCategory.id), {
        name: categoryName,
        description: categoryDescription,
        icon: categoryIcon,
      })
      setCategories(prev => prev.map(cat =>
        cat.id === editingCategory.id
          ? {
              ...cat,
              name: categoryName,
              slug: categorySlug || categoryName.toLowerCase().replace(/\s+/g, '-'),
              description: categoryDescription,
              icon: categoryIcon,
              color: categoryColor,
            }
          : cat
      ))
      toast.success(t('admin_categories.toasts.update_success'))
      resetCategoryForm()
      setIsDialogOpen(false)
    } catch {
      toast.error(t('admin_categories.toasts.update_failed'))
    } finally {
      setIsSavingCategory(false)
    }
  }

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return
    const subcatsCount = subcategories.filter(s => s.categoryId === categoryId).length
    openConfirm(
      t('admin_categories.actions.delete_category_title'),
      subcatsCount > 0
        ? t('admin_categories.actions.delete_category_with_children_description', { name: category.name, count: subcatsCount })
        : t('admin_categories.actions.delete_category_description', { name: category.name }),
      t('admin_categories.actions.delete_category_confirm'),
      async () => {
        try {
          await deleteCategoryApi(Number(categoryId))
          setCategories(prev => prev.filter(c => c.id !== categoryId))
          setSubcategories(prev => prev.filter(s => s.categoryId !== categoryId))
          toast.success(t('admin_categories.toasts.delete_category_success'))
        } catch {
          toast.error(t('admin_categories.toasts.delete_failed'))
          throw new Error('delete-category-failed')
        }
      },
      true
    )
  }

  const handleToggleStatus = async (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId)
    if (!cat) return
    try {
      await updateCategoryApi(Number(categoryId), { status: cat.isActive ? 'inactive' : 'active' })
      setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, isActive: !c.isActive } : c))
    } catch {
      toast.error(t('admin_categories.toasts.action_failed'))
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryName(category.name)
    setCategorySlug(category.slug)
    setCategoryDescription(category.description)
    setCategoryIcon(category.icon)
    setCategoryColor(category.color)
    setIsDialogOpen(true)
  }

  const handleCreateSubcategory = async () => {
    if (!subcategoryName.trim() || !subcategoryParent) {
      toast.error(t('admin_categories.toasts.required_fields'))
      return
    }
    try {
      setIsSavingSubcategory(true)
      const created = await createCategoryApi({
        name: subcategoryName,
        parent_category: Number(subcategoryParent),
        status: 'active',
      })
      setSubcategories(prev => [...prev, {
        id: String(created.id),
        name: created.name,
        slug: created.name.toLowerCase().replace(/\s+/g, '-'),
        categoryId: subcategoryParent,
        coursesCount: 0,
        isActive: true,
      }])
      toast.success(t('admin_categories.toasts.create_subcategory_success'))
      resetSubcategoryForm()
      setIsSubcategoryDialogOpen(false)
    } catch {
      toast.error(t('admin_categories.toasts.create_subcategory_failed'))
    } finally {
      setIsSavingSubcategory(false)
    }
  }

  const handleDeleteSubcategory = (subcategoryId: string) => {
    const subcategory = subcategories.find(s => s.id === subcategoryId)
    if (!subcategory) return
    openConfirm(
      t('admin_categories.actions.delete_subcategory_title'),
      t('admin_categories.actions.delete_subcategory_description', { name: subcategory.name }),
      t('admin_categories.actions.delete_subcategory_confirm'),
      async () => {
        try {
          await deleteCategoryApi(Number(subcategoryId))
          setSubcategories(prev => prev.filter(s => s.id !== subcategoryId))
          toast.success(t('admin_categories.toasts.delete_subcategory_success'))
        } catch {
          toast.error(t('admin_categories.toasts.delete_failed'))
          throw new Error('delete-subcategory-failed')
        }
      },
      true
    )
  }

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      const matchesSearch =
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter =
        filterStatus === 'all' ||
        (filterStatus === 'active' && cat.isActive) ||
        (filterStatus === 'inactive' && !cat.isActive)
      return matchesSearch && matchesFilter
    })
  }, [categories, filterStatus, searchQuery])

  const visibleSubcategories = useMemo(() => {
    const visibleParentIds = new Set(filteredCategories.map(category => category.id))
    return subcategories.filter(subcategory => visibleParentIds.has(subcategory.categoryId))
  }, [filteredCategories, subcategories])

  return (
    <div className="p-8 space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="mb-2">{t('admin_categories.title')}</h1>
            <p className="text-muted-foreground">{t('admin_categories.subtitle')}</p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) resetCategoryForm()
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={resetCategoryForm}>
                <Plus className="h-4 w-4 mr-2" />
                {t('admin_categories.create_category')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingCategory ? t('admin_categories.dialogs.edit_title') : t('admin_categories.dialogs.create_title')}</DialogTitle>
                <DialogDescription>
                  {editingCategory ? t('admin_categories.dialogs.edit_description') : t('admin_categories.dialogs.create_description')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category-name">{t('admin_categories.form.category_name')}</Label>
                    <Input
                      id="category-name"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder={t('admin_categories.form.category_name_placeholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category-slug">{t('admin_categories.form.slug')}</Label>
                    <Input
                      id="category-slug"
                      value={categorySlug}
                      onChange={(e) => setCategorySlug(e.target.value)}
                      placeholder={t('admin_categories.form.slug_placeholder')}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="category-description">{t('admin_categories.form.description')}</Label>
                  <Textarea
                    id="category-description"
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    placeholder={t('admin_categories.form.description_placeholder')}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category-icon">{t('admin_categories.form.icon_name')}</Label>
                    <Input
                      id="category-icon"
                      value={categoryIcon}
                      onChange={(e) => setCategoryIcon(e.target.value)}
                      placeholder={t('admin_categories.form.icon_placeholder')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category-color">{t('admin_categories.form.color')}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="category-color"
                        type="color"
                        value={categoryColor}
                        onChange={(e) => setCategoryColor(e.target.value)}
                        className="w-20"
                      />
                      <Input
                        value={categoryColor}
                        onChange={(e) => setCategoryColor(e.target.value)}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button disabled={isSavingCategory} onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}>
                  {isSavingCategory ? t('admin_categories.saving') : editingCategory ? t('admin_categories.dialogs.update_category') : t('admin_categories.dialogs.create_category')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('admin_categories.stats.total_categories')}</p>
                  <p className="text-2xl font-bold">{categories.length}</p>
                </div>
                <Folder className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('admin_categories.stats.active_categories')}</p>
                  <p className="text-2xl font-bold">{categories.filter(c => c.isActive).length}</p>
                </div>
                <Layers className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('admin_categories.stats.subcategories')}</p>
                  <p className="text-2xl font-bold">{subcategories.length}</p>
                </div>
                <Tag className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('admin_categories.stats.visible_results')}</p>
                  <p className="text-2xl font-bold">{filteredCategories.length}</p>
                </div>
                <Search className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-col lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('admin_categories.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: 'all' | 'active' | 'inactive') => setFilterStatus(value)}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin_categories.filters.all')}</SelectItem>
                <SelectItem value="active">{t('admin_categories.filters.active_only')}</SelectItem>
                <SelectItem value="inactive">{t('admin_categories.filters.inactive_only')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setIsSubcategoryDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('admin_categories.add_subcategory')}
            </Button>
            <Button variant="outline" onClick={() => void fetchData()} disabled={isLoading}>
              {isLoading ? t('admin_categories.refreshing') : t('admin_categories.refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin_categories.categories_title')}</CardTitle>
          <CardDescription>{t('admin_categories.categories_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t('admin_categories.loading_categories')}</div>
          ) : errorMessage ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm text-destructive">{errorMessage}</p>
              <Button variant="outline" onClick={() => void fetchData()}>{t('admin_categories.retry')}</Button>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t('admin_categories.empty_categories')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">{t('admin_categories.table.order')}</TableHead>
                  <TableHead>{t('admin_categories.table.category')}</TableHead>
                  <TableHead>{t('admin_categories.table.subcategories')}</TableHead>
                  <TableHead>{t('admin_categories.table.status')}</TableHead>
                  <TableHead>{t('admin_categories.table.created')}</TableHead>
                  <TableHead className="text-right">{t('admin_categories.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => {
                  const categorySubcats = subcategories.filter(s => s.categoryId === category.id)
                  const CategoryIcon = ICON_MAP[category.icon] || BookOpen
                  return (
                    <TableRow key={category.id}>
                      <TableCell>{category.order}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${category.color}20` }}
                          >
                            <CategoryIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-sm text-muted-foreground">{category.description || t('admin_categories.no_description')}</p>
                            <p className="text-xs text-muted-foreground">/{category.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {categorySubcats.length > 0 ? (
                            <>
                              {categorySubcats.slice(0, 2).map(sub => (
                                <Badge key={sub.id} variant="secondary" className="text-xs">
                                  {sub.name}
                                </Badge>
                              ))}
                              {categorySubcats.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{categorySubcats.length - 2}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">{t('admin_categories.no_subcategories')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={category.isActive}
                            onCheckedChange={() => void handleToggleStatus(category.id)}
                          />
                          <span className="text-sm">{category.isActive ? t('admin_categories.status.active') : t('admin_categories.status.inactive')}</span>
                        </div>
                      </TableCell>
                      <TableCell>{category.createdAt}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin_categories.subcategories_title')}</CardTitle>
          <CardDescription>{t('admin_categories.subcategories_description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t('admin_categories.loading_subcategories')}</div>
          ) : visibleSubcategories.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t('admin_categories.empty_subcategories')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin_categories.subcategory_table.name')}</TableHead>
                  <TableHead>{t('admin_categories.subcategory_table.parent_category')}</TableHead>
                  <TableHead>{t('admin_categories.subcategory_table.status')}</TableHead>
                  <TableHead className="text-right">{t('admin_categories.subcategory_table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSubcategories.map((subcategory) => (
                  <TableRow key={subcategory.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{subcategory.name}</p>
                        <p className="text-xs text-muted-foreground">/{subcategory.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {categories.find(category => category.id === subcategory.categoryId)?.name || t('admin_categories.unknown')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={subcategory.isActive ? 'default' : 'secondary'}>
                        {subcategory.isActive ? t('admin_categories.status.active') : t('admin_categories.status.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteSubcategory(subcategory.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isSubcategoryDialogOpen}
        onOpenChange={(open) => {
          setIsSubcategoryDialogOpen(open)
          if (!open) resetSubcategoryForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin_categories.subcategory_dialog.title')}</DialogTitle>
            <DialogDescription>{t('admin_categories.subcategory_dialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="parent-category">{t('admin_categories.subcategory_dialog.parent_category')}</Label>
              <Select value={subcategoryParent} onValueChange={setSubcategoryParent}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin_categories.subcategory_dialog.parent_category_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => {
                    const ParentIcon = ICON_MAP[cat.icon] || BookOpen
                    return (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="inline-flex items-center gap-2">
                          <ParentIcon className="h-4 w-4" />
                          {cat.name}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subcat-name">{t('admin_categories.subcategory_dialog.name')}</Label>
                <Input
                  id="subcat-name"
                  value={subcategoryName}
                  onChange={(e) => setSubcategoryName(e.target.value)}
                  placeholder={t('admin_categories.subcategory_dialog.name_placeholder')}
                />
              </div>
              <div>
                <Label htmlFor="subcat-slug">{t('admin_categories.subcategory_dialog.slug')}</Label>
                <Input
                  id="subcat-slug"
                  value={subcategorySlug}
                  onChange={(e) => setSubcategorySlug(e.target.value)}
                  placeholder={t('admin_categories.subcategory_dialog.slug_placeholder')}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubcategoryDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button disabled={isSavingSubcategory} onClick={handleCreateSubcategory}>
              {isSavingSubcategory ? t('admin_categories.saving') : t('admin_categories.subcategory_dialog.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => {
          if (!confirmState.loading) {
            setConfirmState(prev => ({ ...prev, open }))
          }
        }}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        loading={confirmState.loading}
        onConfirm={runConfirmedAction}
      />
    </div>
  )
}
