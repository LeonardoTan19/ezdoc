import { useEffect, useRef, useState, useCallback } from 'react'
import { usePaginator } from '@/hooks/use-paginator'
import { getPaginationText, getPaginationInlineStyle } from '@/hooks/use-pagination-display'
import { useRuleStore } from '@/stores/rule-store'

interface A4PaperProps {
  html: string
}

export function A4Paper({ html }: A4PaperProps) {
  const ruleStore = useRuleStore()
  const { pages, pageMetas, paginate, measureRef } = usePaginator()
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const drag = useRef({ active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 })

  const updateScale = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const sheet = stage.querySelector('.paper-sheet') as HTMLElement | null
    if (!sheet) return
    const available = stage.clientWidth - 48
    const paperWidth = sheet.offsetWidth
    if (available <= 0 || paperWidth <= 0) { setScale(1); return }
    const next = Math.min(1, available / paperWidth)
    setScale(Number.isFinite(next) ? Math.max(next, 0.45) : 1)
  }, [])

  useEffect(() => {
    paginate(html)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, ruleStore.compiledRule, ruleStore.currentRule?.pagination])

  useEffect(() => {
    const onResize = () => updateScale()
    const observer = new ResizeObserver(() => updateScale())
    if (stageRef.current) observer.observe(stageRef.current)
    window.addEventListener('resize', onResize)
    updateScale()
    return () => {
      window.removeEventListener('resize', onResize)
      observer.disconnect()
    }
  }, [updateScale])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    const stage = stageRef.current
    if (!stage) return
    drag.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: stage.scrollLeft,
      startTop: stage.scrollTop,
    }
    stage.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return
    const stage = stageRef.current
    if (!stage) return
    stage.scrollLeft = drag.current.startLeft - (e.clientX - drag.current.startX)
    stage.scrollTop = drag.current.startTop - (e.clientY - drag.current.startY)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    drag.current.active = false
    stageRef.current?.releasePointerCapture(e.pointerId)
  }

  return (
    <>
      <div
        ref={stageRef}
        className="paper-stage h-full overflow-auto bg-neutral-200 p-6 dark:bg-neutral-900"
        style={{ '--preview-scale': scale } as React.CSSProperties}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="paper-stack flex flex-col items-center gap-6">
          {pages.map((pageHtml, idx) => {
            const meta = pageMetas[idx]
            const paginationEnabled = ruleStore.currentRule?.pagination?.enabled === true
            return (
              <article
                key={idx}
                data-page-index={idx + 1}
                className="paper-sheet preview-content w-[210mm] bg-white shadow-lg dark:shadow-neutral-950"
              >
                <div dangerouslySetInnerHTML={{ __html: pageHtml }} />
                {paginationEnabled && meta?.pagination && (
                  <div
                    className="paper-pagination absolute"
                    style={getPaginationInlineStyle(meta, idx)}
                  >
                    {getPaginationText(meta)}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>

      <div className="paper-measure fixed left-[-9999px] top-0 opacity-0 pointer-events-none" aria-hidden="true">
        <article className="paper-sheet w-[210mm]">
          <div ref={measureRef} className="preview-content" />
        </article>
      </div>
    </>
  )
}

export default A4Paper
