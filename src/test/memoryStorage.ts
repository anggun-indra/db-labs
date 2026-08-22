/**
 * In-memory Storage implementation for tests.
 *
 * Node >= 22 ships an experimental global localStorage that is inert without
 * `--localstorage-file`; on Node 25 it shadows jsdom's window.localStorage
 * and breaks tests (e.g. `clear is not a function`). Installing our own
 * Storage object keeps the test environment deterministic.
 */
export class MemoryStorage implements Storage {
  private map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }

  setItem(key: string, value: string): void {
    this.map.set(String(key), String(value))
  }
}

export function installMemoryLocalStorage(): MemoryStorage {
  const storage = new MemoryStorage()
  Object.defineProperty(window, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true
  })
  return storage
}
