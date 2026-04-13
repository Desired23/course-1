import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle2, Loader2, XCircle } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { useRouter } from "../../components/Router"
import { formatCurrency, getPaymentStatus, Payment } from "../../services/payment.api"
import { motion } from "motion/react"

type PaymentPageStatus = "success" | "failed" | "error" | "loading"

const vnpayErrorKeyMap: Record<string, string> = {
  "07": "payment_result_page.failure_codes.07",
  "09": "payment_result_page.failure_codes.09",
  "10": "payment_result_page.failure_codes.10",
  "11": "payment_result_page.failure_codes.11",
  "12": "payment_result_page.failure_codes.12",
  "13": "payment_result_page.failure_codes.13",
  "24": "payment_result_page.failure_codes.24",
  "51": "payment_result_page.failure_codes.51",
  "65": "payment_result_page.failure_codes.65",
  "75": "payment_result_page.failure_codes.75",
  "79": "payment_result_page.failure_codes.79",
  "99": "payment_result_page.failure_codes.99",
}

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

export function PaymentResultPage() {
  const { navigate } = useRouter()
  const { t } = useTranslation()
  const [status, setStatus] = useState<PaymentPageStatus>("loading")
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [responseCode, setResponseCode] = useState<string | null>(null)
  const [paymentData, setPaymentData] = useState<Payment | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const statusParam = params.get("status")
    const pid = params.get("payment_id")
    const txn = params.get("transaction")
    const msg = params.get("message")
    const code = params.get("code")

    setPaymentId(pid)
    setTransactionId(txn)
    setErrorMessage(msg)
    setResponseCode(code)

    if (statusParam === "success") {
      setStatus("success")
    } else if (statusParam === "failed") {
      setStatus("failed")
    } else if (statusParam === "error") {
      setStatus("error")
    } else {
      setStatus("error")
      setErrorMessage(t("payment_result_page.invalid_status"))
    }

    if (statusParam === "success" && pid) {
      getPaymentStatus(Number(pid))
        .then((data) => setPaymentData(data))
        .catch((err: any) => {
          setErrorMessage(err?.message || t("payment_result_page.load_failed"))
          setStatus("error")
        })
    }
  }, [t])

  const failureDescription = useMemo(() => {
    if (errorMessage?.trim()) return errorMessage
    if (responseCode && vnpayErrorKeyMap[responseCode]) {
      return t(vnpayErrorKeyMap[responseCode])
    }
    if (responseCode) {
      return t("payment_result_page.failure_with_code", { code: responseCode })
    }
    return t("payment_result_page.failure_default")
  }, [errorMessage, responseCode, t])

  const config = {
    success: {
      icon: <CheckCircle2 className="w-20 h-20 text-green-500" />,
      title: t("payment_result_page.success_title"),
      description: t("payment_result_page.success_description"),
      bgColor: "bg-green-50 dark:bg-green-950/20",
      borderColor: "border-green-200 dark:border-green-800",
    },
    failed: {
      icon: <XCircle className="w-20 h-20 text-red-500" />,
      title: t("payment_result_page.failed_title"),
      description: failureDescription,
      bgColor: "bg-red-50 dark:bg-red-950/20",
      borderColor: "border-red-200 dark:border-red-800",
    },
    error: {
      icon: <AlertCircle className="w-20 h-20 text-yellow-500" />,
      title: t("payment_result_page.error_title"),
      description: errorMessage || t("payment_result_page.error_description"),
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      borderColor: "border-yellow-200 dark:border-yellow-800",
    },
    loading: {
      icon: <Loader2 className="w-20 h-20 text-muted-foreground animate-spin" />,
      title: t("payment_result_page.loading_title"),
      description: t("payment_result_page.loading_description"),
      bgColor: "bg-muted/30",
      borderColor: "border-muted",
    },
  }[status]

  return (
    <motion.div
      className="min-h-screen bg-background flex items-center justify-center py-12 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div variants={sectionStagger} initial="hidden" animate="show" className="w-full max-w-lg">
      <Card className={`max-w-lg w-full border-2 ${config.borderColor}`}>
        <CardContent className={`rounded-lg px-4 pb-8 pt-8 sm:px-8 sm:pt-10 ${config.bgColor}`}>
          <div className="flex flex-col items-center text-center space-y-6">
            <motion.div
              key={`icon-${status}`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {config.icon}
            </motion.div>

            <motion.div className="space-y-2" variants={fadeInUp} initial="hidden" animate="show">
              <h1 className="text-2xl font-bold">{config.title}</h1>
              <p className="text-muted-foreground">{config.description}</p>
            </motion.div>

            {status === "success" && (
              <motion.div
                className="w-full space-y-3 bg-background/80 rounded-lg p-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                {paymentId && (
                  <div className="flex items-start justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{t("payment_result_page.order_id_label")}</span>
                    <span className="font-medium break-all text-right">#{paymentId}</span>
                  </div>
                )}
                {paymentData && (
                  <>
                    <div className="flex items-start justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">{t("payment_result_page.total_paid_label")}</span>
                      <span className="font-medium text-green-600 text-right">
                        {formatCurrency(parseFloat(paymentData.total_amount))}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">{t("payment_result_page.method_label")}</span>
                      <span className="font-medium uppercase text-right break-words">{paymentData.payment_method}</span>
                    </div>
                  </>
                )}
                {transactionId && (
                  <div className="flex items-start justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">{t("payment_result_page.transaction_id_label")}</span>
                    <span className="font-mono text-xs break-all text-right">{transactionId}</span>
                  </div>
                )}
              </motion.div>
            )}

            {status === "success" && !paymentData && (
              <div className="py-4 text-center">
                <Loader2 className="inline w-6 h-6 animate-spin mr-2" />
                <span>{t("payment_result_page.loading_invoice")}</span>
              </div>
            )}

            {paymentData && paymentData.courses.length > 0 && (
              <motion.div className="w-full mt-4 space-y-4" variants={fadeInUp} initial="hidden" animate="show">
                {paymentData.courses.map((course, index) => (
                  <motion.div
                    key={course.course_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03, ease: "easeOut" }}
                  >
                  <Card className="border">
                    <CardContent className="flex items-start gap-3 sm:gap-4">
                      {course.course_thumbnail && (
                        <img
                          src={course.course_thumbnail}
                          alt={course.course_title}
                          className="h-14 w-14 shrink-0 object-cover sm:h-16 sm:w-16"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold break-words">{course.course_title}</div>
                        {course.instructor_name && (
                          <div className="text-sm text-muted-foreground break-words">{course.instructor_name}</div>
                        )}
                        <div className="text-sm">
                          {formatCurrency(parseFloat(course.price))} {"->"}{" "}
                          <span className="font-medium">{formatCurrency(parseFloat(course.final_price))}</span>
                        </div>
                        {course.discount !== "0.00" && (
                          <div className="text-xs text-red-500">
                            {t("payment_result_page.discount_label", {
                              amount: formatCurrency(parseFloat(course.discount)),
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {status === "failed" && paymentId && (
              <div className="w-full bg-background/80 rounded-lg p-4">
                <div className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{t("payment_result_page.order_id_label")}</span>
                  <span className="font-medium break-all text-right">#{paymentId}</span>
                </div>
              </div>
            )}

            <motion.div className="flex flex-col sm:flex-row gap-3 w-full pt-2" variants={fadeInUp} initial="hidden" animate="show">
              {status === "success" ? (
                <>
                  <Button className="flex-1" onClick={() => navigate("/my-learning")}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t("payment_result_page.go_to_learning")}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>
                    {t("payment_result_page.back_to_home")}
                  </Button>
                </>
              ) : (
                <>
                  <Button className="flex-1" onClick={() => navigate("/cart")}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t("payment_result_page.back_to_cart")}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>
                    {t("payment_result_page.back_to_home")}
                  </Button>
                </>
              )}
            </motion.div>
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  )
}
