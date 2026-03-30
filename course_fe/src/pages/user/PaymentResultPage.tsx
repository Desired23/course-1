import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle2, Loader2, XCircle } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { useRouter } from "../../components/Router"
import { formatCurrency, getPaymentStatus, Payment } from "../../services/payment.api"

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
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <Card className={`max-w-lg w-full border-2 ${config.borderColor}`}>
        <CardContent className={`pt-10 pb-8 px-8 ${config.bgColor} rounded-lg`}>
          <div className="flex flex-col items-center text-center space-y-6">
            {config.icon}

            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{config.title}</h1>
              <p className="text-muted-foreground">{config.description}</p>
            </div>

            {status === "success" && (
              <div className="w-full space-y-3 bg-background/80 rounded-lg p-4">
                {paymentId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("payment_result_page.order_id_label")}</span>
                    <span className="font-medium">#{paymentId}</span>
                  </div>
                )}
                {paymentData && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("payment_result_page.total_paid_label")}</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(parseFloat(paymentData.total_amount))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("payment_result_page.method_label")}</span>
                      <span className="font-medium uppercase">{paymentData.payment_method}</span>
                    </div>
                  </>
                )}
                {transactionId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("payment_result_page.transaction_id_label")}</span>
                    <span className="font-mono text-xs">{transactionId}</span>
                  </div>
                )}
              </div>
            )}

            {status === "success" && !paymentData && (
              <div className="py-4 text-center">
                <Loader2 className="inline w-6 h-6 animate-spin mr-2" />
                <span>{t("payment_result_page.loading_invoice")}</span>
              </div>
            )}

            {paymentData && paymentData.courses.length > 0 && (
              <div className="w-full mt-4 space-y-4">
                {paymentData.courses.map((course) => (
                  <Card key={course.course_id} className="border">
                    <CardContent className="flex items-center space-x-4">
                      {course.course_thumbnail && (
                        <img
                          src={course.course_thumbnail}
                          alt={course.course_title}
                          className="w-16 h-16 object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-semibold">{course.course_title}</div>
                        {course.instructor_name && (
                          <div className="text-sm text-muted-foreground">{course.instructor_name}</div>
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
                ))}
              </div>
            )}

            {status === "failed" && paymentId && (
              <div className="w-full bg-background/80 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("payment_result_page.order_id_label")}</span>
                  <span className="font-medium">#{paymentId}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
