import { useTranslation } from "react-i18next"
import { useDocStore } from "@/stores/doc-store"

export function StatusBar() {
  const { t } = useTranslation()
  const wordCount = useDocStore((state) => state.getWordCount())
  const charCount = useDocStore((state) => state.getCharCount())

  return (
    <div
      className="status-bar flex items-center gap-2 border-t px-3 py-1"
      role="status"
      aria-label={t("toolbar.statsAria")}
    >
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {t("toolbar.wordCount", { count: wordCount })}
        {" · "}
        {t("toolbar.charCount", { count: charCount })}
      </span>
    </div>
  )
}

export default StatusBar
