import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../utils/storage'

export function useOtherAssets() {
  const [assets, setAssets] = useState(() => storage.getOtherAssets())

  const addAsset = useCallback((data) => {
    const entry = {
      id: uuidv4(),
      name: data.name,
      type: data.type,
      investedAmount: parseFloat(data.investedAmount),
      currentValue: data.currentValue ? parseFloat(data.currentValue) : null,
      notes: data.notes || '',
      addedDate: data.addedDate || new Date().toISOString().split('T')[0],
    }
    setAssets((prev) => {
      const updated = [...prev, entry]
      storage.setOtherAssets(updated)
      return updated
    })
  }, [])

  const removeAsset = useCallback((id) => {
    setAssets((prev) => {
      const updated = prev.filter((a) => a.id !== id)
      storage.setOtherAssets(updated)
      return updated
    })
  }, [])

  const updateAsset = useCallback((id, data) => {
    setAssets((prev) => {
      const updated = prev.map((a) =>
        a.id === id
          ? {
              ...a,
              name: data.name,
              type: data.type,
              investedAmount: parseFloat(data.investedAmount),
              currentValue: data.currentValue ? parseFloat(data.currentValue) : null,
              notes: data.notes || '',
              addedDate: data.addedDate,
            }
          : a
      )
      storage.setOtherAssets(updated)
      return updated
    })
  }, [])

  return { assets, addAsset, removeAsset, updateAsset }
}
