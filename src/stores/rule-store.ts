import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RuleConfig } from '@/engine'
import { compileRule, validateRule, getBuiltinRules, DEFAULT_HOST } from '@/engine'
import type { CompiledRule, ValidationResult, HostSelectors } from '@/engine'
import { sanitizeCssValue } from '@/engine/utils/css-sanitize-utils'

const RULE_STORAGE_KEY = 'ezdoc-rule'

const RESERVED_CUSTOM_STYLE_KEYS = new Set([
  '--page-margins-top',
  '--page-margins-right',
  '--page-margins-bottom',
  '--page-margins-left',
])

function normalizeCustomStyles(input: Record<string, string>): Record<string, string> {
  return Object.entries(input).reduce<Record<string, string>>((acc, [key, value]) => {
    const normalizedKey = key.startsWith('--') ? key : `--${key}`
    const normalizedValue = sanitizeCssValue(value)
    if (normalizedKey.length > 2 && normalizedValue.length > 0 && !RESERVED_CUSTOM_STYLE_KEYS.has(normalizedKey)) {
      acc[normalizedKey] = normalizedValue
    }
    return acc
  }, {})
}

interface RuleState {
  currentRule: RuleConfig | null
  availableRules: RuleConfig[]
  compiledRule: CompiledRule | null
  customStyles: Record<string, string>
  host: HostSelectors

  loadRule: (rule: RuleConfig) => void
  saveRule: (rule: RuleConfig) => ValidationResult
  setCustomStyle: (key: string, value: string) => void
  resetCustomStyles: () => void
  initializeRule: () => void

  getCssVariables: () => Record<string, string>
  getRuleCssText: () => string
}

export const useRuleStore = create<RuleState>()(
  persist(
    (set, get) => ({
      currentRule: null,
      availableRules: [],
      compiledRule: null,
      customStyles: {},
      host: DEFAULT_HOST,

      loadRule(rule) {
        const validation = validateRule(rule)
        if (!validation.valid) {
          throw new Error(`Invalid rule: ${validation.errors.join(', ')}`)
        }
        const compiled = compileRule(rule, get().host)
        set({ currentRule: rule, compiledRule: compiled })
      },

      saveRule(rule) {
        const validation = validateRule(rule)
        if (!validation.valid) {
          throw new Error(`Invalid rule: ${validation.errors.join(', ')}`)
        }
        // Persist happens via zustand middleware
        const current = get().currentRule
        if (current && current.name === rule.name) {
          const compiled = compileRule(rule, get().host)
          set({ currentRule: rule, compiledRule: compiled })
        }
        return validation
      },

      setCustomStyle(key, value) {
        const normalizedKey = key.startsWith('--') ? key : `--${key}`
        if (RESERVED_CUSTOM_STYLE_KEYS.has(normalizedKey)) {
          const styles = { ...get().customStyles }
          delete styles[key]
          delete styles[normalizedKey]
          set({ customStyles: styles })
          return
        }
        set((s) => ({ customStyles: { ...s.customStyles, [key]: value } }))
      },

      resetCustomStyles() {
        set({ customStyles: {} })
      },

      initializeRule() {
        const builtin = getBuiltinRules()
        set({ availableRules: builtin })

        const saved = get().currentRule
        if (saved) {
          // already hydrated by zustand persist
          const builtinMatch = builtin.find((r) => r.name === saved.name)
          if (builtinMatch && JSON.stringify(saved) !== JSON.stringify(builtinMatch)) {
            get().loadRule(builtinMatch)
          } else {
            get().loadRule(saved)
          }
          return
        }

        if (builtin.length > 0) {
          get().loadRule(builtin[0]!)
        }
      },

      getCssVariables() {
        const compiled = get().compiledRule
        if (!compiled) return {}
        return { ...compiled.tokens, ...normalizeCustomStyles(get().customStyles) }
      },

      getRuleCssText() {
        const compiled = get().compiledRule
        if (!compiled) return ''
        const customLines = Object.entries(normalizeCustomStyles(get().customStyles))
          .map(([key, value]) => `  ${key}: ${value};`)
        if (customLines.length === 0) return compiled.cssText
        return `${compiled.cssText}\n\n:root {\n${customLines.join('\n')}\n}`
      },
    }),
    {
      name: RULE_STORAGE_KEY,
      partialize: (state) => ({
        currentRule: state.currentRule,
        customStyles: state.customStyles,
      }),
    },
  ),
)
