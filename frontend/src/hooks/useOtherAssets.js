import { useState, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../utils/storage'
import { logAudit } from '../utils/auditTrail'
import { notifyDataChanged, PT_DATA_CHANGED } from './useNotifications'

export function useOtherAssets() {
  const [assets, setAssets] = useState(() => storage.getOtherAssets())

  useEffect(() => {
    const sync = () => setAssets(storage.getOtherAssets())
    window.addEventListener(PT_DATA_CHANGED, sync)
    return () => window.removeEventListener(PT_DATA_CHANGED, sync)
  }, [])

  const addAsset = useCallback((data) => {
    const entry = {
      ...data,
      id: uuidv4(),
      investedAmount: parseFloat(data.investedAmount),
      currentValue: data.currentValue ? parseFloat(data.currentValue) : null,
      notes: data.notes || '',
      addedDate: data.addedDate || new Date().toISOString().split('T')[0],
    }
    setAssets((prev) => {
      const updated = [...prev, entry]
      storage.setOtherAssets(updated)
      logAudit('create', 'otherAsset', entry.id, null, entry)
      return updated
    })
    notifyDataChanged()
  }, [])

  const removeAsset = useCallback((id) => {
    setAssets((prev) => {
      const before = prev.find((a) => a.id === id)
      const updated = prev.filter((a) => a.id !== id)
      storage.setOtherAssets(updated)
      logAudit('delete', 'otherAsset', id, before, null)
      return updated
    })
    notifyDataChanged()
  }, [])

  const updateAsset = useCallback((id, data) => {
    setAssets((prev) => {
      const before = prev.find((a) => a.id === id)
      const updated = prev.map((a) =>
        a.id === id
          ? {
              ...a,
              ...data,
              investedAmount: parseFloat(data.investedAmount),
              currentValue: data.currentValue ? parseFloat(data.currentValue) : null,
              notes: data.notes || '',
              addedDate: data.addedDate || a.addedDate,
            }
          : a
      )
      storage.setOtherAssets(updated)
      logAudit('update', 'otherAsset', id, before, updated.find((a) => a.id === id))
      return updated
    })
    notifyDataChanged()
  }, [])

  return { assets, addAsset, removeAsset, updateAsset }
}
