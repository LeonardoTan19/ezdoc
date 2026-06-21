import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useDocStore } from "@/stores/doc-store"
import { useFileSystem } from "@/hooks/use-file-system"
import type { CodeMirrorHandle } from "./CodeMirrorReact"
import { FormatButtons } from "./toolbar/FormatButtons"
import { LineWrapToggle } from "./toolbar/LineWrapToggle"

interface ToolbarProps {
  editorRef: React.RefObject<CodeMirrorHandle | null>
}

export function Toolbar({ editorRef }: ToolbarProps) {
  const { t } = useTranslation()
  const wordCount = useDocStore((state) => state.getWordCount())
  const charCount = useDocStore((state) => state.getCharCount())
  const { importFile, exportMarkdown, exportHtml } = useFileSystem()

  const handleImport = async () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".md,.markdown"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        await importFile(file)
      } catch (err) {
        console.error("Import failed:", err)
      }
    }
    input.click()
  }

  return (
    <div
      className="toolbar flex items-center gap-2 border-b px-3 py-1.5"
      role="toolbar"
      aria-label={t("toolbar.aria")}
    >
      {/* Undo / Redo */}
      <Button
        variant="ghost"
        size="sm"
        title={t("toolbar.undoTitle")}
        aria-label={t("toolbar.undoTitle")}
        onClick={() => editorRef.current?.undo()}
      >
        ↶
      </Button>
      <Button
        variant="ghost"
        size="sm"
        title={t("toolbar.redoTitle")}
        aria-label={t("toolbar.redoTitle")}
        onClick={() => editorRef.current?.redo()}
      >
        ↷
      </Button>

      <span className="mx-1 h-4 w-px bg-border" />

      {/* Format buttons */}
      <FormatButtons editorRef={editorRef} />

      <span className="mx-1 h-4 w-px bg-border" />

      {/* File operations */}
      <Button variant="ghost" size="sm" onClick={handleImport}>
        {t("toolbar.import")}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => exportMarkdown()}>
        {t("toolbar.exportMarkdown")}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => exportHtml()}>
        {t("toolbar.exportHtml")}
      </Button>

      {/* Right side: stats + line-wrap toggle */}
      <div className="ml-auto flex items-center gap-2">
        <LineWrapToggle editorRef={editorRef} />
        <span className="text-xs text-muted-foreground">
          {t("toolbar.wordCount", { count: wordCount })}
          {" · "}
          {t("toolbar.charCount", { count: charCount })}
        </span>
      </div>
    </div>
  )
}

export default Toolbar
