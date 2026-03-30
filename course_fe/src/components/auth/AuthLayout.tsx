import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'

import { useSiteBranding } from '../../hooks/useSiteBranding'
import { ImageWithFallback } from '../figma/ImageWithFallback'
import { useRouter } from '../Router'

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  image?: string
  quote?: string
  author?: string
}

export function AuthLayout({
  children,
  title,
  subtitle,
  image = "https://images.unsplash.com/photo-1762278805303-69a5fe7b6a82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRpZ2l0YWwlMjB0ZWNobm9sb2d5JTIwZGFyayUyMGJhY2tncm91bmQlMjBtb2Rlcm58ZW58MXx8fHwxNzY4MDQ4Mjk5fDA&ixlib=rb-4.1.0&q=80&w=1080",
  quote,
  author,
}: AuthLayoutProps) {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { siteLogo, siteName } = useSiteBranding()
  const displayQuote = quote ?? t('auth_layout.default_quote')
  const displayAuthor = author ?? t('auth_layout.default_author')

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-black">
      <div className="flex flex-col justify-center items-center p-4 sm:p-8 md:p-12 lg:p-16 relative">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => navigate('/')}
          className="absolute top-8 left-8 flex items-center gap-2 group z-50"
        >
          {siteLogo ? (
            <img
              src={siteLogo}
              alt={siteName}
              className="h-10 w-auto max-w-[180px] object-contain shrink-0"
            />
          ) : (
            <>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-indigo-500/30 transition-all duration-300 group-hover:scale-105">
                <span className="text-white font-bold text-xl">U</span>
              </div>
              <span className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">{siteName}</span>
            </>
          )}
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-[420px] space-y-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-xl dark:shadow-2xl dark:shadow-black/50"
        >
          <div className="text-center sm:text-left space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h1>
            {subtitle && <p className="text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>

          {children}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex relative bg-zinc-900 text-white overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-pink-600/20 mix-blend-overlay z-10" />
        <div className="absolute inset-0 bg-black/30 z-10" />

        <ImageWithFallback
          src={image}
          alt={t('auth_layout.background_alt')}
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="relative z-20 flex flex-col justify-end p-16 h-full w-full">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl max-w-lg"
          >
            <blockquote className="space-y-4">
              <p className="text-xl font-medium leading-relaxed font-serif italic text-white/90">
                "{displayQuote}"
              </p>
              <div className="h-0.5 w-12 bg-white/50 rounded-full" />
              <footer className="text-sm font-semibold tracking-wide uppercase text-white/80">- {displayAuthor}</footer>
            </blockquote>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
