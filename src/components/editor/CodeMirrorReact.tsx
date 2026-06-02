import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { EditorView } from '@codemirror/view'
import { undo, redo, undoDepth, redoDepth } from '@codemirror/commands'
import { createEditorState } from './codemirror/createEditorState'

interface CodeMirrorReactProps {
  value: string
  onChange: (value: string) => void
}

export interface CodeMirrorHandle {
  undo: () => boolean
  redo: () => boolean
  canUndo: () => boolean
  canRedo: () => boolean
}

const CodeMirrorReact = forwardRef<CodeMirrorHandle, CodeMirrorReactProps>(
  function CodeMirrorReact({ value, onChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const onChangeRef = useRef(onChange)

    // Keep onChange ref in sync to avoid stale closures
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
    }, []) // mount only

    // Sync external value changes into editor
    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      const current = view.state.doc.toString()
      if (current !== value) {
        view.dispatch({
          changes: { from: 0, to: current.length, insert: value },
        })
      }
    }, [value])

    return (
      <div
        ref={containerRef}
        className="codemirror-wrapper flex-1 overflow-hidden"
      />
    )
  },
)

export default CodeMirrorReact
