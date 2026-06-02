import { useRef, useEffect, useCallback } from 'react'
import { MarkdownParser } from '@/engine'
import type { ParserConfig } from '@/engine/schema'
import { useDocStore } from '@/stores/doc-store'
import { useRuleStore } from '@/stores/rule-store'

export function useMarkdown() {
  const parserRef = useRef(new MarkdownParser())
  const docStore = useDocStore()
  const ruleStore = useRuleStore()
  const parserConfig = ruleStore.currentRule?.parser
  const updateHtml = docStore.updateHtml

  const parse = useCallback(
    (markdown: string): string => {
      // The rule's parser config (enterStyle, headingNumbering, per-level
      // headingStyles, localStyleAliases, etc.) is the source of truth for
      // how markdown renders. Push it into the parser before each parse so
      // heading numbering threads through correctly.
      if (parserConfig) {
        parserRef.current.setOptions(parserConfig)
      }
      const result = parserRef.current.parse(markdown)
      return result.html
    },
    [parserConfig],
  )

  const setOptions = useCallback((options: Partial<ParserConfig>) => {
    parserRef.current.setOptions(options)
  }, [])

  useEffect(() => {
    try {
      const html = parse(docStore.content)
      updateHtml(html)
    } catch (error) {
      console.error('Markdown parse failed:', error)
    }
  }, [docStore.content, parse, updateHtml])

  return { parse, setOptions }
}
