import { afterEach } from 'vitest'

// Mock localStorage for tests
const store = {}
const mockLocalStorage = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, value) => { store[key] = String(value) },
  removeItem: (key) => { delete store[key] },
  clear: () => { Object.keys(store).forEach((k) => { delete store[k] }) },
  get length() { return Object.keys(store).length },
  key: (i) => Object.keys(store)[i] ?? null,
}
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

afterEach(() => { mockLocalStorage.clear() })
