import { useCallback, useMemo, useState } from 'react'
import {
  computeOtherAssetPnL,
  getTransactionsForHolding,
} from '../utils/holdingLedger'
import { storage } from '../utils/storage'

export function useOtherAssetDetail(asset) {
  const [txVersion, setTxVersion] = useState(0)

  const refresh = useCallback(() => setTxVersion((n) => n + 1), [])

  const transactions = useMemo(() => {
    if (!asset) return []
    return getTransactionsForHolding(asset.name, asset.id, 'otherAsset')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, txVersion])

  const pnl = useMemo(() => {
    if (!asset) return null
    return computeOtherAssetPnL(asset, storage.getTransactions())
  }, [asset, transactions])

  return {
    transactions,
    pnl,
    refresh,
  }
}
