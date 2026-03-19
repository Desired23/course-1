import { useState, useEffect } from "react"
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
  getMethodTypeLabel,
  type UserPaymentMethod,
} from "../../services/payment-method.api"
import { UserPagination } from "../../components/UserPagination"

type MethodType = UserPaymentMethod['method_type']

const initialFormState = {
  method_type: 'vnpay' as MethodType,
  nickname: '',
  masked_account: '',
  bank_name: '',
  bank_branch: '',
  account_number: '',
  account_name: '',
}

export function UserPaymentMethodsPage() {
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
      toast.error("Failed to load payment methods")
      setMethods([])
      setTotalPages(1)
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMethods() }, [currentPage, pageSize, searchTerm, methodFilter, defaultFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, methodFilter, defaultFilter, pageSize])

  const handleAdd = async () => {
    if (form.method_type === 'bank_transfer') {
      if (!form.bank_name || !form.account_number || !form.account_name) {
        toast.error("Please fill in bank name, account number and account name")
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
      toast.success("Payment method added successfully!")
      fetchMethods()
    } catch {
      toast.error("Failed to add payment method")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this payment method?")) return
    try {
      await deleteUserPaymentMethod(id)
      toast.success("Payment method removed")
      fetchMethods()
    } catch {
      toast.error("Failed to remove payment method")
    }
  }

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultUserPaymentMethod(id)
      toast.success("Default payment method updated")
      fetchMethods()
    } catch {
      toast.error("Failed to update default method")
    }
  }

  const getMethodColor = (type: MethodType) => {
    switch (type) {
      case 'vnpay': return 'bg-blue-600'
      case 'momo': return 'bg-pink-600'
      case 'bank_transfer': return 'bg-green-600'
      case 'credit_card': return 'bg-orange-600'
      default: return 'bg-gray-600'
    }
  }

  const getMethodIcon = (type: MethodType) => {
    switch (type) {
      case 'vnpay': return <Wallet className="h-6 w-6 text-white" />
      case 'momo': return <Smartphone className="h-6 w-6 text-white" />
      case 'bank_transfer': return <Building2 className="h-6 w-6 text-white" />
      case 'credit_card': return <CreditCard className="h-6 w-6 text-white" />
      default: return <CreditCard className="h-6 w-6 text-white" />
    }
  }

  const getMethodDetail = (m: UserPaymentMethod) => {
    if (m.masked_account) return m.masked_account
    if (m.account_number) return `${m.bank_name || ''} - ${m.account_number}`
    return getMethodTypeLabel(m.method_type)
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1>Payment methods</h1>
              <p className="text-muted-foreground mt-2">
                Manage your saved payment methods
              </p>
            </div>
            
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Method
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Payment Method</DialogTitle>
                  <DialogDescription>
                    Add a new payment method to your account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="methodType">Method Type</Label>
                    <Select
                      value={form.method_type}
                      onValueChange={(value) => setForm({ ...initialFormState, method_type: value as MethodType })}
                    >
                      <SelectTrigger id="methodType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vnpay">VNPay</SelectItem>
                        <SelectItem value="momo">MoMo</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Nickname (optional)</Label>
                    <Input
                      id="nickname"
                      placeholder="e.g. Personal VNPay, Company bank"
                      value={form.nickname}
                      onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                    />
                  </div>

                  {form.method_type === 'bank_transfer' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name *</Label>
                        <Input
                          id="bankName"
                          placeholder="Vietcombank"
                          value={form.bank_name}
                          onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bankBranch">Bank Branch</Label>
                        <Input
                          id="bankBranch"
                          placeholder="Ho Chi Minh City"
                          value={form.bank_branch}
                          onChange={(e) => setForm({ ...form, bank_branch: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="accountNumber">Account Number *</Label>
                          <Input
                            id="accountNumber"
                            placeholder="0123456789"
                            value={form.account_number}
                            onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accountName">Account Name *</Label>
                          <Input
                            id="accountName"
                            placeholder="NGUYEN VAN A"
                            value={form.account_name}
                            onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {(form.method_type === 'vnpay' || form.method_type === 'momo' || form.method_type === 'credit_card') && (
                    <div className="space-y-2">
                      <Label htmlFor="maskedAccount">Account / Card Info</Label>
                      <Input
                        id="maskedAccount"
                        placeholder={form.method_type === 'credit_card' ? '****6789' : '09*****23'}
                        value={form.masked_account}
                        onChange={(e) => setForm({ ...form, masked_account: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdd} disabled={isSubmitting}>
                    {isSubmitting ? 'Adding...' : 'Add Method'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="mb-4">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <Input
                className="h-9"
                placeholder="Search methods"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="h-9 rounded-md border px-3 text-sm"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as "all" | MethodType)}
              >
                <option value="all">All methods</option>
                <option value="vnpay">VNPay</option>
                <option value="momo">MoMo</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit_card">Credit Card</option>
              </select>
              <select
                className="h-9 rounded-md border px-3 text-sm"
                value={defaultFilter}
                onChange={(e) => setDefaultFilter(e.target.value as "all" | "default" | "non_default")}
              >
                <option value="all">All status</option>
                <option value="default">Default only</option>
                <option value="non_default">Non-default</option>
              </select>
              <select
                className="h-9 rounded-md border px-3 text-sm"
                value={String(pageSize)}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value="5">5 / page</option>
                <option value="10">10 / page</option>
                <option value="20">20 / page</option>
              </select>
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm("")
                  setMethodFilter("all")
                  setDefaultFilter("all")
                }}
              >
                Clear filters
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">Loading payment methods...</p>
                </CardContent>
              </Card>
            ) : methods.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No payment methods match your filters</p>
                  <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Method
                  </Button>
                </CardContent>
              </Card>
            ) : (
              methods.map((method) => (
                <Card key={method.id} className="relative">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-16 h-10 rounded ${getMethodColor(method.method_type)} flex items-center justify-center`}>
                          {getMethodIcon(method.method_type)}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3>{getMethodTypeLabel(method.method_type)}</h3>
                            {method.is_default && (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground">
                            {getMethodDetail(method)}
                          </p>
                          {method.nickname && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {method.nickname}
                            </p>
                          )}
                          {method.account_name && (
                            <p className="text-sm text-muted-foreground">
                              {method.account_name}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {!method.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(method.id)}
                          >
                            Set as Default
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(method.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {methods.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage}/{totalPages} - Total {totalCount} methods
              </p>
              <UserPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}

          {/* Security Notice */}
          <Card className="mt-8 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Secure Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your payment information is encrypted and securely stored. We use industry-standard security measures to protect your data.
              </p>
            </CardContent>
          </Card>
    </div>
  )
}
