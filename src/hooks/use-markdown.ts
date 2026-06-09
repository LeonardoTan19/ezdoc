import { useRef, useEffect, useCallback } from 'react'
import { MarkdownParser } from '@/engine'
import type { ParserConfig } from '@/engine/schema'
import { useDocStore } from '@/stores/doc-store'
import { useRuleStore } from '@/stores/rule-store'

function buildHeadingStyles(
  content: { h1?: { style?: { index?: string | null } }; h2?: { style?: { index?: string | null } }; h3?: { style?: { index?: string | null } }; h4?: { style?: { index?: string | null } } } | undefined,
): Record<string, string> | undefined {
  if (!content) return undefined
  return {
    h1: content.h1?.style?.index ?? '0lines',
    h2: content.h2?.style?.index ?? '0lines',
    h3: content.h3?.style?.index ?? '0lines',
    h4: content.h4?.style?.index ?? '0lines',
  }
}

export function useMarkdown() {
  const parserRef = useRef<MarkdownParser | null>(null)
  if (parserRef.current === null) parserRef.current = new MarkdownParser()
  const docStore = useDocStore()
  const ruleStore = useRuleStore()
  const parserConfig = ruleStore.currentRule?.parser
  const ruleContent = ruleStore.currentRule?.content
  const updateHtml = docStore.updateHtml

  const parse = useCallback(
    (markdown: string): string => {
      // The rule's parser config (enterStyle, headingNumbering,
      // localStyleAliases, etc.) is the source of truth for how markdown
      // renders. headingStyles is derived from content.*.style.index because
      // the per-level index template lives in the content tree, not in parser.
      if (parserConfig) {
        const headingStyles = buildHeadingStyles(ruleContent)
        parserRef.current!.setOptions({ ...parserConfig, headingStyles })
      }
      const result = parserRef.current!.parse(markdown)
      return result.html
    },
    [parserConfig, ruleContent],
  )

  const setOptions = useCallback((options: Partial<ParserConfig>) => {
    parserRef.current!.setOptions(options)
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
