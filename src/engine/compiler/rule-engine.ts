import type { CompiledRule, ValidationResult } from './types'
import type { RuleConfig } from '../schema'
import { getBuiltinRules } from '../builtin-rules'
import { compileRule } from './compiler'
import { validateRule } from './validator'

export class RuleEngine {
  validate(ruleConfig: unknown): ValidationResult {
    return validateRule(ruleConfig)
  }

  compile(ruleConfig: RuleConfig): CompiledRule {
    const validationResult = this.validate(ruleConfig)
    if (!validationResult.valid) {
      throw new Error(validationResult.errors.join(', '))
    }

    return compileRule(ruleConfig)
  }

  getBuiltinRules(): RuleConfig[] {
    return getBuiltinRules()
  }
}

export const ruleEngine = new RuleEngine()
