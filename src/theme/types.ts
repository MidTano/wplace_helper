export type ThemeNeutrals = {
  bg: string
  surface: string
  surface2: string
  border: string
  text: string
  muted: string
}

export type ThemeStatuses = {
  success: string
  onSuccess: string
  warning: string
  onWarning: string
  error: string
  onError: string
}

export type ThemeTokens = {
  primary: string
  primary2: string
  onPrimary: string
  primaryGlow: string
  focusRing: string
  bg: string
  surface: string
  surface2: string
  border: string
  text: string
  muted: string
  success: string
  onSuccess: string
  warning: string
  onWarning: string
  error: string
  onError: string
}

export type ThemePreset = {
  name: string
  primary: string
  neutrals?: Partial<ThemeNeutrals>
  statuses?: Partial<ThemeStatuses>
}
