export function issueLabel(issue) {
  switch (issue.type) {
    case 'quantity_mismatch':
      return `${issue.symbol}: qty ${issue.actual} vs ledger ${issue.expected} (check splits/buys)`
    case 'quantity_mismatch_aggregate':
      return issue.message || `${issue.symbol}: lots total ${issue.actual} vs ledger ${issue.expected}`
    case 'orphaned_transaction':
      return `${issue.symbol}: transaction linked to removed holding`
    case 'negative_quantity':
      return `${issue.symbol}: sold more than owned on ${issue.date}`
    case 'missing_buy_date':
      return `${issue.symbol}: missing buy date (XIRR unavailable)`
    case 'empty_transaction_log':
      return issue.message
    default:
      return issue.type
  }
}
