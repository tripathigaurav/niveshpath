import { useEffect } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Traps Tab/Shift+Tab focus within modalRef when isOpen is true.
 * Also focuses the first focusable element on open and calls onClose on Escape.
 */
export function useFocusTrap(modalRef, isOpen, onClose) {
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const el = modalRef.current
    const focusable = Array.from(el.querySelectorAll(FOCUSABLE))
    if (focusable.length) focusable[0].focus()

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
        return
      }
      if (e.key !== 'Tab') return
      if (!focusable.length) { e.preventDefault(); return }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, modalRef, onClose])
}
