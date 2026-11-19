import { diffJson, preview } from '../tools/jsondiff.js'
import { checkbox, copyButton, errorText, field, h, hint, input, set, textarea } from '../ui.js'

const LABELS = { added: 'Added', removed: 'Removed', changed: 'Changed', type: 'Type changed' }
const SIGNS = { added: '+', removed: '−', changed: '~', type: '~' }
const PAGE_SIZE = 200

function changeRow(change) {
  const { kind, path, from, to } = change
  const oldValue = kind === 'added' ? null : h('code', { class: 'change-old' }, preview(from))
  const newValue = kind === 'removed' ? null : h('code', { class: 'change-new' }, preview(to))
  return h('div', { class: `change ${kind}` },
    h('span', { class: 'change-sign', 'aria-label': LABELS[kind] }, SIGNS[kind]),
    h('span', { class: 'change-body' },
      h('code', { class: 'change-path' }, path),
      oldValue && newValue ? h('span', {}, oldValue, ' → ', newValue) : oldValue ?? newValue))
}

function changeReport(changes) {
  return changes.map(({ kind, path, from, to }) => {
    const values = kind === 'added' ? [to] : kind === 'removed' ? [from] : [from, to]
    return `${SIGNS[kind]} ${path}: ${values.map((value) => preview(value, 200)).join(' → ')}`
  }).join('\n')
}

function renderChanges(result, changes) {
  const counts = new Map()
  for (const { kind } of changes) counts.set(kind, (counts.get(kind) ?? 0) + 1)
  const summary = Array.from(counts, ([kind, count]) => `${count} ${LABELS[kind].toLowerCase()}`).join(' · ')
  const header = h('div', { class: 'block-head plain' }, h('span', {}, summary),
    copyButton(() => changeReport(changes), 'Copy the changes'))
  const body = h('div', { class: 'changes' })
  if (changes.length <= PAGE_SIZE) {
    set(body, changes.map(changeRow))
    return set(result, header, body)
  }

  let start = 0
  const status = h('span', { 'aria-live': 'polite' })
  const previous = h('button', { type: 'button', class: 'secondary', onclick: () => {
    start -= PAGE_SIZE
    renderPage(next)
  } }, 'Previous')
  const next = h('button', { type: 'button', class: 'secondary', onclick: () => {
    start += PAGE_SIZE
    renderPage(previous)
  } }, 'Next')
  function renderPage(fallbackFocus) {
    const end = Math.min(start + PAGE_SIZE, changes.length)
    const focused = document.activeElement
    previous.disabled = start === 0
    next.disabled = end === changes.length
    status.textContent = `${start + 1}–${end} of ${changes.length}`
    set(body, changes.slice(start, end).map(changeRow))
    if ((focused === previous || focused === next) && focused.disabled) fallbackFocus?.focus()
  }
  renderPage()
  set(result, header, h('nav', { class: 'block-head plain', 'aria-label': 'Diff pages' }, previous, status, next), body)
}

export default {
  id: 'jsondiff',
  title: 'JSON Diff',
  group: 'Format',
  icon: 'compare',
  color: '#0891b2',
  description: 'What changed between two JSON documents, by path, whatever the key order',
  keywords: ['json', 'diff', 'compare', 'api', 'response', 'payload', 'snapshot', 'qa', 'qc', 'test', 'regression', 'deep equal', 'changes'],
  create() {
    const left = textarea({ rows: 6, placeholder: '{"id": 1, "status": "active", "tags": ["a", "b"]}', 'aria-label': 'Left JSON' })
    const right = textarea({ rows: 6, placeholder: '{"status": "inactive", "id": 1, "tags": ["a"]}', 'aria-label': 'Right JSON' })
    const ignore = input({ class: 'mono', placeholder: 'updatedAt, requestId', 'aria-label': 'Keys to ignore' })
    const unordered = checkbox('Arrays in any order', () => update())
    const result = h('div', { class: 'result' })
    function update() {
      if (!left.value.trim() || !right.value.trim()) return set(result, hint('Paste two JSON documents, such as one API response from staging and one from production. Key order never counts.'))
      try {
        const keys = ignore.value.split(/[\s,]+/).filter(Boolean)
        const changes = diffJson(left.value, right.value, { unordered: unordered.get(), ignore: keys })
        if (!changes.length) {
          return set(result, h('p', { class: 'sentence ok-text' }, 'Same data.'), keys.length ? hint(`Ignoring ${keys.join(', ')}.`) : null)
        }
        renderChanges(result, changes)
      } catch (error) {
        set(result, errorText(error.message))
      }
    }
    for (const control of [left, right, ignore]) control.addEventListener('input', update)
    update()
    return {
      node: h('div', {}, field('Left (before)', left), field('Right (after)', right), field('Ignore keys', ignore), unordered.node, result),
      focus: left,
      fill(value) {
        left.value = value
        update()
      }
    }
  }
}
