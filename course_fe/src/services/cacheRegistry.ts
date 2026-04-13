type CacheClearer = () => void

const cacheClearers = new Set<CacheClearer>()

export function registerCacheClearer(clearer: CacheClearer): () => void {
  cacheClearers.add(clearer)
  return () => {
    cacheClearers.delete(clearer)
  }
}

export function clearRegisteredCaches(): void {
  for (const clear of cacheClearers) {
    try {
      clear()
    } catch {

    }
  }
}
