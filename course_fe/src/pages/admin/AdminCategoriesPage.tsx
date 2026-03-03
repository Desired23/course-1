import { useState, useEffect } from 'react'
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Badge } from "../../components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Switch } from "../../components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Plus, Edit, Trash2, Folder, Eye, Search, Tag, Layers } from 'lucide-react'
import { toast } from "sonner"
import { getAllCategories, createCategory as createCategoryApi, updateCategory as updateCategoryApi, deleteCategory as deleteCategoryApi, getSubcategories as getSubcategoriesApi } from '../../services/category.api'
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



export function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])

  const mapApiCategory = (c: ApiCategory, idx: number): Category => ({
    id: String(c.id),
    name: c.name,
    slug: c.name.toLowerCase().replace(/\s+/g, '-'),
    description: c.description || '',
    parentId: c.parent_category ? String(c.parent_category) : null,
    icon: '📁',
    color: '#3b82f6',
    isActive: c.status === 'active',
    coursesCount: 0,
    order: idx + 1,
    createdAt: c.created_at ? new Date(c.created_at).toLocaleDateString() : ''
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
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
          isActive: c.status === 'active'
        })))
      } catch {
        toast.error('Không thể tải danh mục')
      }
    }
    fetchData()
  }, [])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubcategoryDialogOpen, setIsSubcategoryDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')

  // Category form state
  const [categoryName, setCategoryName] = useState('')
  const [categorySlug, setCategorySlug] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [categoryIcon, setCategoryIcon] = useState('📁')
  const [categoryColor, setCategoryColor] = useState('#3b82f6')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Subcategory form state
  const [subcategoryName, setSubcategoryName] = useState('')
  const [subcategorySlug, setSubcategorySlug] = useState('')
  const [subcategoryParent, setSubcategoryParent] = useState('')

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Please enter a category name')
      return
    }
    try {
      const created = await createCategoryApi({ name: categoryName, description: categoryDescription, status: 'active' })
      setCategories(prev => [...prev, mapApiCategory(created, prev.length)])
      toast.success('Category created successfully')
      resetCategoryForm()
      setIsDialogOpen(false)
    } catch { toast.error('Tạo danh mục thất bại') }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return
    try {
      await updateCategoryApi(Number(editingCategory.id), { name: categoryName, description: categoryDescription })
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, name: categoryName, slug: categorySlug, description: categoryDescription, icon: categoryIcon, color: categoryColor }
          : cat
      ))
      toast.success('Category updated successfully')
      resetCategoryForm()
      setIsDialogOpen(false)
    } catch { toast.error('Cập nhật thất bại') }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return
    const subcatsCount = subcategories.filter(s => s.categoryId === categoryId).length
    if (confirm(`Delete "${category.name}"? This category has ${category.coursesCount} courses and ${subcatsCount} subcategories.`)) {
      try {
        await deleteCategoryApi(Number(categoryId))
        setCategories(categories.filter(c => c.id !== categoryId))
        setSubcategories(subcategories.filter(s => s.categoryId !== categoryId))
        toast.success('Category deleted successfully')
      } catch { toast.error('Xóa thất bại') }
    }
  }

  const handleToggleStatus = async (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId)
    if (!cat) return
    try {
      await updateCategoryApi(Number(categoryId), { status: cat.isActive ? 'inactive' : 'active' })
      setCategories(categories.map(c => c.id === categoryId ? { ...c, isActive: !c.isActive } : c))
    } catch { toast.error('Thao tác thất bại') }
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
      toast.error('Please fill in all required fields')
      return
    }
    try {
      const created = await createCategoryApi({ name: subcategoryName, parent_category: Number(subcategoryParent), status: 'active' })
      setSubcategories(prev => [...prev, {
        id: String(created.id),
        name: created.name,
        slug: created.name.toLowerCase().replace(/\s+/g, '-'),
        categoryId: subcategoryParent,
        coursesCount: 0,
        isActive: true
      }])
      toast.success('Subcategory created successfully')
      resetSubcategoryForm()
      setIsSubcategoryDialogOpen(false)
    } catch { toast.error('Tạo danh mục con thất bại') }
  }

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    if (confirm('Delete this subcategory?')) {
      try {
        await deleteCategoryApi(Number(subcategoryId))
        setSubcategories(subcategories.filter(s => s.id !== subcategoryId))
        toast.success('Subcategory deleted successfully')
      } catch { toast.error('Xóa thất bại') }
    }
  }

  const resetCategoryForm = () => {
    setCategoryName('')
    setCategorySlug('')
    setCategoryDescription('')
    setCategoryIcon('📁')
    setCategoryColor('#3b82f6')
    setEditingCategory(null)
  }

  const resetSubcategoryForm = () => {
    setSubcategoryName('')
    setSubcategorySlug('')
    setSubcategoryParent('')
  }

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cat.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && cat.isActive) ||
                         (filterStatus === 'inactive' && !cat.isActive)
    return matchesSearch && matchesFilter
  })

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="mb-2">Categories Management</h1>
            <p className="text-muted-foreground">Organize courses into categories and subcategories</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetCategoryForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
                <DialogDescription>
                  {editingCategory ? 'Update category information' : 'Add a new course category to organize your content'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category-name">Category Name</Label>
                    <Input
                      id="category-name"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      placeholder="e.g., Development"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category-slug">URL Slug</Label>
                    <Input
                      id="category-slug"
                      value={categorySlug}
                      onChange={(e) => setCategorySlug(e.target.value)}
                      placeholder="e.g., development"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="category-description">Description</Label>
                  <Textarea
                    id="category-description"
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    placeholder="Brief description of this category"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category-icon">Icon (Emoji)</Label>
                    <Input
                      id="category-icon"
                      value={categoryIcon}
                      onChange={(e) => setCategoryIcon(e.target.value)}
                      placeholder="📁"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category-color">Color</Label>
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
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetCategoryForm(); }}>
                  Cancel
                </Button>
                <Button onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}>
                  {editingCategory ? 'Update' : 'Create'} Category
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Categories</p>
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
                  <p className="text-sm text-muted-foreground">Active Categories</p>
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
                  <p className="text-sm text-muted-foreground">Subcategories</p>
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
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                  <p className="text-2xl font-bold">{categories.reduce((sum, c) => sum + c.coursesCount, 0)}</p>
                </div>
                <Eye className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setIsSubcategoryDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subcategory
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Manage main course categories</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Order</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subcategories</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => {
                const categorySubcats = subcategories.filter(s => s.categoryId === category.id)
                return (
                  <TableRow key={category.id}>
                    <TableCell>{category.order}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                          style={{ backgroundColor: category.color + '20' }}
                        >
                          {category.icon}
                        </div>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-sm text-muted-foreground">{category.description}</p>
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
                          <span className="text-sm text-muted-foreground">No subcategories</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{category.coursesCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={category.isActive}
                          onCheckedChange={() => handleToggleStatus(category.id)}
                        />
                        <span className="text-sm">
                          {category.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{category.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Subcategory Dialog */}
      <Dialog open={isSubcategoryDialogOpen} onOpenChange={setIsSubcategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subcategory</DialogTitle>
            <DialogDescription>Add a new subcategory under a parent category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="parent-category">Parent Category</Label>
              <Select value={subcategoryParent} onValueChange={setSubcategoryParent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subcat-name">Subcategory Name</Label>
                <Input
                  id="subcat-name"
                  value={subcategoryName}
                  onChange={(e) => setSubcategoryName(e.target.value)}
                  placeholder="e.g., Web Development"
                />
              </div>
              <div>
                <Label htmlFor="subcat-slug">URL Slug</Label>
                <Input
                  id="subcat-slug"
                  value={subcategorySlug}
                  onChange={(e) => setSubcategorySlug(e.target.value)}
                  placeholder="e.g., web-development"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsSubcategoryDialogOpen(false); resetSubcategoryForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubcategory}>
              Create Subcategory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
