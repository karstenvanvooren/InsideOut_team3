// localStorage that never throws (private mode, blocked storage, bad JSON).

export function safeGet(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore: the value just won't persist
  }
}

export function safeRemove(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
