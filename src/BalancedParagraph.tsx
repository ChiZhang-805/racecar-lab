import { useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react'
import type { Locale } from './i18n'

const DESKTOP_QUERY = '(min-width: 981px)'
const TARGET_LAST_LINE_RATIO = 0.8
const MIN_ACCEPTABLE_RATIO = 0.68

type BalancedParagraphProps = Omit<ComponentPropsWithoutRef<'p'>, 'children'> & {
  locale: Locale
  text: string
}

type SplitCopy = { lead: string; tail: string } | null
type SplitState = { source: string; copy: Exclude<SplitCopy, null> } | null

function lineRects(element: HTMLElement) {
  const bounds = element.getBoundingClientRect()
  const rows: Array<{ top: number; left: number; right: number }> = []
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)

  while (walker.nextNode()) {
    const range = document.createRange()
    range.selectNodeContents(walker.currentNode)
    for (const rect of range.getClientRects()) {
      if (rect.width < 1 || rect.height < 1 || rect.bottom <= bounds.top + 1 || rect.top >= bounds.bottom - 1) continue
      const row = rows.find((candidate) => Math.abs(candidate.top - rect.top) < 2)
      if (row) {
        row.left = Math.min(row.left, rect.left)
        row.right = Math.max(row.right, rect.right)
      } else {
        rows.push({ top: rect.top, left: rect.left, right: rect.right })
      }
    }
  }

  return rows.sort((a, b) => a.top - b.top)
}

function textSegments(text: string) {
  return text.match(/[\p{Script=Han}]|[\p{L}\p{N}]+(?:['’.\/-][\p{L}\p{N}]+)*|\s+|./gu) ?? [text]
}

function createWidthProbe(style: CSSStyleDeclaration, contentWidth: number) {
  const probe = document.createElement('span')
  Object.assign(probe.style, {
    position: 'fixed',
    insetInlineStart: '-10000px',
    insetBlockStart: '0',
    visibility: 'hidden',
    pointerEvents: 'none',
    display: 'block',
    width: `${contentWidth}px`,
    whiteSpace: style.whiteSpace,
    font: style.font,
    fontKerning: style.fontKerning,
    fontFeatureSettings: style.fontFeatureSettings,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    overflowWrap: style.overflowWrap,
    textAlign: style.textAlign,
    textIndent: style.textIndent,
    textTransform: style.textTransform,
    wordBreak: style.wordBreak,
    wordSpacing: style.wordSpacing,
  })
  document.body.append(probe)
  return probe
}

function chooseSplit(element: HTMLParagraphElement, text: string): SplitCopy {
  if (!window.matchMedia(DESKTOP_QUERY).matches) return null
  const style = getComputedStyle(element)
  const contentElement = element.querySelector<HTMLElement>('.balanced-copy__content')
  const boxContentWidth = element.getBoundingClientRect().width
    - Number.parseFloat(style.borderInlineStartWidth || style.borderLeftWidth)
    - Number.parseFloat(style.borderInlineEndWidth || style.borderRightWidth)
    - Number.parseFloat(style.paddingInlineStart || style.paddingLeft)
    - Number.parseFloat(style.paddingInlineEnd || style.paddingRight)
  const contentWidth = style.display.includes('flex') && contentElement
    ? contentElement.getBoundingClientRect().width
    : boxContentWidth
  if (!Number.isFinite(contentWidth) || contentWidth < 120) return null

  const probe = createWidthProbe(style, contentWidth)
  probe.textContent = text
  const rows = lineRects(probe)
  if (rows.length < 2) {
    probe.remove()
    return null
  }
  const naturalRatio = (rows.at(-1)!.right - rows.at(-1)!.left) / contentWidth
  if (naturalRatio >= MIN_ACCEPTABLE_RATIO) {
    probe.remove()
    return null
  }

  const segments = textSegments(text)
  if (segments.length < 2) {
    probe.remove()
    return null
  }
  let best: { score: number; split: Exclude<SplitCopy, null> } | null = null

  for (let index = 1; index < segments.length; index += 1) {
    const lead = segments.slice(0, index).join('').trimEnd()
    const tail = segments.slice(index).join('').trimStart()
    if (!lead || !tail || !/^[\p{L}\p{N}]/u.test(tail)) continue
    probe.textContent = lead
    const leadLineCount = lineRects(probe).length
    probe.textContent = tail
    const tailRows = lineRects(probe)
    if (tailRows.length === 0) continue
    const totalLineCount = leadLineCount + tailRows.length
    if (totalLineCount > rows.length + 1) continue
    const lastTailRow = tailRows.at(-1)!
    const ratio = (lastTailRow.right - lastTailRow.left) / contentWidth
    if (ratio > 0.9) continue
    const lineCountPenalty = Math.abs(totalLineCount - rows.length) * 0.24
    const score = Math.abs(ratio - TARGET_LAST_LINE_RATIO) + lineCountPenalty
    if (!best || score < best.score) best = { score, split: { lead, tail } }
  }

  probe.remove()
  if (best && best.score >= Math.abs(naturalRatio - TARGET_LAST_LINE_RATIO)) best = null
  return best?.split ?? null
}

export default function BalancedParagraph({ locale, text, className = '', ...props }: BalancedParagraphProps) {
  const paragraphRef = useRef<HTMLParagraphElement>(null)
  const [splitState, setSplitState] = useState<SplitState>(null)
  const splitCopy = splitState?.source === text ? splitState.copy : null

  useLayoutEffect(() => {
    const paragraph = paragraphRef.current
    if (!paragraph) return
    paragraph.removeAttribute('data-balance-ready')
    let resetFrame = 0
    let measureFrame = 0
    let measuredWidth = -1
    let disposed = false

    const measure = (force = false) => {
      cancelAnimationFrame(resetFrame)
      resetFrame = requestAnimationFrame(() => {
        const width = paragraph.getBoundingClientRect().width
        if (!force && Math.abs(width - measuredWidth) < 0.5) return
        cancelAnimationFrame(measureFrame)
        measuredWidth = width
        measureFrame = requestAnimationFrame(() => {
          const copy = chooseSplit(paragraph, text)
          setSplitState(copy ? { source: text, copy } : null)
          paragraph.dataset.balanceReady = ''
        })
      })
    }

    measure(true)
    const settleTimer = window.setTimeout(() => measure(true), 120)
    void document.fonts?.ready.then(() => { if (!disposed) measure(true) })
    const resizeObserver = new ResizeObserver(() => measure())
    resizeObserver.observe(paragraph)
    const mediaQuery = window.matchMedia(DESKTOP_QUERY)
    const onMediaChange = () => measure(true)
    mediaQuery.addEventListener('change', onMediaChange)

    return () => {
      disposed = true
      window.clearTimeout(settleTimer)
      cancelAnimationFrame(resetFrame)
      cancelAnimationFrame(measureFrame)
      resizeObserver.disconnect()
      mediaQuery.removeEventListener('change', onMediaChange)
    }
  }, [locale, text])

  return (
    <p ref={paragraphRef} className={`balanced-copy ${className}`.trim()} data-balanced-copy="" {...props}>
      <span className="balanced-copy__content">
        {splitCopy ? <>{splitCopy.lead}<br aria-hidden="true" /> <span className="balanced-copy__tail">{splitCopy.tail}</span></> : text}
      </span>
    </p>
  )
}
