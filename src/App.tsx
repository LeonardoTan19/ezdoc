import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRuleStore } from '@/stores/rule-store'
import { useDocStore } from '@/stores/doc-store'
import { useStyleInjector } from '@/hooks/use-style-injector'
import { useMarkdown } from '@/hooks/use-markdown'
import { useSplitPane } from '@/hooks/use-split-pane'
import CodeMirrorReact from '@/components/editor/CodeMirrorReact'
import type { CodeMirrorHandle } from '@/components/editor/CodeMirrorReact'
import { A4Paper } from '@/components/preview/A4Paper'
import { Toolbar } from '@/components/editor/Toolbar'
import { StatusBar } from '@/components/editor/StatusBar'

export function App() {
  const { t } = useTranslation()
  const initializeRule = useRuleStore((state) => state.initializeRule)
  const initialContent = useDocStore((state) => state.content)
  const setStoreContent = useDocStore((state) => state.setContent)
  const html = useDocStore((state) => state.html)

  // Initialize rule engine on mount
  useEffect(() => {
    initializeRule()
  }, [initializeRule])

  // Style injection
  useStyleInjector()

  // Markdown parsing (auto watches docStore.content)
  useMarkdown()

  // Split pane
  const { workspaceRef, workspaceStyle, startResize } = useSplitPane({ minPanelWidth: 360 })

  // Editor ref
  const editorRef = useRef<CodeMirrorHandle>(null)

  // Local editor content state (synced to store via effect)
  const [content, setContent] = useState(initialContent || t('app.defaultDocument'))

  // Sync local content to store when it changes
  useEffect(() => {
    setStoreContent(content)
  }, [content, setStoreContent])

  return (
    <div
      ref={workspaceRef}
      className="app-shell flex h-svh flex-col"
      style={workspaceStyle}
    >
      {/* Editor panel */}
      <div className="flex flex-1 overflow-hidden">
        <div
          className="editor-panel flex flex-col overflow-hidden border-r"
          style={{ width: 'var(--editor-width)' }}
        >
          <Toolbar editorRef={editorRef} />
          <CodeMirrorReact
            ref={editorRef}
            value={content}
            onChange={setContent}
          />
          <StatusBar />
        </div>

        {/* Resizer */}
        <div
          className="resizer w-1 cursor-col-resize bg-border hover:bg-primary/50 active:bg-primary"
          onPointerDown={startResize}
        />

        {/* Preview panel */}
        <div className="preview-panel flex-1 overflow-hidden">
          <A4Paper html={html} />
        </div>
      </div>
    </div>
  )
}

export default App
