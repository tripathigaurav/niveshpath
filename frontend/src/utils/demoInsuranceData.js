/**
 * Demo Insurance Data
 * 
 * Sample health and term insurance policies for testing.
 * Usage: Copy and paste into browser console or import in development.
 */

export const demoInsurancePolicies = [
  // Health Insurance Policies
  {
    id: 'demo-health-1',
    name: 'Star Health Family Floater',
    type: 'health',
    premium: 18500,
    coverAmount: 1000000,
    startDate: '2023-04-15',
    renewalDate: '2025-04-14',
    notes: 'Family floater plan covering 4 members',
  },
  {
    id: 'demo-health-2',
    name: 'HDFC Optima Secure',
    type: 'health',
    premium: 12000,
    coverAmount: 500000,
    startDate: '2023-06-01',
    renewalDate: '2025-06-01',
    notes: 'Individual health insurance',
  },
  {
    id: 'demo-health-3',
    name: 'Care Supreme',
    type: 'health',
    premium: 22000,
    coverAmount: 1500000,
    startDate: '2023-09-10',
    renewalDate: '2025-09-09',
    notes: 'Comprehensive coverage with OPD',
  },
  
  // Term Insurance Policies
  {
    id: 'demo-term-1',
    name: 'LIC Tech Term',
    type: 'term',
    premium: 15000,
    coverAmount: 10000000,
    startDate: '2022-01-15',
    renewalDate: '2025-01-14',
    notes: 'Online term plan with return of premium',
  },
  {
    id: 'demo-term-2',
    name: 'HDFC Life Click 2 Protect',
    type: 'term',
    premium: 11500,
    coverAmount: 7500000,
    startDate: '2022-08-20',
    renewalDate: '2025-08-19',
    notes: 'Term insurance with critical illness rider',
  },
  {
    id: 'demo-term-3',
    name: 'Max Life Smart Secure Plus',
    type: 'term',
    premium: 18000,
    coverAmount: 15000000,
    startDate: '2022-11-05',
    renewalDate: '2025-11-04',
    notes: 'Comprehensive term insurance with accidental death benefit',
  },
]

/**
 * Load demo insurance data into localStorage
 */
export function loadDemoInsurance() {
  try {
    localStorage.setItem('pt_insurance', JSON.stringify(demoInsurancePolicies))
    console.log('✅ Demo insurance data loaded successfully!')
    console.log(`📊 ${demoInsurancePolicies.length} policies added`)
    console.log('🔄 Refresh the page to see the demo data')
    return true
  } catch (err) {
    console.error('❌ Failed to load demo data:', err)
    return false
  }
}

/**
 * Clear insurance data from localStorage
 */
export function clearInsurance() {
  try {
    localStorage.removeItem('pt_insurance')
    console.log('✅ Insurance data cleared!')
    console.log('🔄 Refresh the page')
    return true
  } catch (err) {
    console.error('❌ Failed to clear data:', err)
    return false
  }
}

// Make functions available in browser console during development
if (typeof window !== 'undefined') {
  window.loadDemoInsurance = loadDemoInsurance
  window.clearInsurance = clearInsurance
}
