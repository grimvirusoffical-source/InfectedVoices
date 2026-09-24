import type { Entitlements } from '../lib/entitlements'
import { exportBitDepthLabel } from '../lib/gates'

type Props = {
  entitlements: Entitlements
}

/** Export dialog bit-depth display driven by entitlements.export.maxBitDepth. */
export function ExportBitDepth({ entitlements }: Props) {
  const label = exportBitDepthLabel(entitlements)
  const locked = entitlements.export.maxBitDepth < 24
  return (
    <p className="muted" data-testid="export-bit-depth">
      Export: {label}
      {locked ? ' · Free cap' : ' · Basic+'}
    </p>
  )
}
