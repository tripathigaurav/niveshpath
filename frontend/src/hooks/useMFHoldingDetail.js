import { useCallback, useMemo, useState } from 'react'
import {
  computeMFHoldingPnL,
  getTransactionsForHolding,
} from '../utils/holdingLedger'
import { storage } from '../utils/storage'

export function useMFHoldingDetail(fund) {
  const [txVersion, setTxVersion] = useState(0)

  const refresh = useCallback(() => setTxVersion((n) => n + 1), [])

  const transactions = useMemo(() => {
    if (!fund) return []
    return getTransactionsForHolding(fund.schemeName, fund.id, 'mutualFund')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fund, txVersion])

  const pnl = useMemo(() => {
    if (!fund) return null
    return computeMFHoldingPnL(fund, storage.getTransactions())
  }, [fund, transactions])

  return {
    transactions,
    pnl,
    refresh,
  }
}
