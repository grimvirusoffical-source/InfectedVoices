export {}

declare global {
  interface Window {
    ivNative?: {
      serverOrigin?: string
      platform?: string
      nativeVersion?: string
      saveFile?: (name: string, bytes: ArrayBuffer) => Promise<unknown>
      openExternal?: (url: string) => Promise<unknown>
    }
    ivDesktop?: {
      version?: string
      platform?: string
      checkUpdates?: () => Promise<{
        ready?: boolean
        signedChannel?: string
        message?: string
        storeManaged?: boolean
      }>
      checkForUpdates?: () => Promise<{ message?: string }>
    }
    ivOpenNativeUpdates?: () => Promise<void> | void
    Capacitor?: {
      isNativePlatform?: () => boolean
      getPlatform?: () => string
    }
  }
}
