/**
 * Development-only plugin: patch window.open so that popups blocked by the
 * embedded preview browser (e.g. Claude Code preview pane) fall back to
 * same-tab navigation.  Has no effect in production builds.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.dev) { return }

  const _open = window.open.bind(window)

  window.open = function (
    url?: string | URL,
    target?: string,
    features?: string
  ): WindowProxy | null {
    const popup = _open(url, target ?? '_blank', features)

    if (!popup || popup.closed) {
      // Popup was blocked — navigate the current tab instead
      if (url) { window.location.href = url.toString() }
      return null
    }

    // Give focus to the new window immediately (reduces chance of silent block)
    try { popup.focus() } catch (_) {}

    return popup
  }
})
