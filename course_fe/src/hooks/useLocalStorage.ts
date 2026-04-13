import { useState, useEffect, type Dispatch, type SetStateAction } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)

      if (!item || item === 'undefined' || item === 'null') {
        return initialValue
      }
      return JSON.parse(item)
    } catch (error) {
      console.warn(`Error loading localStorage key "${key}":`, error)
      return initialValue
    }
  })


  const setValue: Dispatch<SetStateAction<T>> = (value) => {
    try {
      setStoredValue((previousValue) => {
        const valueToStore = value instanceof Function ? value(previousValue) : value
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
        return valueToStore
      })
    } catch (error) {
      console.warn(`Error saving localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}