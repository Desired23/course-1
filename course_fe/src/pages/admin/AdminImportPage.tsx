import { useEffect, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import {
  downloadCourseGrantsTemplate,
  downloadSubscriptionTemplate,
  downloadUsersTemplate,
  getAdminSubscriptionPlans,
  importCourseGrants,
  importSubscriptionPlan,
  importUsersBulk,
  type ImportResult,
} from '../../services/admin.api'
import { getAllCourses, type CourseListItem } from '../../services/course.api'
import { getErrorMessage } from '../../lib/apiError'

export function AdminImportPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [planId, setPlanId] = useState('')
  const [subscriptionFile, setSubscriptionFile] = useState<File | null>(null)
  const [usersFile, setUsersFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [courseSearch, setCourseSearch] = useState('')
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([])
  const [courseGrantsFile, setCourseGrantsFile] = useState<File | null>(null)

  useEffect(() => {
    let cancelled = false
    getAdminSubscriptionPlans()
      .then((items) => { if (!cancelled) setPlans(items) })
      .catch((e) => { if (!cancelled) { setPlans([]); setError(getErrorMessage(e, 'Không thể tải danh sách gói.')) } })
    getAllCourses({ status: 'published' })
      .then((items) => { if (!cancelled) setCourses(items) })
      .catch((e) => { if (!cancelled) { setCourses([]); setError(getErrorMessage(e, 'Không thể tải danh sách khóa học.')) } })
    return () => { cancelled = true }
  }, [])

  const filteredCourses = courseSearch.trim()
    ? courses.filter((c) => c.title.toLowerCase().includes(courseSearch.toLowerCase()))
    : courses

  function toggleCourse(id: number) {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function runSubscriptionImport() {
    if (!subscriptionFile || !planId) {
      setError('Choose a plan and .xlsx file first.')
      return
    }
    await runImport(() => importSubscriptionPlan(subscriptionFile, Number(planId)))
  }

  async function runUsersImport() {
    if (!usersFile) {
      setError('Choose a .xlsx file first.')
      return
    }
    await runImport(() => importUsersBulk(usersFile))
  }

  async function runCourseGrantsImport() {
    if (!courseGrantsFile) {
      setError('Choose a .xlsx file first.')
      return
    }
    if (selectedCourseIds.length === 0) {
      setError('Select at least one course.')
      return
    }
    await runImport(() => importCourseGrants(courseGrantsFile, selectedCourseIds))
  }

  async function runImport(action: () => Promise<ImportResult>) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await action())
    } catch (err: any) {
      setError(getErrorMessage(err, 'Import thất bại.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bulk Import</h1>
        <p className="text-sm text-muted-foreground">Upload Excel files to assign plans, grant courses, or create users.</p>
      </div>

      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <Tabs defaultValue="subscriptions">
        <TabsList className="mb-6">
          <TabsTrigger value="subscriptions">Subscription Plans</TabsTrigger>
          <TabsTrigger value="course-grants">Course Grants</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader><CardTitle>Assign Subscription Plan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[260px_1fr_auto_auto]">
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger><SelectValue placeholder="Choose plan" /></SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={String(plan.id)}>{plan.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  type="file"
                  accept=".xlsx"
                  onChange={(event) => setSubscriptionFile(event.target.files?.[0] ?? null)}
                />
                <Button variant="outline" onClick={downloadSubscriptionTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Template
                </Button>
                <Button onClick={runSubscriptionImport} disabled={loading}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="course-grants">
          <Card>
            <CardHeader><CardTitle>Grant Courses to Users</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Select courses to grant</p>
                <input
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm w-full"
                  placeholder="Search courses..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                />
                <div className="border rounded-md overflow-y-auto max-h-52 divide-y">
                  {filteredCourses.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No published courses found</p>
                  ) : filteredCourses.map((course) => (
                    <label key={course.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={selectedCourseIds.includes(course.id)}
                        onChange={() => toggleCourse(course.id)}
                      />
                      <span>{course.title}</span>
                    </label>
                  ))}
                </div>
                {selectedCourseIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedCourseIds.length} course(s) selected</p>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
                <input
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  type="file"
                  accept=".xlsx"
                  onChange={(event) => setCourseGrantsFile(event.target.files?.[0] ?? null)}
                />
                <Button variant="outline" onClick={downloadCourseGrantsTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Template
                </Button>
                <Button onClick={runCourseGrantsImport} disabled={loading}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader><CardTitle>Import Users</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
                <input
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  type="file"
                  accept=".xlsx"
                  onChange={(event) => setUsersFile(event.target.files?.[0] ?? null)}
                />
                <Button variant="outline" onClick={downloadUsersTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Template
                </Button>
                <Button onClick={runUsersImport} disabled={loading}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {result && <ImportResultPanel result={result} />}
    </div>
  )
}

function ImportResultPanel({ result }: { result: ImportResult }) {
  return (
    <Card>
      <CardHeader><CardTitle>Import Result</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Summary label="Success" value={result.success ?? 0} />
          <Summary label="Created" value={result.created ?? 0} />
          <Summary label="Updated" value={result.updated ?? 0} />
          <Summary label="Skipped" value={result.skipped ?? 0} />
        </div>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Row</TableHead><TableHead>Email</TableHead><TableHead>Reason</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {result.errors.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No row errors</TableCell></TableRow>
            ) : result.errors.map((err, index) => (
              <TableRow key={`${err.row}-${err.email}-${index}`}>
                <TableCell>{err.row}</TableCell>
                <TableCell>{err.email}</TableCell>
                <TableCell>{err.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}
