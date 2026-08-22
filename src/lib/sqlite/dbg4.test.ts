// @vitest-environment node
import { expect, it } from 'vitest'
import { SqlJsDatabaseService } from './sqlJsRuntime'
import { MemoryDatabaseByteStorage } from './dbStorage'

it('introspect after create', async () => {
  const service = new SqlJsDatabaseService(new MemoryDatabaseByteStorage())
  await service.create('p1', 'CREATE TABLE table_1 (id INTEGER PRIMARY KEY);')
  console.log('introspect:', JSON.stringify(service.introspect().map((t) => t.name)))
  const pragma = await service.execute(`SELECT name FROM sqlite_master WHERE type='table';`)
  console.log('sqlite_master:', JSON.stringify(pragma))
  const again = await service.execute('SELECT COUNT(*) FROM table_1;')
  console.log('count:', JSON.stringify(again))
  expect(true).toBe(true)
})
