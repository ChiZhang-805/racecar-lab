import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useDialogFocus<T extends HTMLElement>() {
  const dialogRef = useRef<T>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => element.offsetParent !== null)
    const focusFrame = requestAnimationFrame(() => (focusables()[0] ?? dialog).focus())

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = focusables()
      if (!items.length) { event.preventDefault(); dialog.focus(); return }
      const first = items[0]!
      const last = items[items.length - 1]!
      const active = document.activeElement
      if (!dialog.contains(active)) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
      else if (event.shiftKey && active === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus() }
    }
    dialog.addEventListener('keydown', trapFocus)
    return () => { cancelAnimationFrame(focusFrame); dialog.removeEventListener('keydown', trapFocus); previous?.focus() }
  }, [])

  return dialogRef
}
