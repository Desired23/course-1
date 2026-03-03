/**
 * 🧪 ZUSTAND TEST PAGE
 * Demo all Zustand stores working together
 */

import React, { useState } from 'react'
import { 
  useUIStore, 
  useModal, 
  useConfirm,
  usePlayerStore,
  useToast,
  useCartUIStore,
  useFilterStore 
} from '../../stores'

export function ZustandTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold mb-2 dark:text-white">
            🏪 Zustand Test Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Test all Zustand stores. Open Redux DevTools to see state changes!
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              💡 <strong>Tip:</strong> Open Redux DevTools (F12 → Redux tab) to see all store state and actions in real-time!
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">6</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Stores</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">~1KB</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Bundle Size</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">100x</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Faster</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">0</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Providers</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* UI Store */}
          <UIStoreTest />
          
          {/* Modal Store */}
          <ModalStoreTest />
          
          {/* Player Store */}
          <PlayerStoreTest />
          
          {/* Toast Store */}
          <ToastStoreTest />
          
          {/* Cart UI Store */}
          <CartUIStoreTest />
          
          {/* Filter Store */}
          <FilterStoreTest />
        </div>
      </div>
    </div>
  )
}

// ============================================
// UI STORE TEST
// ============================================
function UIStoreTest() {
  const {
    darkMode,
    toggleTheme,
    sidebarOpen,
    toggleSidebar,
    mobileMenuOpen,
    toggleMobileMenu,
    layoutMode,
    setLayoutMode
  } = useUIStore()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">
        🎨 UI Store
      </h2>
      
      <div className="space-y-4">
        {/* Theme */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-300">
            Theme
          </label>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Current: {darkMode ? 'Dark' : 'Light'}
          </p>
        </div>

        {/* Sidebar */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-300">
            Sidebar
          </label>
          <button
            onClick={toggleSidebar}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
          >
            {sidebarOpen ? '← Close' : '→ Open'} Sidebar
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Status: {sidebarOpen ? 'Open' : 'Closed'}
          </p>
        </div>

        {/* Mobile Menu */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-300">
            Mobile Menu
          </label>
          <button
            onClick={toggleMobileMenu}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          >
            {mobileMenuOpen ? '✕' : '☰'} Menu
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Status: {mobileMenuOpen ? 'Open' : 'Closed'}
          </p>
        </div>

        {/* Layout Mode */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-300">
            Layout Mode
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`px-4 py-2 rounded transition ${
                layoutMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setLayoutMode('list')}
              className={`px-4 py-2 rounded transition ${
                layoutMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              ☰ List
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MODAL STORE TEST
// ============================================
function ModalStoreTest() {
  const loginModal = useModal('login')
  const signupModal = useModal('signup')
  const { confirm } = useConfirm()

  const handleConfirmTest = async () => {
    const confirmed = await confirm({
      title: 'Delete Course',
      message: 'Are you sure you want to delete this course? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    alert(confirmed ? 'Confirmed!' : 'Cancelled')
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">
        🪟 Modal Store
      </h2>
      
      <div className="space-y-4">
        {/* Login Modal */}
        <div>
          <button
            onClick={() => loginModal.open({ from: 'test-page' })}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Open Login Modal
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Status: {loginModal.isOpen ? 'Open' : 'Closed'}
          </p>
        </div>

        {/* Signup Modal */}
        <div>
          <button
            onClick={() => signupModal.open()}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          >
            Open Signup Modal
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Status: {signupModal.isOpen ? 'Open' : 'Closed'}
          </p>
        </div>

        {/* Confirm Dialog */}
        <div>
          <button
            onClick={handleConfirmTest}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Test Confirm Dialog
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Click to test promise-based confirm
          </p>
        </div>
      </div>

      {/* Simple Modal Display */}
      {loginModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Login Modal</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This is a test modal. Data: {JSON.stringify(loginModal.data)}
            </p>
            <button
              onClick={() => loginModal.close()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {signupModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Signup Modal</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This is a test signup modal.
            </p>
            <button
              onClick={() => signupModal.close()}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// PLAYER STORE TEST
// ============================================
function PlayerStoreTest() {
  const {
    playbackRate,
    setPlaybackRate,
    volume,
    setVolume,
    muted,
    toggleMute,
    quality,
    setQuality,
    subtitlesEnabled,
    toggleSubtitles
  } = usePlayerStore()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">
        🎥 Player Store
      </h2>
      
      <div className="space-y-4">
        {/* Playback Speed */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-300">
            Playback Speed: {playbackRate}x
          </label>
          <select
            value={playbackRate}
            onChange={(e) => setPlaybackRate(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>Normal (1x)</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>

        {/* Volume */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-300">
            Volume: {Math.round(volume * 100)}%
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded"
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1"
            />
          </div>
        </div>

        {/* Quality */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-300">
            Quality: {quality}
          </label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="auto">Auto</option>
            <option value="360p">360p</option>
            <option value="480p">480p</option>
            <option value="720p">720p HD</option>
            <option value="1080p">1080p Full HD</option>
          </select>
        </div>

        {/* Subtitles */}
        <div>
          <button
            onClick={toggleSubtitles}
            className={`px-4 py-2 rounded transition ${
              subtitlesEnabled
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            CC {subtitlesEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// TOAST STORE TEST
// ============================================
function ToastStoreTest() {
  const toast = useToast()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">
        🔔 Toast Store
      </h2>
      
      <div className="space-y-2">
        <button
          onClick={() => toast.success('Success!', 'Operation completed successfully')}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
        >
          ✓ Success Toast
        </button>
        
        <button
          onClick={() => toast.error('Error!', 'Something went wrong')}
          className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          ✕ Error Toast
        </button>
        
        <button
          onClick={() => toast.warning('Warning!', 'Please be careful')}
          className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
        >
          ⚠ Warning Toast
        </button>
        
        <button
          onClick={() => toast.info('Info', 'Here is some information')}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          ℹ Info Toast
        </button>
      </div>
    </div>
  )
}

// ============================================
// CART UI STORE TEST
// ============================================
function CartUIStoreTest() {
  const {
    dropdownOpen,
    toggleDropdown,
    recentlyAddedCourseId,
    setRecentlyAdded
  } = useCartUIStore()

  const testCourseId = 'test-course-123'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">
        🛒 Cart UI Store
      </h2>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={toggleDropdown}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
          >
            {dropdownOpen ? 'Close' : 'Open'} Cart Dropdown
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Status: {dropdownOpen ? 'Open' : 'Closed'}
          </p>
        </div>

        <div>
          <button
            onClick={() => setRecentlyAdded(testCourseId)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          >
            Test Recently Added Animation
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Recently added: {recentlyAddedCourseId || 'None'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// FILTER STORE TEST
// ============================================
function FilterStoreTest() {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategories,
    toggleCategory,
    sortBy,
    setSortBy,
    minRating,
    setMinRating,
    clearAllFilters,
    hasActiveFilters
  } = useFilterStore()

  const categories = ['Development', 'Business', 'Design', 'Marketing']

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">
        🔍 Filter Store
      </h2>
      
      <div className="space-y-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-300">
            Search
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses..."
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-300">
            Categories ({selectedCategories.length})
          </label>
          <div className="space-y-1">
            {categories.map(cat => (
              <label key={cat} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                />
                <span className="text-sm dark:text-gray-300">{cat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-300">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-300">
            Min Rating: {minRating}⭐
          </label>
          <input
            type="range"
            min={0}
            max={5}
            step={0.5}
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Clear */}
        {hasActiveFilters() && (
          <button
            onClick={clearAllFilters}
            className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  )
}