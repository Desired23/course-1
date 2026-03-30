import { useEffect, useState } from "react"
import { FilterComponents } from "../../components/FilterComponents"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Badge } from "../../components/ui/badge"
import { Card } from "../../components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog-fixed"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Checkbox } from "../../components/ui/checkbox"
import { AdminBulkActionBar } from "../../components/admin/AdminBulkActionBar"
import { AdminConfirmDialog } from "../../components/admin/AdminConfirmDialog"
import {
  Search,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Tag,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
} from "lucide-react"
import { cn } from "../../components/ui/utils"
import { toast } from "sonner"
import { getPromotions, createPromotion, deletePromotion, updatePromotion } from "../../services/promotions.api"
import type { Promotion } from "../../services/promotions.api"
import { useTranslation } from "react-i18next"

interface Discount {
  id: string
  code: string
  type: "percentage" | "fixed"
  value: number
  description: string
  usageLimit: number
  usedCount: number
  expiry: string
  status: "active" | "expired" | "disabled"
  creatorRole: "admin" | "instructor"
  applicableTo: "all" | "specific"
}

export function AdminDiscountsPage() {
  const { t } = useTranslation()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedDiscountIds, setSelectedDiscountIds] = useState<string[]>([])
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel: string
    destructive: boolean
    loading: boolean
    action: null | (() => Promise<void>)
  }>({
    open: false,
    title: "",
    description: "",
    confirmLabel: t("common.confirm"),
    destructive: false,
    loading: false,
    action: null,
  })
  const [newDiscount, setNewDiscount] = useState({
    code: "",
    type: "percentage" as "percentage" | "fixed",
    value: "",
    description: "",
    usageLimit: "",
    expiry: "",
    applicableTo: "all" as "all" | "specific",
  })
  const [discounts, setDiscounts] = useState<Discount[]>([])

  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const response = await getPromotions()
        const list: Promotion[] = Array.isArray(response) ? response : (response as { results?: Promotion[] }).results ?? []
        setDiscounts(
          list.map((promotion) => ({
            id: String(promotion.id),
            code: promotion.code,
            type: promotion.discount_type,
            value: Number(promotion.discount_value),
            description: promotion.description || "",
            usageLimit: promotion.usage_limit || 0,
            usedCount: promotion.used_count,
            expiry: promotion.end_date ? new Date(promotion.end_date).toISOString().split("T")[0] : "",
            status:
              promotion.status === "expired"
                ? "expired"
                : promotion.status === "inactive"
                  ? "disabled"
                  : "active",
            creatorRole: promotion.admin ? "admin" : "instructor",
            applicableTo:
              (promotion.applicable_courses?.length || promotion.applicable_categories?.length)
                ? "specific"
                : "all",
          })),
        )
      } catch {
        toast.error(t("admin_discounts.toasts.load_failed"))
      }
    }

    void fetchDiscounts()
  }, [t])

  const filteredDiscounts = discounts.filter((discount) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      discount.code.toLowerCase().includes(query) ||
      discount.description.toLowerCase().includes(query)
    const matchesStatus = selectedStatus === "all" || discount.status === selectedStatus
    const matchesType = selectedType === "all" || discount.type === selectedType
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (status: Discount["status"]) => {
    const config = {
      active: {
        variant: "default" as const,
        className: "bg-green-500/10 text-green-600 dark:text-green-400",
      },
      expired: {
        variant: "secondary" as const,
        className: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
      },
      disabled: {
        variant: "destructive" as const,
        className: "",
      },
    }
    return config[status]
  }

  const getStatusLabel = (status: Discount["status"]) => t(`admin_discounts.status.${status}`)
  const getTypeLabel = (type: Discount["type"]) => t(`admin_discounts.type.${type}`)
  const getRoleLabel = (role: Discount["creatorRole"]) => t(`admin_discounts.creator_role.${role}`)

  const handleCreateDiscount = async () => {
    if (!newDiscount.code || !newDiscount.value || !newDiscount.expiry) {
      toast.error(t("admin_discounts.toasts.required_fields"))
      return
    }

    try {
      const created = await createPromotion({
        code: newDiscount.code,
        discount_type: newDiscount.type,
        discount_value: Number(newDiscount.value),
        description: newDiscount.description,
        usage_limit: newDiscount.usageLimit ? Number(newDiscount.usageLimit) : undefined,
        start_date: new Date().toISOString(),
        end_date: new Date(newDiscount.expiry).toISOString(),
        status: "active",
      })

      setDiscounts((prev) => [
        ...prev,
        {
          id: String(created.id),
          code: created.code,
          type: created.discount_type,
          value: Number(created.discount_value),
          description: created.description || "",
          usageLimit: created.usage_limit || 0,
          usedCount: 0,
          expiry: newDiscount.expiry,
          status: "active",
          creatorRole: "admin",
          applicableTo: newDiscount.applicableTo,
        },
      ])
      toast.success(t("admin_discounts.toasts.create_success"))
      setIsCreateDialogOpen(false)
      setNewDiscount({
        code: "",
        type: "percentage",
        value: "",
        description: "",
        usageLimit: "",
        expiry: "",
        applicableTo: "all",
      })
    } catch {
      toast.error(t("admin_discounts.toasts.create_failed"))
    }
  }

  const handleDeleteDiscount = async (discountId: string) => {
    try {
      await deletePromotion(Number(discountId))
      setDiscounts((prev) => prev.filter((discount) => discount.id !== discountId))
      toast.success(t("admin_discounts.toasts.delete_success"))
    } catch {
      toast.error(t("admin_discounts.toasts.delete_failed"))
    }
  }

  const handleToggleDiscountStatus = async (discount: Discount) => {
    const nextStatus = discount.status === "active" ? "inactive" : "active"
    try {
      const updated = await updatePromotion(Number(discount.id), { status: nextStatus })
      setDiscounts((prev) =>
        prev.map((item) =>
          item.id === discount.id
            ? {
                ...item,
                status:
                  updated.status === "inactive"
                    ? "disabled"
                    : updated.status === "expired"
                      ? "expired"
                      : "active",
              }
            : item,
        ),
      )
      toast.success(
        nextStatus === "active"
          ? t("admin_discounts.toasts.activated")
          : t("admin_discounts.toasts.disabled"),
      )
    } catch {
      toast.error(t("admin_discounts.toasts.status_update_failed"))
    }
  }

  const bulkSetDiscountStatus = async (ids: string[], status: "active" | "inactive", successKey: string) => {
    try {
      for (const id of ids) {
        await updatePromotion(Number(id), { status })
      }
      setDiscounts((prev) =>
        prev.map((discount) =>
          ids.includes(discount.id)
            ? { ...discount, status: status === "active" ? "active" : "disabled" }
            : discount,
        ),
      )
      setSelectedDiscountIds([])
      toast.success(t(successKey))
    } catch {
      toast.error(t("admin_discounts.toasts.bulk_failed"))
    }
  }

  const bulkDeleteDiscounts = async (ids: string[]) => {
    try {
      for (const id of ids) {
        await deletePromotion(Number(id))
      }
      setDiscounts((prev) => prev.filter((discount) => !ids.includes(discount.id)))
      setSelectedDiscountIds([])
      toast.success(t("admin_discounts.toasts.bulk_delete_success"))
    } catch {
      toast.error(t("admin_discounts.toasts.bulk_failed"))
    }
  }

  const openConfirm = (
    title: string,
    description: string,
    confirmLabel: string,
    action: () => Promise<void>,
    destructive = false,
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
      setConfirmState((prev) => ({ ...prev, loading: true }))
      await confirmState.action()
      setConfirmState({
        open: false,
        title: "",
        description: "",
        confirmLabel: t("common.confirm"),
        destructive: false,
        loading: false,
        action: null,
      })
    } catch {
      setConfirmState((prev) => ({ ...prev, loading: false }))
    }
  }

  const toggleDiscountSelection = (discountId: string, checked: boolean) => {
    setSelectedDiscountIds((prev) =>
      checked ? [...prev, discountId] : prev.filter((id) => id !== discountId),
    )
  }

  const toggleAllFilteredDiscounts = (checked: boolean) => {
    setSelectedDiscountIds(checked ? filteredDiscounts.map((discount) => discount.id) : [])
  }

  const totalRevenue = discounts.reduce((sum, discount) => sum + discount.usedCount * discount.value, 0)
  const totalUsage = discounts.reduce((sum, discount) => sum + discount.usedCount, 0)
  const activeDiscounts = discounts.filter((discount) => discount.status === "active").length
  const averageDiscount = discounts.length
    ? Math.round(discounts.reduce((sum, discount) => sum + discount.value, 0) / discounts.length)
    : 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Tag className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-medium">{t("admin_discounts.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("admin_discounts.subtitle")}</p>
            </div>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("admin_discounts.actions.create_discount")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("admin_discounts.dialogs.create_title")}</DialogTitle>
                <DialogDescription>{t("admin_discounts.dialogs.create_description")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code">{t("admin_discounts.form.code")}</Label>
                    <Input
                      id="code"
                      value={newDiscount.code}
                      onChange={(e) =>
                        setNewDiscount((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                      }
                      placeholder={t("admin_discounts.form.code_placeholder")}
                      className="mt-1.5 uppercase"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">{t("admin_discounts.form.type")}</Label>
                    <Select
                      value={newDiscount.type}
                      onValueChange={(value: "percentage" | "fixed") =>
                        setNewDiscount((prev) => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">{t("admin_discounts.type.percentage")}</SelectItem>
                        <SelectItem value="fixed">{t("admin_discounts.type.fixed")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="value">
                    {newDiscount.type === "percentage"
                      ? t("admin_discounts.form.percentage_value")
                      : t("admin_discounts.form.fixed_value")}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    value={newDiscount.value}
                    onChange={(e) => setNewDiscount((prev) => ({ ...prev, value: e.target.value }))}
                    placeholder={newDiscount.type === "percentage" ? "30" : "10"}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="description">{t("common.description")}</Label>
                  <Input
                    id="description"
                    value={newDiscount.description}
                    onChange={(e) =>
                      setNewDiscount((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder={t("admin_discounts.form.description_placeholder")}
                    className="mt-1.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="usageLimit">{t("admin_discounts.form.usage_limit")}</Label>
                    <Input
                      id="usageLimit"
                      type="number"
                      value={newDiscount.usageLimit}
                      onChange={(e) =>
                        setNewDiscount((prev) => ({ ...prev, usageLimit: e.target.value }))
                      }
                      placeholder="1000"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiry">{t("admin_discounts.form.expiry_date")}</Label>
                    <Input
                      id="expiry"
                      type="date"
                      value={newDiscount.expiry}
                      onChange={(e) => setNewDiscount((prev) => ({ ...prev, expiry: e.target.value }))}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="applicableTo">{t("admin_discounts.form.applicable_to")}</Label>
                  <Select
                    value={newDiscount.applicableTo}
                    onValueChange={(value: "all" | "specific") =>
                      setNewDiscount((prev) => ({ ...prev, applicableTo: value }))
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("admin_discounts.form.all_courses")}</SelectItem>
                      <SelectItem value="specific">{t("admin_discounts.form.specific_courses")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={handleCreateDiscount}>{t("admin_discounts.actions.create_discount")}</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Tag className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("admin_discounts.stats.active_codes")}</p>
              <p className="text-2xl font-bold">{activeDiscounts}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("admin_discounts.stats.total_usage")}</p>
              <p className="text-2xl font-bold">{totalUsage.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("admin_discounts.stats.revenue_impact")}</p>
              <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("admin_discounts.stats.average_discount")}</p>
              <p className="text-2xl font-bold">{averageDiscount}%</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("admin_discounts.filters.search_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <FilterComponents.Select
            label=""
            value={selectedType}
            options={[
              { value: "all", label: t("admin_discounts.filters.all_types") },
              { value: "percentage", label: t("admin_discounts.type.percentage") },
              { value: "fixed", label: t("admin_discounts.type.fixed") },
            ]}
            onChange={setSelectedType}
            className="w-full md:w-48"
          />
          <FilterComponents.Select
            label=""
            value={selectedStatus}
            options={[
              { value: "all", label: t("admin_discounts.filters.all_status") },
              { value: "active", label: t("admin_discounts.status.active") },
              { value: "expired", label: t("admin_discounts.status.expired") },
              { value: "disabled", label: t("admin_discounts.status.disabled") },
            ]}
            onChange={setSelectedStatus}
            className="w-full md:w-48"
          />
        </div>
      </div>

      <AdminBulkActionBar
        count={selectedDiscountIds.length}
        label={t("admin_discounts.bulk.selected_label")}
        onClear={() => setSelectedDiscountIds([])}
        actions={[
          {
            key: "activate",
            label: t("admin_discounts.bulk.activate"),
            onClick: () =>
              openConfirm(
                t("admin_discounts.bulk.activate_title"),
                t("admin_discounts.bulk.activate_description", { count: selectedDiscountIds.length }),
                t("admin_discounts.bulk.activate"),
                () =>
                  bulkSetDiscountStatus(
                    selectedDiscountIds,
                    "active",
                    "admin_discounts.toasts.bulk_activate_success",
                  ),
              ),
          },
          {
            key: "delete",
            label: t("common.delete"),
            destructive: true,
            onClick: () =>
              openConfirm(
                t("admin_discounts.bulk.delete_title"),
                t("admin_discounts.bulk.delete_description", { count: selectedDiscountIds.length }),
                t("common.delete"),
                () => bulkDeleteDiscounts(selectedDiscountIds),
                true,
              ),
          },
        ]}
      />

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[48px]">
                <Checkbox
                  checked={
                    filteredDiscounts.length > 0 &&
                    selectedDiscountIds.length === filteredDiscounts.length
                  }
                  onCheckedChange={(checked) => toggleAllFilteredDiscounts(Boolean(checked))}
                />
              </TableHead>
              <TableHead>{t("admin_discounts.table.code")}</TableHead>
              <TableHead>{t("admin_discounts.table.type")}</TableHead>
              <TableHead>{t("admin_discounts.table.value")}</TableHead>
              <TableHead>{t("admin_discounts.table.usage")}</TableHead>
              <TableHead>{t("admin_discounts.table.created_by")}</TableHead>
              <TableHead>{t("admin_discounts.table.expiry")}</TableHead>
              <TableHead>{t("admin_discounts.table.status")}</TableHead>
              <TableHead className="text-right">{t("admin_discounts.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDiscounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {t("admin_discounts.empty")}
                </TableCell>
              </TableRow>
            ) : (
              filteredDiscounts.map((discount) => {
                const statusBadge = getStatusBadge(discount.status)
                const usagePercent =
                  discount.usageLimit > 0 ? (discount.usedCount / discount.usageLimit) * 100 : 0

                return (
                  <TableRow key={discount.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedDiscountIds.includes(discount.id)}
                        onCheckedChange={(checked) =>
                          toggleDiscountSelection(discount.id, Boolean(checked))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{discount.code}</p>
                        <p className="text-sm text-muted-foreground">{discount.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {getTypeLabel(discount.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {discount.type === "percentage" ? `${discount.value}%` : `$${discount.value}`}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {discount.usedCount} / {discount.usageLimit}
                        </p>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div
                            className="bg-primary h-1.5 rounded-full"
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{getRoleLabel(discount.creatorRole)}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            discount.creatorRole === "admin"
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                          )}
                        >
                          {getRoleLabel(discount.creatorRole)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {discount.expiry}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadge.variant} className={cn("capitalize", statusBadge.className)}>
                        {getStatusLabel(discount.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              openConfirm(
                                discount.status === "active"
                                  ? t("admin_discounts.actions.disable_title")
                                  : t("admin_discounts.actions.activate_title"),
                                discount.status === "active"
                                  ? t("admin_discounts.actions.disable_description", {
                                      code: discount.code,
                                    })
                                  : t("admin_discounts.actions.activate_description", {
                                      code: discount.code,
                                    }),
                                discount.status === "active"
                                  ? t("admin_discounts.actions.disable")
                                  : t("admin_discounts.actions.activate"),
                                () => handleToggleDiscountStatus(discount),
                              )
                            }
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {discount.status === "active"
                              ? t("admin_discounts.actions.disable")
                              : t("admin_discounts.actions.activate")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              openConfirm(
                                t("admin_discounts.actions.delete_title"),
                                t("admin_discounts.actions.delete_description", {
                                  code: discount.code,
                                }),
                                t("common.delete"),
                                () => handleDeleteDiscount(discount.id),
                                true,
                              )
                            }
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AdminConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        loading={confirmState.loading}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        onConfirm={runConfirmedAction}
      />
    </div>
  )
}
