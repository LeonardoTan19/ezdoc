import type { ParserConfig } from '../../../schema'
import type { MdPluginWithOptions } from '../../types'

// markdown-it's `linkify` core rule runs linkify-it's `pretest` regex against
// every inline token's content. That regex is expensive over long runs of CJK
// text, and for typical government documents (paragraphs of Chinese prose with
// no URLs) it never matches — yet still dominates parse time (~38% on an 80-
// paragraph doc).
//
// linkify can only ever produce a link when the text contains one of `. : / @`
// (schema separator, protocol slashes, fuzzy-host dot, or email at-sign). A
// single `indexOf` scan per token is a cheap, sound necessary condition: if no
// inline token contains any trigger character, the original rule cannot match,
// so we skip it entirely. When a trigger is present we delegate to the original
// rule unchanged, so output is identical in every case.
const LINKIFY_TRIGGERS = ['.', ':', '/', '@']

function hasLinkifyTrigger(content: string): boolean {
  for (let i = 0; i < LINKIFY_TRIGGERS.length; i += 1) {
    if (content.indexOf(LINKIFY_TRIGGERS[i]!) >= 0) {
      return true
    }
  }
  return false
}

export const fastLinkifyPlugin: MdPluginWithOptions<ParserConfig> = (md) => {
  const linkifyRule = md.core.ruler.__rules__.find((rule) => rule.name === 'linkify')
  if (!linkifyRule || typeof linkifyRule.fn !== 'function') {
    return
  }

  const originalLinkify = linkifyRule.fn

  md.core.ruler.at('linkify', (state) => {
    if (!state.md.options.linkify) {
      return
    }

    let mayContainLink = false
    const tokens = state.tokens
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i]
      if (token && token.type === 'inline' && hasLinkifyTrigger(token.content)) {
        mayContainLink = true
        break
      }
    }

    if (!mayContainLink) {
      return
    }

    return originalLinkify(state, 0)
  })
}
