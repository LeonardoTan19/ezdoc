import type { ParserConfig } from '../../../schema'
import type { Preprocessor } from '../../types'

function getDisabledSyntax(options: ParserConfig): string[] {
  return Array.isArray(options.disabledSyntax) ? options.disabledSyntax : []
}

export const syntaxStripper: Preprocessor = {
  name: 'syntax-stripper',
  process(markdown: string, options: ParserConfig): string {
    let normalized = markdown
    const disabledSyntax = getDisabledSyntax(options)

    if (disabledSyntax.includes('codeBlock')) {
      normalized = normalized.replace(/```[\s\S]*?```/g, (block) => {
        return block
          .replace(/^```\w*\s*\n?/, '')
          .replace(/\n?```$/, '')
      })
    }

    const lines = normalized.split('\n')
    const outputLines: string[] = []

    for (const line of lines) {
      let currentLine = line

      if (disabledSyntax.includes('blockquote')) {
        currentLine = currentLine.replace(/^\s*>\s?/, '')
      }

      if (disabledSyntax.includes('unorderedList')) {
        currentLine = currentLine.replace(/^\s*[-*+]\s+/, '')
      }

      outputLines.push(currentLine)
    }

    return outputLines.join('\n')
  },
}
