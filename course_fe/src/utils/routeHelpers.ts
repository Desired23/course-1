/**
 * Helper functions for working with dynamic routes
 */

/**
 * Extract route parameters from a dynamic route pattern
 * @param pattern - Route pattern like "/course/:id"
 * @param path - Actual path like "/course/123"
 * @returns Object with parameter values like { id: "123" }
 */
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

/**
 * Check if a path matches a route pattern
 * @param pattern - Route pattern like "/course/:id"
 * @param path - Actual path like "/course/123"
 * @returns true if path matches pattern
 */
export function matchRoute(pattern: string, path: string): boolean {
  const patternParts = pattern.split('/')
  const pathParts = path.split('/')
  
  if (patternParts.length !== pathParts.length) {
    return false
  }
  
  return patternParts.every((part, index) => {
    if (part.startsWith(':')) {
      return true // Dynamic segment always matches
    }
    return part === pathParts[index]
  })
}
