import { useEffect, useRef, useImperativeHandle, forwardRef } from "react"
import { EditorView } from "@codemirror/view"
import { undo, redo, undoDepth, redoDepth } from "@codemirror/commands"
import { createEditorState } from "./core/build-extensions"
import {
  lineWrapCompartment,
  isLineWrapEnabled,
} from "./core/features/line-wrap"
import {
  executeFormat,
  type FormatAction,
} from "./core/features/format-commands"

interface CodeMirrorReactProps {
  value: string
  onChange: (value: string) => void
}

export interface CodeMirrorHandle {
  undo: () => boolean
  redo: () => boolean
  canUndo: () => boolean
  canRedo: () => boolean
  format: (action: FormatAction) => boolean
  toggleLineWrap: () => void
  getLineWrap: () => boolean
}

const CodeMirrorReact = forwardRef<CodeMirrorHandle, CodeMirrorReactProps>(
  function CodeMirrorReact({ value, onChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const onChangeRef = useRef(onChange)

    useEffect(() => {
      onChangeRef.current = onChange
    }, [onChange])

    useImperativeHandle(ref, () => ({
      undo: () => {
        if (!viewRef.current) return false
        return undo(viewRef.current)
      },
      redo: () => {
        if (!viewRef.current) return false
        return redo(viewRef.current)
      },
      canUndo: () => {
        if (!viewRef.current) return false
        return undoDepth(viewRef.current.state) > 0
      },
      canRedo: () => {
        if (!viewRef.current) return false
        return redoDepth(viewRef.current.state) > 0
      },
      format: (action: FormatAction) => {
        if (!viewRef.current) return false
        return executeFormat(viewRef.current, action)
      },
      toggleLineWrap: () => {
        const view = viewRef.current
        if (!view) return
        const currentlyWrapped = isLineWrapEnabled(view.state)
        view.dispatch({
          effects: lineWrapCompartment.reconfigure(
            currentlyWrapped ? [] : EditorView.lineWrapping
          ),
        })
      },
      getLineWrap: () => {
        if (!viewRef.current) return false
        return isLineWrapEnabled(viewRef.current.state)
      },
    }))

    useEffect(() => {
      if (!containerRef.current) return
      const state = createEditorState({
        content: value,
        onChange: (newValue: string) => {
          onChangeRef.current(newValue)
        },
      })
      const view = new EditorView({
        state,
        parent: containerRef.current,
      })
      viewRef.current = view
      return () => {
        view.destroy()
        viewRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      const current = view.state.doc.toString()
      if (current !== value) {
        view.dispatch({
          changes: {
            from: 0,
            to: current.length,
            insert: value,
          },
        })
      }
    }, [value])

    return (
      <div ref={containerRef} className="codemirror-wrapper min-h-0 flex-1" />
    )
  }
)

export default CodeMirrorReact
