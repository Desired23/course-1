/**
 * 🎉 ZUSTAND SUCCESS BANNER
 * Show on homepage to access test page
 */

import React from 'react'
import { Link } from '../components/Router'

export function ZustandSuccessBanner() {
  const [visible, setVisible] = React.useState(true)

  if (!visible) return null

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <h3 className="font-semibold">Zustand is Live!</h3>
              <p className="text-sm text-white/90">
                Test all stores: Theme, Modals, Player, Filters & more
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/zustand-test"
              className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition"
            >
              🏪 Test Zustand Stores
            </Link>
            
            <button
              onClick={() => setVisible(false)}
              className="px-3 py-2 text-white/80 hover:text-white transition"
              aria-label="Close banner"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
