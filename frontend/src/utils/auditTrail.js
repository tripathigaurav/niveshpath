import { openDB } from 'idb'
import { v4 as uuidv4 } from 'uuid'

const DB_NAME = 'niveshpath-audit'
const STORE = 'auditLog'
const DB_VERSION = 1
const MAX_ENTRIES = 5000

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp')
        store.createIndex('entityType', 'entityType')
      }
    },
  })
}

/**
 * @param {'create'|'update'|'delete'|'import'|'apply_action'} action
 * @param {string} entityType
 * @param {string|null} entityId
 * @param {*} before
 * @param {*} after
 */
export async function logAudit(action, entityType, entityId, before = null, after = null) {
  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action,
    entityType,
    entityId: entityId ?? null,
    before,
    after,
  }
  try {
    const db = await getDb()
    await db.add(STORE, entry)
    const count = await db.count(STORE)
    if (count > MAX_ENTRIES) {
      const all = await db.getAllFromIndex(STORE, 'timestamp')
      all.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      const toRemove = all.slice(0, count - MAX_ENTRIES)
      const tx = db.transaction(STORE, 'readwrite')
      for (const row of toRemove) {
        await tx.store.delete(row.id)
      }
      await tx.done
    }
  } catch (err) {
    console.warn('[auditTrail] Failed to log:', err)
  }
  return entry
}

export async function getAuditHistory(filters = {}) {
  const db = await getDb()
  let entries = await db.getAll(STORE)
  if (filters.entityType) {
    entries = entries.filter((e) => e.entityType === filters.entityType)
  }
  if (filters.entityId) {
    entries = entries.filter((e) => e.entityId === filters.entityId)
  }
  if (filters.since) {
    entries = entries.filter((e) => e.timestamp >= filters.since)
  }
  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export async function clearAuditLog() {
  const db = await getDb()
  await db.clear(STORE)
}
