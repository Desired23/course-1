









export function extractRouteParams(
  pattern: string,
  path: string
): Record<string, string> {
  const params: Record<string, string> = {}

  const patternParts = pattern.split('/')
  const pathParts = path.split('/')

  if (patternParts.length !== pathParts.length) {
    return params
  }

  patternParts.forEach((part, index) => {
    if (part.startsWith(':')) {
      const paramName = part.slice(1)
      params[paramName] = pathParts[index]
    }
  })

  return params
}







export function matchRoute(pattern: string, path: string): boolean {
  const patternParts = pattern.split('/')
  const pathParts = path.split('/')

  if (patternParts.length !== pathParts.length) {
    return false
  }

  return patternParts.every((part, index) => {
    if (part.startsWith(':')) {
      return true
    }
    return part === pathParts[index]
  })
}
