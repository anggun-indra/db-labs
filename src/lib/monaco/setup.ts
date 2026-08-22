import * as monaco from 'monaco-editor'
// monaco-editor 0.5x exposes subpaths via its exports map: "./*" -> "./esm/vs/*.js"
import editorWorker from 'monaco-editor/editor/editor.worker?worker'
import { loader } from '@monaco-editor/react'

/**
 * Bundle Monaco locally instead of the @monaco-editor/react CDN default —
 * the app must work offline (PWA, spec §27). SQL is a basic language
 * (Monarch tokenizer), so only the generic editor worker is needed.
 */
self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker()
  }
}

loader.config({ monaco })

export { monaco }
