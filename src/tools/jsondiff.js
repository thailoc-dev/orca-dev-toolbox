// Structural JSON diff: what was added, removed or changed between two documents, by path. Key
// order never counts; arrays compare by index, or as unordered sets when asked.

const typeOf = (value) => (value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value)

/** A JSONPath-style path: $.items[0].name, $['odd key']. */
export function pathOf(parts) {
  return parts.reduce((path, part) => {
    if (typeof part === 'number') return `${path}[${part}]`
    return /^[A-Za-z_$][\w$]*$/.test(part) ? `${path}.${part}` : `${path}[${JSON.stringify(part)}]`
  }, '$')
}

// A stable text form for comparing values regardless of key order.
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}

function walk(a, b, parts, changes, options) {
  const ta = typeOf(a)
  const tb = typeOf(b)
  if (ta !== tb) return changes.push({ kind: 'type', path: pathOf(parts), from: a, to: b })
  if (ta === 'object') {
    for (const key of Object.keys(a)) {
      if (!Object.hasOwn(b, key)) changes.push({ kind: 'removed', path: pathOf([...parts, key]), from: a[key] })
      else walk(a[key], b[key], [...parts, key], changes, options)
    }
    for (const key of Object.keys(b)) if (!Object.hasOwn(a, key)) changes.push({ kind: 'added', path: pathOf([...parts, key]), to: b[key] })
    return
  }
  if (ta === 'array') {
    if (options.unordered) {
      // Each element is matched with an equal one on the other side; what is left was removed or added.
      const left = new Map()
      for (const item of a) {
        const key = canonical(item)
        left.set(key, (left.get(key) ?? 0) + 1)
      }
      const added = []
      for (const item of b) {
        const key = canonical(item)
        if (left.get(key)) left.set(key, left.get(key) - 1)
        else added.push(item)
      }
      for (const item of a) {
        const key = canonical(item)
        if (left.get(key)) {
          left.set(key, left.get(key) - 1)
          changes.push({ kind: 'removed', path: `${pathOf(parts)}[*]`, from: item })
        }
      }
      for (const item of added) changes.push({ kind: 'added', path: `${pathOf(parts)}[*]`, to: item })
      return
    }
    const shared = Math.min(a.length, b.length)
    for (let i = 0; i < shared; i++) walk(a[i], b[i], [...parts, i], changes, options)
    for (let i = shared; i < a.length; i++) changes.push({ kind: 'removed', path: pathOf([...parts, i]), from: a[i] })
    for (let i = shared; i < b.length; i++) changes.push({ kind: 'added', path: pathOf([...parts, i]), to: b[i] })
    return
  }
  if (a !== b && !(options.numbers && ta === 'number' && Math.abs(a - b) <= options.numbers)) changes.push({ kind: 'changed', path: pathOf(parts), from: a, to: b })
}

function read(text, side) {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`${side} is not valid JSON: ${error.message}`)
  }
}

/**
 * Changes from the left document to the right one. Options: `unordered` compares arrays as sets,
 * `ignore` lists keys to skip anywhere (such as timestamps or request IDs), `numbers` is a
 * tolerance for numeric differences.
 */
export function diffJson(leftText, rightText, { unordered = false, ignore = [], numbers = 0 } = {}) {
  const skip = new Set(ignore)
  const strip = (value) => {
    if (Array.isArray(value)) return value.map(strip)
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !skip.has(key)).map(([key, item]) => [key, strip(item)]))
    return value
  }
  const changes = []
  const left = read(leftText, 'Left')
  const right = read(rightText, 'Right')
  walk(skip.size ? strip(left) : left, skip.size ? strip(right) : right, [], changes, { unordered, numbers })
  return changes
}

/** Short text for a value in a diff row. */
export function preview(value, limit = 80) {
  const text = JSON.stringify(value)
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}
