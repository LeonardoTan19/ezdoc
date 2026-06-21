import { useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { TextWrapIcon } from "@hugeicons/core-free-icons"
import type { CodeMirrorHandle } from "../CodeMirrorReact"

interface LineWrapToggleProps {
  editorRef: React.RefObject<CodeMirrorHandle | null>
}

export function LineWrapToggle({ editorRef }: LineWrapToggleProps) {
  const { t } = useTranslation()
  const [isWrapped, setIsWrapped] = useState(true)

  const handleToggle = useCallback(() => {
    editorRef.current?.toggleLineWrap()
    setIsWrapped(editorRef.current?.getLineWrap() ?? true)
  }, [editorRef])

  return (
    <Button
      variant={isWrapped ? "ghost" : "secondary"}
      size="sm"
      title={t("toolbar.toggleLineWrap")}
      aria-label={t("toolbar.toggleLineWrap")}
      onClick={handleToggle}
    >
      <HugeiconsIcon icon={TextWrapIcon} />
    </Button>
  )
}

export default LineWrapToggle
