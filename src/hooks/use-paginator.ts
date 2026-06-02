import { useState, useRef, useCallback, useMemo } from 'react'
import type { PaginationConfig } from '@/engine/schema'
import { getPageContentHeightPx } from '@/engine/utils/page-metrics-utils'
import {
  collectBlocks,
  DEFAULT_LOCAL_STYLE_CONTAINER_CLASS_NAME,
  DEFAULT_STYLE_WRAPPER_TAG_NAMES,
} from '@/lib/pagination-block-utils'
import { useRuleStore } from '@/stores/rule-store'

export interface PageRenderMeta {
  globalPage: number
  globalTotal: number
  pagination: PaginationConfig | null
}

interface UsePaginatorOptions {
  overflowTolerancePx?: number
  maxSplitIterations?: number
  styleWrapperTagNames?: ReadonlySet<string>
  localStyleContainerClassName?: string
}

interface ResolvedPaginatorOptions {
  overflowTolerancePx: number
  maxSplitIterations: number
  styleWrapperTagNames: ReadonlySet<string>
  localStyleContainerClassName: string
}

const DEFAULT_OPTIONS: ResolvedPaginatorOptions = {
  overflowTolerancePx: 0.35,
  maxSplitIterations: 2000,
  styleWrapperTagNames: DEFAULT_STYLE_WRAPPER_TAG_NAMES,
  localStyleContainerClassName: DEFAULT_LOCAL_STYLE_CONTAINER_CLASS_NAME,
}

const DEFAULT_PAGE_CONFIG = {
  size: 'A4' as const,
  orientation: 'portrait' as const,
  margins: { top: '37mm', right: '26mm', bottom: '35mm', left: '28mm' },
}

function isOverflowing(el: HTMLElement, tolerance: number): boolean {
  const scrollOverflow = el.scrollHeight - el.clientHeight
  if (scrollOverflow > tolerance) return true
  const lastElement = el.lastElementChild as HTMLElement | null
  if (!lastElement) return false
  const containerRect = el.getBoundingClientRect()
  const lastRect = lastElement.getBoundingClientRect()
  if (containerRect.height <= 0 || lastRect.height <= 0) return false
  const computed = window.getComputedStyle(lastElement)
  const marginBottom = Number.parseFloat(computed.marginBottom || '0')
  const contentBottom = lastRect.bottom + (Number.isFinite(marginBottom) ? marginBottom : 0)
  return contentBottom - containerRect.bottom > tolerance
}

function canFitInEmptyPage(html: string, measure: HTMLElement, tolerance: number): boolean {
  measure.innerHTML = html
  return !isOverflowing(measure, tolerance)
}

function isH1Block(block: string): boolean {
  return /<h1(\s|>)/.test(block)
}

function buildElementHtmlWithChildRange(
  element: Element,
  childNodes: ChildNode[],
  start: number,
  end: number,
): string {
  const cloned = element.cloneNode(false) as Element
  for (let i = start; i < end; i++) {
    const child = childNodes[i]
    if (child) cloned.appendChild(child.cloneNode(true))
  }
  return cloned.outerHTML
}

function trySplitElementByChildNodes(
  element: Element,
  measure: HTMLElement,
  tolerance: number,
): { fittingHtml: string; remainingHtml: string } | null {
  const childNodes = Array.from(element.childNodes)
  if (childNodes.length < 2) return null
  let low = 1
  let high = childNodes.length - 1
  let best = 0
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const candidate = buildElementHtmlWithChildRange(element, childNodes, 0, mid)
    if (canFitInEmptyPage(candidate, measure, tolerance)) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  if (best <= 0 || best >= childNodes.length) return null
  const fittingHtml = buildElementHtmlWithChildRange(element, childNodes, 0, best)
  const remainingHtml = buildElementHtmlWithChildRange(element, childNodes, best, childNodes.length)
  if (!fittingHtml || !remainingHtml) return null
  return { fittingHtml, remainingHtml }
}

