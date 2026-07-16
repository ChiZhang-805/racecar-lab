import { describe, expect, it } from 'vitest'
import { formatUiNumber, numberLocaleFor } from './uiNumber'

describe('UI number localisation', () => {
  it('maps the interface language to an explicit stable number locale', () => {
    expect(numberLocaleFor('zh')).toBe('zh-CN')
    expect(numberLocaleFor('en')).toBe('en-US')
  })

  it('formats values with the selected interface locale instead of the host OS locale', () => {
    const options = { maximumFractionDigits: 1 } as const
    expect(formatUiNumber(1234.56, 'zh', options)).toBe(new Intl.NumberFormat('zh-CN', options).format(1234.56))
    expect(formatUiNumber(1234.56, 'en', options)).toBe(new Intl.NumberFormat('en-US', options).format(1234.56))
  })
})
