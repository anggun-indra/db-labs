import * as monaco from 'monaco-editor'
// monaco-editor 0.5x exposes subpaths via its exports map: "./*" -> "./esm/vs/*.js"
import editorWorker from 'monaco-editor/editor/editor.worker?worker'
import { loader } from '@monaco-editor/react'
import { registerSqlCompletionProvider } from './sqlAutocomplete'
import { useProjectDbStore } from '@/stores/projectDbStore'

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

// Register schema-aware SQL autocomplete backed by active project database schema
registerSqlCompletionProvider(monaco, () => useProjectDbStore.getState().schema)

export { monaco }
