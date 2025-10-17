export type GifItem = {
  id: string
  url: string
  favorite: boolean
  offsetX: number
  offsetY: number
  width: number | null
  height: number | null
  createdAt: number
}

export type IdleSettings = {
  enabled?: boolean
  idleTimeoutSec: number
  hideDelaySec: number
  gifs: GifItem[]
  lastShownGifId: string | null
}

export type PlacementModeState = {
  active: boolean
  targetGifId: string | null
  tempOffsetX: number
  tempOffsetY: number
  tempWidth: number | null
  tempHeight: number | null
}
