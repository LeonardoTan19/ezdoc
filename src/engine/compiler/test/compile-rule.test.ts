import { describe, expect, it } from 'vitest'
import { compileRule } from '../compiler'
import { DEFAULT_HOST } from '../default-host'
import { getBuiltinRules } from '../../builtin-rules'
import type { HostSelectors } from '../types'
import { createValidRule } from './fixtures'

describe('compileRule', () => {
  it('compiles valid rule into tokens/rules/cssText', () => {
    const validRule = createValidRule()
    const compiled = compileRule(validRule, DEFAULT_HOST)
    const expectedPageMargin = `${validRule.page.margins.top} ${validRule.page.margins.right} ${validRule.page.margins.bottom} ${validRule.page.margins.left}`

    expect(Object.keys(compiled.tokens).length).toBeGreaterThan(10)
    expect(compiled.rules.length).toBeGreaterThan(0)
    expect(compiled.cssText).toContain(':root')
    expect(compiled.cssText).toContain('--content-body-fonts-latin-family')
    expect(compiled.cssText).toContain('--content-body-fonts-cjk-family')
    expect(compiled.cssText).toContain('--content-body-paragraph-indent')
    expect(compiled.cssText).toContain('--content-h2-paragraph-indent')
    expect(compiled.cssText).toContain('--content-h2-paragraph-spacing-before')
    expect(compiled.cssText).toContain('--content-h1-paragraph-spacing-before: 2lh;')
    expect(compiled.cssText).toContain('--content-h1-paragraph-spacing-after: 1lh;')
    expect(compiled.cssText).toContain('.cn-quote')
    expect(compiled.cssText).toContain('.cn-book-title')
    expect(compiled.cssText).toContain('.latin-text')
    expect(compiled.cssText).toContain('@page')
    expect(compiled.cssText).toContain('.paper-sheet.preview-content, .export-document')
    expect(compiled.cssText).toContain('padding: var(--page-margins-top) var(--page-margins-right) var(--page-margins-bottom) var(--page-margins-left);')
    expect(compiled.cssText).toContain(`margin: ${expectedPageMargin};`)
    expect(compiled.cssText).toContain('.preview-content .local-style-container')
    expect(compiled.cssText).toContain('break-inside: auto;')
  })

  it('provides builtin rules from yaml source', () => {
    const rules = getBuiltinRules()
    expect(rules.length).toBeGreaterThan(1)
    expect(rules[0]?.name).toContain('GB/T 33476-2016')
    expect(rules.some((rule) => rule.name.includes('GB/T 9704-2012'))).toBe(true)
  })

  it('generates tokens for custom content level without adding new style rules', () => {
    const baseRule = createValidRule()
    const baseCompiled = compileRule(baseRule, DEFAULT_HOST)

    const customRule = createValidRule()
    const appendix = JSON.parse(JSON.stringify(customRule.content.body))
    appendix.paragraph.indent = '3em'
    customRule.content.appendix = appendix

    const compiled = compileRule(customRule, DEFAULT_HOST)
    expect(compiled.tokens['--content-appendix-paragraph-indent']).toBe('3em')
    expect(compiled.cssText).toContain('--content-appendix-paragraph-indent: 3em;')
    expect(compiled.rules).toHaveLength(baseCompiled.rules.length)
  })

  it('uses injected custom host selectors instead of defaults', () => {
    const customHost: HostSelectors = {
      rootContent: ['.custom-preview', '.custom-export'],
      paperSheet: ['.custom-sheet'],
      exportDocument: ['.custom-export'],
      appShell: ['#custom-app'],
      printContainer: ['.custom-print'],
      paperContent: ['.custom-sheet.custom-preview', '.custom-export'],
    }
    const compiled = compileRule(createValidRule(), customHost)

    expect(compiled.cssText).toContain('.custom-preview .latin-text')
    expect(compiled.cssText).toContain('.custom-export .latin-text')
    expect(compiled.cssText).not.toContain('.preview-content')
  })
})
