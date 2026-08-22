/** Trigger a client-side file download (export flows, spec §7/§21). */
export function downloadBytes(filename: string, bytes: Uint8Array, type: string): void {
  const blob = new Blob([bytes as unknown as ArrayBuffer], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function downloadText(filename: string, text: string, type = 'text/plain'): void {
  downloadBytes(filename, new TextEncoder().encode(text), `${type};charset=utf-8`)
}
