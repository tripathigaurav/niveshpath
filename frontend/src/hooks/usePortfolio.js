// Barrel re-export — all hooks split into individual files.
// Existing imports like:
//   import { useIndianStocks } from '../hooks/usePortfolio'
// continue to work unchanged.
export { useIndianStocks } from './useIndianStocks'
export { useUSStocks } from './useUSStocks'
export { useMutualFunds } from './useMutualFunds'
export { useOtherAssets } from './useOtherAssets'
export { useInsurance } from './useInsurance'
