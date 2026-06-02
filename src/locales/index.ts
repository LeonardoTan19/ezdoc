import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import zhCN from './zh-CN.json'

const LOCALE_STORAGE_KEY = 'ezdoc-locale'
const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

function resolveInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'zh-CN'
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  if (saved && SUPPORTED_LOCALES.includes(saved as SupportedLocale)) {
    return saved as SupportedLocale
  }
  return 'zh-CN'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-CN': { translation: zhCN },
  },
  lng: resolveInitialLocale(),
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
})

export function setLocale(locale: SupportedLocale): void {
  i18n.changeLanguage(locale)
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

if (typeof document !== 'undefined') {
  document.documentElement.lang = resolveInitialLocale()
}

export default i18n
