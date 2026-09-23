export async function deliverBlob(blob: Blob, filename: string) {
  const native = window.ivNative
  if (native?.saveFile) {
    const bytes = await blob.arrayBuffer()
    await native.saveFile(filename, bytes)
    return 'shared' as const
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded' as const
}
