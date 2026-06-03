import { getInitials } from '../utils/initials'

describe('getInitials', () => {
  test('two words', () => {
    expect(getInitials('Gaurav Tripathi')).toBe('GT')
  })

  test('single word', () => {
    expect(getInitials('Gaurav')).toBe('G')
  })

  // Uses first + last word initials (not first two words)
  test('three words uses first and last', () => {
    expect(getInitials('A B C')).toBe('AC')
  })

  test('empty string returns placeholder', () => {
    expect(getInitials('')).toBe('?')
  })

  test('null/undefined return placeholder', () => {
    expect(getInitials(null)).toBe('?')
    expect(getInitials(undefined)).toBe('?')
  })

  test('whitespace only returns ?', () => {
    expect(getInitials('   ')).toBe('?')
  })
})
