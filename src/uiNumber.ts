import type { Locale } from './i18n'

export const numberLocaleFor = (locale: Locale) => locale === 'zh' ? 'zh-CN' : 'en-US'

export const formatUiNumber = (
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
) => value.toLocaleString(numberLocaleFor(locale), options)
