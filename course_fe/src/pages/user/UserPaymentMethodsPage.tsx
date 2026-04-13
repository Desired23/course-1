import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Badge } from "../../components/ui/badge"
import { toast } from "sonner"
import { CreditCard, Plus, Trash2, CheckCircle, Smartphone, Building2, Wallet } from "lucide-react"
import {
  getUserPaymentMethods,
  createUserPaymentMethod,
  deleteUserPaymentMethod,
  setDefaultUserPaymentMethod,
  type UserPaymentMethod,
} from "../../services/payment-method.api"
import { UserPagination } from "../../components/UserPagination"
import { motion } from "motion/react"

type MethodType = UserPaymentMethod["method_type"]

const initialFormState = {
  method_type: "vnpay" as MethodType,
  nickname: "",
  masked_account: "",
  bank_name: "",
  bank_branch: "",
  account_number: "",
  account_name: "",
}

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

export function UserPaymentMethodsPage() {
  const { t } = useTranslation()
  const [methods, setMethods] = useState<UserPaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [methodFilter, setMethodFilter] = useState<"all" | MethodType>("all")
  const [defaultFilter, setDefaultFilter] = useState<"all" | "default" | "non_default">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(initialFormState)

  const getMethodLabel = (type: MethodType) => t(`user_payment_methods_page.method_types.${type}`)

  const fetchMethods = async () => {
    try {
      const data = await getUserPaymentMethods({
        page: currentPage,
        page_size: pageSize,
        method_type: methodFilter,
        default_filter: defaultFilter,
        search: searchTerm || undefined,
      })
      setMethods(data.results || [])
      setTotalPages(data.total_pages || 1)
      setTotalCount(data.count || 0)
    } catch {
      toast.error(t("user_payment_methods_page.load_failed"))
      setMethods([])
      setTotalPages(1)
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchMethods()
  }, [currentPage, pageSize, searchTerm, methodFilter, defaultFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, methodFilter, defaultFilter, pageSize])

  const handleAdd = async () => {
    if (form.method_type === "bank_transfer") {
      if (!form.bank_name || !form.account_number || !form.account_name) {
        toast.error(t("user_payment_methods_page.required_bank_fields"))
        return
      }
    }

    setIsSubmitting(true)
    try {
      await createUserPaymentMethod({
        method_type: form.method_type,
        nickname: form.nickname || undefined,
        masked_account: form.masked_account || undefined,
        bank_name: form.bank_name || undefined,
        bank_branch: form.bank_branch || undefined,
        account_number: form.account_number || undefined,
        account_name: form.account_name || undefined,
        is_default: methods.length === 0,
      })
      setIsAddOpen(false)
      setForm(initialFormState)
      toast.success(t("user_payment_methods_page.add_success"))
      void fetchMethods()
    } catch {
      toast.error(t("user_payment_methods_page.add_failed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("user_payment_methods_page.confirm_delete"))) return
    try {
      await deleteUserPaymentMethod(id)
      toast.success(t("user_payment_methods_page.delete_success"))
      void fetchMethods()
    } catch {
      toast.error(t("user_payment_methods_page.delete_failed"))
    }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultUserPaymentMethod(id)
      toast.success(t("user_payment_methods_page.set_default_success"))
      void fetchMethods()
    } catch {
      toast.error(t("user_payment_methods_page.set_default_failed"))
    }
  }

  const getMethodColor = (type: MethodType) => {
    switch (type) {
      case "vnpay":
        return "bg-blue-600"
      case "momo":
        return "bg-pink-600"
      case "bank_transfer":
        return "bg-green-600"
      case "credit_card":
        return "bg-orange-600"
      default:
        return "bg-gray-600"
    }
  }

  const getMethodIcon = (type: MethodType) => {
    switch (type) {
      case "vnpay":
        return <Wallet className="h-6 w-6 text-white" />
      case "momo":
        return <Smartphone className="h-6 w-6 text-white" />
      case "bank_transfer":
        return <Building2 className="h-6 w-6 text-white" />
      case "credit_card":
        return <CreditCard className="h-6 w-6 text-white" />
      default:
        return <CreditCard className="h-6 w-6 text-white" />
    }
  }

  const getMethodDetail = (method: UserPaymentMethod) => {
    if (method.masked_account) return method.masked_account
    if (method.account_number) return `${method.bank_name || ""} - ${method.account_number}`
    return getMethodLabel(method.method_type)
  }

  return (
    <motion.div
      className="max-w-4xl mx-auto p-4 md:p-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div className="mb-8 flex justify-between items-start" variants={fadeInUp} initial="hidden" animate="show">
        <div>
          <h1>{t("user_payment_methods_page.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("user_payment_methods_page.subtitle")}</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("user_payment_methods_page.add_method")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t("user_payment_methods_page.dialog_title")}</DialogTitle>
              <DialogDescription>{t("user_payment_methods_page.dialog_description")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="methodType">{t("user_payment_methods_page.method_type_label")}</Label>
                <Select
                  value={form.method_type}
                  onValueChange={(value) => setForm({ ...initialFormState, method_type: value as MethodType })}
                >
                  <SelectTrigger id="methodType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vnpay">{getMethodLabel("vnpay")}</SelectItem>
                    <SelectItem value="momo">{getMethodLabel("momo")}</SelectItem>
                    <SelectItem value="bank_transfer">{getMethodLabel("bank_transfer")}</SelectItem>
                    <SelectItem value="credit_card">{getMethodLabel("credit_card")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname">{t("user_payment_methods_page.nickname_label")}</Label>
                <Input
                  id="nickname"
                  placeholder={t("user_payment_methods_page.nickname_placeholder")}
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                />
              </div>

              {form.method_type === "bank_transfer" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">{t("user_payment_methods_page.bank_name_label")}</Label>
                    <Input
                      id="bankName"
                      placeholder={t("user_payment_methods_page.bank_name_placeholder")}
                      value={form.bank_name}
                      onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankBranch">{t("user_payment_methods_page.bank_branch_label")}</Label>
                    <Input
                      id="bankBranch"
                      placeholder={t("user_payment_methods_page.bank_branch_placeholder")}
                      value={form.bank_branch}
                      onChange={(e) => setForm({ ...form, bank_branch: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">{t("user_payment_methods_page.account_number_label")}</Label>
                      <Input
                        id="accountNumber"
                        placeholder="0123456789"
                        value={form.account_number}
                        onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountName">{t("user_payment_methods_page.account_name_label")}</Label>
                      <Input
                        id="accountName"
                        placeholder={t("user_payment_methods_page.account_name_placeholder")}
                        value={form.account_name}
                        onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {(form.method_type === "vnpay" || form.method_type === "momo" || form.method_type === "credit_card") && (
                <div className="space-y-2">
                  <Label htmlFor="maskedAccount">{t("user_payment_methods_page.account_info_label")}</Label>
                  <Input
                    id="maskedAccount"
                    placeholder={
                      form.method_type === "credit_card"
                        ? t("user_payment_methods_page.account_info_placeholder_card")
                        : t("user_payment_methods_page.account_info_placeholder_wallet")
                    }
                    value={form.masked_account}
                    onChange={(e) => setForm({ ...form, masked_account: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleAdd} disabled={isSubmitting}>
                {isSubmitting ? t("user_payment_methods_page.adding") : t("user_payment_methods_page.add_method_submit")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div variants={fadeInUp} initial="hidden" animate="show">
      <Card className="mb-4">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            className="h-9"
            placeholder={t("user_payment_methods_page.search_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="h-9 rounded-md border px-3 text-sm"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as "all" | MethodType)}
          >
            <option value="all">{t("user_payment_methods_page.filters.all_methods")}</option>
            <option value="vnpay">{getMethodLabel("vnpay")}</option>
            <option value="momo">{getMethodLabel("momo")}</option>
            <option value="bank_transfer">{getMethodLabel("bank_transfer")}</option>
            <option value="credit_card">{getMethodLabel("credit_card")}</option>
          </select>
          <select
            className="h-9 rounded-md border px-3 text-sm"
            value={defaultFilter}
            onChange={(e) => setDefaultFilter(e.target.value as "all" | "default" | "non_default")}
          >
            <option value="all">{t("user_payment_methods_page.filters.all_status")}</option>
            <option value="default">{t("user_payment_methods_page.filters.default_only")}</option>
            <option value="non_default">{t("user_payment_methods_page.filters.non_default")}</option>
          </select>
          <select
            className="h-9 rounded-md border px-3 text-sm"
            value={String(pageSize)}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value="5">{t("user_payment_methods_page.page_size.five")}</option>
            <option value="10">{t("user_payment_methods_page.page_size.ten")}</option>
            <option value="20">{t("user_payment_methods_page.page_size.twenty")}</option>
          </select>
          <Button
            variant="ghost"
            onClick={() => {
              setSearchTerm("")
              setMethodFilter("all")
              setDefaultFilter("all")
            }}
          >
            {t("user_payment_methods_page.clear_filters")}
          </Button>
        </CardContent>
      </Card>
      </motion.div>

      <motion.div className="space-y-4" variants={sectionStagger} initial="hidden" animate="show">
        {loading ? (
          <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">{t("user_payment_methods_page.loading")}</p>
            </CardContent>
          </Card>
          </motion.div>
        ) : methods.length === 0 ? (
          <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">{t("user_payment_methods_page.empty")}</p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t("user_payment_methods_page.add_first")}
              </Button>
            </CardContent>
          </Card>
          </motion.div>
        ) : (
          methods.map((method, index) => (
            <motion.div
              key={method.id}
              variants={fadeInUp}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: index * 0.03, ease: "easeOut" }}
              whileHover={{ y: -2 }}
            >
            <Card className="relative">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-10 rounded ${getMethodColor(method.method_type)} flex items-center justify-center`}>
                      {getMethodIcon(method.method_type)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3>{getMethodLabel(method.method_type)}</h3>
                        {method.is_default && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {t("user_payment_methods_page.default_badge")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground">{getMethodDetail(method)}</p>
                      {method.nickname && <p className="text-sm text-muted-foreground mt-1">{method.nickname}</p>}
                      {method.account_name && <p className="text-sm text-muted-foreground">{method.account_name}</p>}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!method.is_default && (
                      <Button variant="outline" size="sm" onClick={() => handleSetDefault(method.id)}>
                        {t("user_payment_methods_page.set_default")}
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(method.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          ))
        )}
      </motion.div>

      {methods.length > 0 && (
        <motion.div className="mt-4 flex items-center justify-between" variants={fadeInUp} initial="hidden" animate="show">
          <p className="text-sm text-muted-foreground">
            {t("user_payment_methods_page.pagination", {
              current: currentPage,
              totalPages,
              totalCount,
            })}
          </p>
          <UserPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </motion.div>
      )}

      <motion.div variants={fadeInUp} initial="hidden" animate="show">
      <Card className="mt-8 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {t("user_payment_methods_page.security_title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("user_payment_methods_page.security_description")}</p>
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  )
}
