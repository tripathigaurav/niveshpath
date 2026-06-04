import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../utils/storage'
import { logAudit } from '../utils/auditTrail'

export function useInsurance() {
  const [policies, setPolicies] = useState(() => storage.getInsurance())

  const addPolicy = useCallback((data) => {
    const entry = {
      id: uuidv4(),
      name: data.name,
      type: data.type,
      premium: parseFloat(data.premium),
      coverAmount: data.coverAmount ? parseFloat(data.coverAmount) : null,
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      renewalDate: data.renewalDate || null,
      notes: data.notes || '',
    }
    setPolicies((prev) => {
      const updated = [...prev, entry]
      storage.setInsurance(updated)
      logAudit('create', 'insurance', entry.id, null, entry)
      return updated
    })
  }, [])

  const removePolicy = useCallback((id) => {
    setPolicies((prev) => {
      const before = prev.find((p) => p.id === id)
      const updated = prev.filter((p) => p.id !== id)
      storage.setInsurance(updated)
      logAudit('delete', 'insurance', id, before, null)
      return updated
    })
  }, [])

  const updatePolicy = useCallback((id, data) => {
    setPolicies((prev) => {
      const before = prev.find((p) => p.id === id)
      const updated = prev.map((p) =>
        p.id === id
          ? {
              ...p,
              name: data.name,
              type: data.type,
              premium: parseFloat(data.premium),
              coverAmount: data.coverAmount ? parseFloat(data.coverAmount) : null,
              startDate: data.startDate,
              renewalDate: data.renewalDate || null,
              notes: data.notes || '',
            }
          : p
      )
      storage.setInsurance(updated)
      logAudit('update', 'insurance', id, before, updated.find((p) => p.id === id))
      return updated
    })
  }, [])

  return { policies, addPolicy, removePolicy, updatePolicy }
}
