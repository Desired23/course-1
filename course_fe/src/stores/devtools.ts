




import { useUIStore } from './ui.store'
import { useModalStore } from './modal.store'
import { usePlayerStore } from './player.store'
import { useToastStore } from './toast.store'
import { useCartUIStore } from './cart-ui.store'
import { useFilterStore } from './filter.store'

export const useStoreDevTools = () => {
  const ui = useUIStore()
  const modal = useModalStore()
  const player = usePlayerStore()
  const toast = useToastStore()
  const cartUI = useCartUIStore()
  const filter = useFilterStore()

  return {
    ui,
    modal,
    player,
    toast,
    cartUI,
    filter
  }
}


try {
  if (import.meta.env.DEV) {
    console.log('🏪 Zustand Stores initialized')
    console.log('📊 Open Redux DevTools to inspect store state')
    console.log('Available stores:', {
      ui: 'UI state (theme, sidebar, etc.)',
      modal: 'Modal management',
      player: 'Video player state',
      toast: 'Toast notifications',
      cartUI: 'Cart UI state',
      filter: 'Search & filter state'
    })
  }
} catch (error) {

}