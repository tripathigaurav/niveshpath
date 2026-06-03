# Demo Data Guide

Quick guide to load sample data for testing निवेश Path.

## Insurance Demo Data

### Load Sample Insurance Policies

Open your browser console (F12 → Console tab) and run:

```javascript
// Load 6 balanced demo insurance policies (3 health + 3 term)
const demoInsurancePolicies = [
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
];

localStorage.setItem('pt_insurance', JSON.stringify(demoInsurancePolicies));
console.log('✅ Demo insurance loaded! Refresh the page.');
```

Then **refresh the page** (F5 or Cmd+R).

---

### Clear Insurance Data

```javascript
localStorage.removeItem('pt_insurance');
console.log('✅ Insurance data cleared! Refresh the page.');
```

---

## UI Features Verified

### Insurance Card Styling
- ✅ **Consistent Heights**: All cards now have uniform height regardless of content
- ✅ **Balanced Layout**: Flexbox ensures proper spacing between health and term cards
- ✅ **Responsive Grid**: Auto-fill grid with min 320px card width
- ✅ **Visual Hierarchy**: Color-coded borders (Health: Blue, Term: Green)
- ✅ **Hover Effects**: Subtle elevation and transform on hover

### Card Content Balance
- ✅ **Cover Amount**: Both health and term show prominent cover amount
- ✅ **Premium Display**: Consistent "/yr" suffix for annual premiums
- ✅ **Renewal Chips**: Color-coded by urgency (urgent: red, soon: yellow, normal: gray)
- ✅ **Type Badges**: Clear categorization with badges

---

## Technical Details

### CSS Changes Made
```css
.ins-card {
  display: flex;
  flex-direction: column;
  height: 100%;           /* Match grid row height */
  min-height: 100px;      /* Ensure minimum height */
}

.ins-card-header {
  flex: 1;                /* Fill available space */
}

.ins-card-right {
  display: flex;
  flex-direction: column;
  gap: 4px;               /* Consistent spacing */
  align-items: flex-end;
}
```

### Demo Data Balance
- **3 Health Policies**: Range from ₹5L to ₹15L cover, ₹12K-₹22K premium
- **3 Term Policies**: Range from ₹75L to ₹1.5Cr cover, ₹11.5K-₹18K premium
- **Balanced Data**: Similar text lengths, all have notes, consistent date formats

---

## Other Asset Categories

### Coming Soon
- Indian Stocks demo data
- US Stocks demo data
- Mutual Funds demo data
- Other Assets demo data

---

## Notes

- All demo data is **stored locally** in browser LocalStorage
- Data persists until you clear it or clear browser data
- **No server calls** for demo data
- Safe to experiment — just clear and reload demo data anytime

---

**Last Updated**: June 3, 2026  
**Version**: 1.0
