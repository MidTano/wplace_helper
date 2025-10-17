import Toast from './Toast.svelte'

export function showToast(message: string, duration = 3000) {
  try {
    const t = new Toast({ target: document.body, props: { message, duration } })
    return t
  } catch {}
  return null
}
