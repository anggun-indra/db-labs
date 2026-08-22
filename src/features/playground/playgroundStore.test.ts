// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryStorage } from '@/test/memoryStorage'
import { sqliteService } from '@/lib/sqlite/sqlJsRuntime'
import { usePlaygroundStore } from './playgroundStore'

// Node has no window; give the draft/history modules a localStorage.
Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true
})

const DDL = `CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    balance REAL
);`

beforeEach(async () => {
  localStorage.clear()
  await sqliteService.create('p1', DDL)
  usePlaygroundStore.getState().loadFor('p1')
})

describe('playgroundStore', () => {
  it('runs a SELECT and records history', async () => {
    await usePlaygroundStore.getState().run("INSERT INTO customers (id, name) VALUES (1, 'Andi');")
    await usePlaygroundStore.getState().run('SELECT id, name FROM customers;')

    const { result, history } = usePlaygroundStore.getState()
    expect(result?.kind).toBe('rows')
    expect(result?.rows).toEqual([[1, 'Andi']])
    expect(result?.executionTimeMs).toBeGreaterThanOrEqual(0)
    expect(history).toHaveLength(2)
    expect(history[0].ok).toBe(true)
    expect(history[0].sql).toBe('SELECT id, name FROM customers;')
  })

  it('reports affected rows for mutations', async () => {
    await usePlaygroundStore.getState().run(
      "INSERT INTO customers (id, name) VALUES (1, 'Andi'), (2, 'Budi');"
    )
    const { result } = usePlaygroundStore.getState()
    expect(result?.kind).toBe('mutation')
    expect(result?.affectedRows).toBe(2)
  })

  it('records failures with educational errors', async () => {
    await usePlaygroundStore.getState().run('SELECT * FROM ghosts;')
    const { result, history } = usePlaygroundStore.getState()
    expect(result?.kind).toBe('error')
    expect(result?.error?.code).toBe('NO_SUCH_TABLE')
    expect(result?.error?.hint).toBeTruthy()
    expect(history[0].ok).toBe(false)
  })

  it('persists the draft per project after the debounce', async () => {
    const store = usePlaygroundStore.getState()
    store.setSql('SELECT 1;')
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(localStorage.getItem('dblab:sql-draft:p1')).toBe('SELECT 1;')

    // Another project gets its own draft.
    store.loadFor('p2')
    expect(usePlaygroundStore.getState().sql).toBe('')
  })

  it('reload restores draft and history', async () => {
    const store = usePlaygroundStore.getState()
    store.setSql('SELECT 42;')
    await new Promise((resolve) => setTimeout(resolve, 600))
    await store.run('SELECT 42;')

    usePlaygroundStore.getState().loadFor('p1')
    const state = usePlaygroundStore.getState()
    expect(state.sql).toBe('SELECT 42;')
    expect(state.history).toHaveLength(1)
  })

  it('clearHistoryEntries empties stored history', async () => {
    await usePlaygroundStore.getState().run('SELECT 1;')
    usePlaygroundStore.getState().clearHistoryEntries()
    expect(usePlaygroundStore.getState().history).toEqual([])
    expect(localStorage.getItem('dblab:sql-history:p1')).toBeNull()
  })
})
