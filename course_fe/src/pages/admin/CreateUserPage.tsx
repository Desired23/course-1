import { useState, type FormEvent } from "react"
import { motion } from "motion/react"

import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Card } from "../../components/ui/card"
import { Checkbox } from "../../components/ui/checkbox"
import { useRouter } from "../../components/Router"
import { ArrowLeft, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { createUser } from "../../services/admin.api"
import { useTranslation } from "react-i18next"

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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

export function CreateUserPage() {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    roles: [] as string[],
  })

  const availableRoles = [
    {
      id: "user",
      label: t("admin_users.role_student"),
      description: t("admin_user_form.roles.student_description"),
    },
    {
      id: "instructor",
      label: t("admin_users.role_instructor"),
      description: t("admin_user_form.roles.instructor_description"),
    },
    {
      id: "admin",
      label: t("admin_users.role_admin"),
      description: t("admin_user_form.roles.admin_description"),
    },
  ]

  const handleRoleCheckedChange = (roleId: string, checked: boolean) => {
    setFormData((prev) => {
      const hasRole = prev.roles.includes(roleId)
      if (checked && !hasRole) {
        return { ...prev, roles: [...prev.roles, roleId] }
      }
      if (!checked && hasRole) {
        return { ...prev, roles: prev.roles.filter((role) => role !== roleId) }
      }
      return prev
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.password) {
      toast.error(t("admin_user_form.toasts.required_fields"))
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t("admin_user_form.toasts.password_mismatch"))
      return
    }

    if (formData.roles.length === 0) {
      toast.error(t("admin_user_form.toasts.select_role"))
      return
    }

    try {
      await createUser({
        full_name: formData.name,
        email: formData.email,
        password: formData.password,
        user_type: formData.roles.includes("admin")
          ? "admin"
          : formData.roles.includes("instructor")
            ? "instructor"
            : "student",
      })
      toast.success(t("admin_user_form.toasts.create_success"))
      navigate("/admin/users")
    } catch {
      toast.error(t("admin_user_form.toasts.create_failed"))
    }
  }

  return (
    <motion.div
      className="p-8 max-w-3xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div className="space-y-6" variants={sectionStagger} initial="hidden" animate="show">
      <motion.div className="mb-8" variants={fadeInUp}>
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/users")}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("admin_user_form.back_to_users")}
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-medium">{t("admin_user_form.create.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("admin_user_form.create.subtitle")}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h3 className="font-medium mb-4">{t("admin_user_form.user_information")}</h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{t("admin_user_form.fields.full_name")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t("admin_user_form.placeholders.full_name")}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="email">{t("admin_user_form.fields.email")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder={t("admin_user_form.placeholders.email")}
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">{t("admin_user_form.fields.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={t("admin_user_form.placeholders.password")}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">{t("admin_user_form.fields.confirm_password")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  placeholder={t("admin_user_form.placeholders.password")}
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-medium mb-4">{t("admin_user_form.roles_permissions")}</h3>

          <div className="space-y-3">
            {availableRoles.map((role) => (
              <div
                key={role.id}
                className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`role-${role.id}`}
                  checked={formData.roles.includes(role.id)}
                  onCheckedChange={(checked) => handleRoleCheckedChange(role.id, checked === true)}
                />
                <div className="flex-1">
                  <Label htmlFor={`role-${role.id}`} className="cursor-pointer">
                    {role.label}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-0.5">{role.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/users")}>
            {t("common.cancel")}
          </Button>
          <Button type="submit">{t("admin_user_form.create.submit")}</Button>
        </div>
      </form>
      </motion.div>
      </motion.div>
    </motion.div>
  )
}