function trySplitElementByTextContent(
  element: Element,
  measure: HTMLElement,
  tolerance: number,
): { fittingHtml: string; remainingHtml: string } | null {
  const text = element.textContent ?? ''
  const chars = Array.from(text)
  if (chars.length < 2) return null
  let low = 1
  let high = chars.length - 1
  let best = 0
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const fittingEl = element.cloneNode(false) as Element
    fittingEl.textContent = chars.slice(0, mid).join('')
    if (canFitInEmptyPage(fittingEl.outerHTML, measure, tolerance)) {
      best = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  if (best <= 0 || best >= chars.length) return null
  const fittingEl = element.cloneNode(false) as Element
  fittingEl.textContent = chars.slice(0, best).join('')
  const remainingEl = element.cloneNode(false) as Element
  remainingEl.textContent = chars.slice(best).join('')
  remainingEl.setAttribute('data-split-from', 'text-content')
  ;(remainingEl as HTMLElement).style.setProperty('text-indent', '0')
  return { fittingHtml: fittingEl.outerHTML, remainingHtml: remainingEl.outerHTML }
}

function trySplitOversizedBlock(
  block: string,
  measure: HTMLElement,
  tolerance: number,
): { fittingHtml: string; remainingHtml: string } | null {
  const container = document.createElement('div')
  container.innerHTML = block
  const element = container.firstElementChild
  if (!element) return null
  if (element.tagName.toUpperCase() === 'H1') return null
  const childSplit = trySplitElementByChildNodes(element, measure, tolerance)
  if (childSplit) return childSplit
  return trySplitElementByTextContent(element, measure, tolerance)
}

function paginateBlocks(
  blocks: string[],
  measure: HTMLElement,
  options: ResolvedPaginatorOptions,
): string[] {
  const result: string[] = []
  let currentPageHtml = ''
  const pending = [...blocks]
  let splitIterations = 0

  const pushPage = () => {
    if (currentPageHtml.length > 0) {
      result.push(currentPageHtml)
      currentPageHtml = ''
    }
  }

  while (pending.length > 0) {
    splitIterations++
    if (splitIterations > options.maxSplitIterations) {
      throw new Error(`Pagination exceeded max iterations: ${options.maxSplitIterations}`)
    }
    const block = pending.shift()!
    if (isH1Block(block) && currentPageHtml.length > 0) pushPage()

    const candidate = `${currentPageHtml}${block}`
    measure.innerHTML = candidate
    if (!isOverflowing(measure, options.overflowTolerancePx)) {
      currentPageHtml = candidate
      continue
    }
    if (currentPageHtml.length > 0) {
      pushPage()
      pending.unshift(block)
      measure.innerHTML = ''
      continue
    }
    const split = trySplitOversizedBlock(block, measure, options.overflowTolerancePx)
    if (split) {
      currentPageHtml = split.fittingHtml
      pushPage()
      pending.unshift(split.remainingHtml)
      measure.innerHTML = ''
      continue
    }
    currentPageHtml = block
    pushPage()
    measure.innerHTML = ''
  }
  pushPage()
  return result
}

function buildPageMetas(
  pageCount: number,
  pagination: PaginationConfig | undefined,
): PageRenderMeta[] {
  const resolved = pagination?.enabled ? pagination : null
  return Array.from({ length: pageCount }, (_, i) => ({
    globalPage: i + 1,
    globalTotal: pageCount,
    pagination: resolved,
  }))
}

export function usePaginator(options: UsePaginatorOptions = {}) {
  const {
    overflowTolerancePx = DEFAULT_OPTIONS.overflowTolerancePx,
    maxSplitIterations = DEFAULT_OPTIONS.maxSplitIterations,
    styleWrapperTagNames = DEFAULT_OPTIONS.styleWrapperTagNames,
    localStyleContainerClassName = DEFAULT_OPTIONS.localStyleContainerClassName,
  } = options
  const resolved = useMemo<ResolvedPaginatorOptions>(
    () => ({
      overflowTolerancePx,
      maxSplitIterations,
      styleWrapperTagNames,
      localStyleContainerClassName,
    }),
    [overflowTolerancePx, maxSplitIterations, styleWrapperTagNames, localStyleContainerClassName],
  )
  const ruleStore = useRuleStore()
  const [pages, setPages] = useState<string[]>([''])
  const [pageMetas, setPageMetas] = useState<PageRenderMeta[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const measureRef = useRef<HTMLElement | null>(null)

  const getPageHeight = useCallback(() => {
    const pageConfig = ruleStore.currentRule?.page ?? DEFAULT_PAGE_CONFIG
    return getPageContentHeightPx(pageConfig)
  }, [ruleStore.currentRule])

  const goToPage = useCallback(
    (page: number) => {
      const count = pages.length
      const clamped = count > 0 ? Math.min(Math.max(page, 1), count) : 1
      setCurrentPage(clamped)
      const target = document.querySelector(`[data-page-index="${clamped}"]`) as HTMLElement | null
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [pages.length],
  )

  const paginate = useCallback(
    async (html: string) => {
      const measure = measureRef.current
      if (!measure) return
      const pageHeight = getPageHeight()
      measure.style.display = 'flow-root'
      measure.style.overflow = 'hidden'
      measure.style.height = `${pageHeight}px`

      const blocks = collectBlocks(html, {
        styleWrapperTagNames: resolved.styleWrapperTagNames,
        localStyleContainerClassName: resolved.localStyleContainerClassName,
      })
      if (blocks.length === 0) {
        setPages([''])
        setPageMetas([])
        return
      }

      const paginated = paginateBlocks(blocks, measure, resolved)
      const metas = buildPageMetas(paginated.length, ruleStore.currentRule?.pagination)
      setPages(paginated.length > 0 ? paginated : [''])
      setPageMetas(metas)
      setCurrentPage((prev) => Math.min(prev, paginated.length))
      measure.innerHTML = ''
    },
    [getPageHeight, resolved, ruleStore.currentRule],
  )

  return {
    pages,
    pageMetas,
    pageCount: pages.length,
    currentPage,
    measureRef,
    paginate,
    goToPage,
    nextPage: () => goToPage(currentPage + 1),
    previousPage: () => goToPage(currentPage - 1),
  }
}
