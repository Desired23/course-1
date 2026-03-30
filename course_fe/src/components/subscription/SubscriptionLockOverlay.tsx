import React from "react"
import { Lock, Zap } from "lucide-react"
import { Button } from "../ui/button"
import { useRouter } from "../Router"
import { useTranslation } from "react-i18next"

interface SubscriptionLockOverlayProps {
  title?: string
  description?: string
  backgroundImage?: string
}

export function SubscriptionLockOverlay({
  title,
  description,
  backgroundImage,
}: SubscriptionLockOverlayProps) {
  const { navigate } = useRouter()
  const { t } = useTranslation()

  const resolvedTitle = title || t("subscription_lock_overlay.title")
  const resolvedDescription = description || t("subscription_lock_overlay.description")

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-6 overflow-hidden rounded-lg">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-0"
        style={
          backgroundImage
            ? {
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 max-w-md animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 ring-4 ring-blue-600/20">
          <Lock className="w-8 h-8 text-white" />
        </div>

        <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{resolvedTitle}</h3>

        <p className="text-slate-200 mb-8 leading-relaxed">{resolvedDescription}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
          <Button
            size="lg"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 px-8 shadow-xl shadow-blue-900/20"
            onClick={() => navigate("/pricing")}
          >
            <Zap className="w-4 h-4 mr-2 fill-current" />
            {t("subscription_lock_overlay.subscribe")}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto bg-transparent border-slate-600 text-slate-200 hover:bg-white/10 hover:text-white h-12"
            onClick={() => navigate("/pricing")}
          >
            {t("subscription_lock_overlay.learn_more")}
          </Button>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          {t("subscription_lock_overlay.already_member")}{" "}
          <span className="text-blue-400 hover:underline cursor-pointer" onClick={() => navigate("/login")}>
            {t("subscription_lock_overlay.log_in_now")}
          </span>
        </p>
      </div>
    </div>
  )
}
