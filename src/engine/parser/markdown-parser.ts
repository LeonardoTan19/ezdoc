import MarkdownIt from 'markdown-it'
import type { ParserConfig } from '../schema'
import type { ParseResult, ParserPipeline } from './types'
import { syntaxStripper } from './processors/preprocess/syntax-stripper'
import { lineBreakNormalizer } from './processors/preprocess/line-break-normalizer'
import { localStyleContainerPlugin } from './processors/md-plugins/local-style-container'
import { textFontScopePlugin } from './processors/md-plugins/text-font-scope'
import { headingNumberingProcessor } from './processors/token/heading-numbering'

export type MarkdownOptions = ParserConfig

const defaultOptions: MarkdownOptions = {
  html: false,
  enterStyle: 'paragraph',
  linkify: true,
  typographer: true,
  headingNumbering: true,
  disabledSyntax: ['codeBlock', 'blockquote', 'unorderedList', 'horizontalRule'],
  localStyleAliases: {}
}

export const DEFAULT_PIPELINE: ParserPipeline = {
  preprocessors: [syntaxStripper, lineBreakNormalizer],
  mdPlugins: [localStyleContainerPlugin, textFontScopePlugin],
  tokenProcessors: [headingNumberingProcessor],
  htmlPostprocessors: [],
}

export class MarkdownParser {
  private md: MarkdownIt
  private options: MarkdownOptions
  private pipeline: ParserPipeline

  constructor(pipeline: ParserPipeline = DEFAULT_PIPELINE, options: Partial<MarkdownOptions> = {}) {
    this.pipeline = pipeline
    this.options = {
      ...defaultOptions,
      ...options,
      disabledSyntax: options.disabledSyntax ?? defaultOptions.disabledSyntax,
      localStyleAliases: options.localStyleAliases ?? defaultOptions.localStyleAliases
    }
    this.md = this.createMarkdownIt(this.options)
  }

  parse(markdown: string): ParseResult {
    if (!markdown || typeof markdown !== 'string') {
      return { html: '', tokens: [] }
    }

    try {
      const preprocessed = this.pipeline.preprocessors.reduce(
        (input, preprocessor) => preprocessor.process(input, this.options),
        markdown,
      )

      const parsedTokens = this.md.parse(preprocessed, {})

      const processedTokens = this.pipeline.tokenProcessors.reduce(
        (tokens, processor) => processor.process(tokens, this.options),
        parsedTokens,
      )

      const renderedHtml = this.md.renderer.render(processedTokens, this.md.options, {})

      const html = this.pipeline.htmlPostprocessors.reduce(
        (input, postprocessor) => postprocessor.process(input, this.options),
        renderedHtml,
      )

      return { html, tokens: processedTokens }
    } catch (error) {
      console.error(`MARKDOWN_PARSE_ERROR: ${String(error)}`, error)
      throw new Error(
        `MARKDOWN_PARSE_FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error },
      )
    }
  }

  setOptions(options: Partial<MarkdownOptions>): void {
    this.options = {
      ...this.options,
      ...options,
      disabledSyntax: options.disabledSyntax ?? this.options.disabledSyntax,
      localStyleAliases: options.localStyleAliases ?? this.options.localStyleAliases
    }
    this.md = this.createMarkdownIt(this.options)
  }

  private createMarkdownIt(options: MarkdownOptions): MarkdownIt {
    const parser = new MarkdownIt({
      html: options.html,
      breaks: options.enterStyle === 'lineBreak',
      linkify: options.linkify,
      typographer: options.typographer
    })
    const disabledSyntax = Array.isArray(options.disabledSyntax) ? options.disabledSyntax : []

    for (const plugin of this.pipeline.mdPlugins) {
      parser.use(plugin, options)
    }

    if (disabledSyntax.includes('codeBlock')) {
      parser.disable(['fence', 'code'])
    }
    if (disabledSyntax.includes('blockquote')) {
      parser.disable('blockquote')
    }
    if (disabledSyntax.includes('horizontalRule')) {
      parser.disable('hr')
    }

    return parser
  }
}
