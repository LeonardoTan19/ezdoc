import type { HostSelectors, StyleNode } from '../types'
import { scopeSelectors } from '../css-scope'
import { toCssCustomProperty } from '../css-variable'
import { buildContentFontPath, buildFontFamilyValue, declaration, styleRule } from '../compiler-internals'

export function buildBodyRules(host: HostSelectors): StyleNode[] {
  return [
    styleRule(host.rootContent, [
      declaration('font-family', `var(${toCssCustomProperty('content.body.fonts.cjkFamily')})`),
      declaration('font-size', `var(${toCssCustomProperty('content.body.style.size')})`),
      declaration('font-weight', `var(${toCssCustomProperty('content.body.style.weight')})`),
      declaration('line-height', `var(${toCssCustomProperty('content.body.paragraph.spacing.lineHeight')})`),
      declaration('color', `var(${toCssCustomProperty('content.body.style.colors.text')})`),
      declaration('background-color', `var(${toCssCustomProperty('content.body.style.colors.background')})`)
    ]),
    styleRule(host.paperContent, [
      declaration(
        'padding',
        `var(${toCssCustomProperty('page.margins.top')}) var(${toCssCustomProperty('page.margins.right')}) var(${toCssCustomProperty('page.margins.bottom')}) var(${toCssCustomProperty('page.margins.left')})`
      )
    ]),
    styleRule(scopeSelectors(['.latin-text'], host.rootContent), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('body', 'latinFamily'), buildContentFontPath('body', 'cjkFamily')))
    ]),
    styleRule(scopeSelectors(['.cn-quote'], host.rootContent), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('body', 'cnQuoteFamily'), buildContentFontPath('body', 'cjkFamily')))
    ]),
    styleRule(scopeSelectors(['.cn-book-title'], host.rootContent), [
      declaration('font-family', buildFontFamilyValue(buildContentFontPath('body', 'cnBookTitleFamily'), buildContentFontPath('body', 'cjkFamily')))
    ]),
    styleRule(scopeSelectors(['.local-style-container'], host.rootContent), [
      declaration('color', `var(${toCssCustomProperty('content.body.style.colors.text')})`),
      declaration('background-color', `var(${toCssCustomProperty('content.body.style.colors.background')})`)
    ]),
    styleRule(scopeSelectors(['p'], host.rootContent), [
      declaration('margin-top', `var(${toCssCustomProperty('content.body.paragraph.spacing.before')})`),
      declaration('margin-bottom', `var(${toCssCustomProperty('content.body.paragraph.spacing.after')})`),
      declaration('text-indent', `var(${toCssCustomProperty('content.body.paragraph.indent')})`),
      declaration('text-align', `var(${toCssCustomProperty('content.body.paragraph.align')})`),
      declaration('line-height', `var(${toCssCustomProperty('content.body.paragraph.spacing.lineHeight')})`)
    ])
  ]
}
