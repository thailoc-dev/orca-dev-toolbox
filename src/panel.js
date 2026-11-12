// The panel shell: a home screen that searches tools or recognises a pasted value, and one view
// per tool. Tools are built on first use and kept, so their inputs survive switching back and forth.
import { detect } from './detect.js'
import { GROUPS, searchTools, TOOLS } from './registry.js'
import { icon } from './icons.js'
import { load, save } from './store.js'
import { h, set } from './ui.js'

const RECENT_LIMIT = 3
// What a pasted value is, where the tool's title does not say it.
const LOOKS_LIKE = { jwt: 'a JWT', time: 'a timestamp', ids: 'a UUID', json: 'JSON', url: 'a URL', cron: 'a cron schedule', base64: 'Base64', color: 'a colour', number: 'a number', chmod: 'a file mode', escape: 'escaped text', curl: 'a curl command', cidr: 'an IP address', yaml: 'YAML', csv: 'CSV', sql: 'SQL', xml: 'XML', units: 'a size or duration', chars: 'hidden characters', cert: 'a certificate', bcrypt: 'a bcrypt hash', image: 'a data URI', cssunits: 'a CSS length', docker: 'a docker run command', sshkey: 'an SSH public key', totp: 'a 2FA secret URI', env: 'environment variables', semver: 'a version', useragent: 'a User-Agent', ports: 'a port', ansi: 'terminal output with colour codes', toml: 'TOML' }
const byId = new Map(TOOLS.map((tool) => [tool.id, tool]))
const built = new Map()

let recent = []
let pinned = []
let current = null

const search = h('input', {
  type: 'search', id: 'search', class: 'search', placeholder: 'Search tools or paste a value…',
  spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Search tools or paste a value', 'aria-controls': 'tool-list'
})
const suggestion = h('div', { class: 'suggestion', hidden: true })
const list = h('div', { id: 'tool-list', class: 'tool-list' })
const home = h('div', { class: 'home' }, h('div', { class: 'search-wrap' }, search), suggestion, list)
const back = h('button', { type: 'button', class: 'back', 'aria-label': 'All tools', title: 'All tools (Esc)' }, '‹')
const title = h('h1', { class: 'title' })
const subtitle = h('p', { class: 'subtitle' })
const headerTile = h('span', { class: 'tile-slot' })
const pin = h('button', { type: 'button', class: 'pin', 'aria-pressed': 'false' }, icon('star'))
const header = h('header', { class: 'tool-header', hidden: true }, back, headerTile, h('div', { class: 'heading' }, title, subtitle), pin)

function showPin() {
  const on = pinned.includes(current)
  pin.setAttribute('aria-pressed', String(on))
  pin.title = on ? 'Unpin from the top of the list' : 'Pin to the top of the list'
  pin.setAttribute('aria-label', pin.title)
}
const views = h('main', { class: 'views' })
document.getElementById('app').append(header, home, views)

/** The tool's icon on a tile tinted with its colour. */
function tile(tool, size = '') {
  const node = icon(tool.icon, `tile ${size}`)
  node.style.setProperty('--tone', tool.color)
  return node
}

function toolButton(tool) {
  return h('button', { type: 'button', class: 'tool-item', 'data-tool': tool.id, onclick: () => open(tool.id) },
    tile(tool),
    h('span', { class: 'tool-text' },
      h('span', { class: 'tool-name' }, tool.title),
      h('span', { class: 'tool-desc' }, tool.description)))
}

function section(name, tools) {
  return tools.length ? h('section', { class: 'group', 'aria-label': name }, h('h2', {}, name), tools.map(toolButton)) : null
}

function renderList() {
  const query = search.value.trim()
  const detected = detect(search.value)
  suggestion.hidden = !detected
  if (detected) {
    const tool = byId.get(detected)
    set(suggestion,
      h('button', { type: 'button', class: 'suggest', onclick: () => open(detected, search.value.trim()) },
        tile(tool),
        h('span', { class: 'tool-text' },
          h('span', { class: 'suggest-label' }, 'Looks like ', h('strong', {}, LOOKS_LIKE[detected] ?? tool.title)),
          h('span', { class: 'suggest-action' }, `Open in ${tool.title} ↵`))))
  }
  if (query && !detected) {
    const found = searchTools(query)
    set(list, found.length ? section('Results', found) : h('p', { class: 'empty' }, `No tool matches “${query}”.`))
    return
  }
  const unpinnedRecent = recent.filter((id) => !pinned.includes(id))
  set(list,
    !query && pinned.length ? section('Pinned', pinned.map((id) => byId.get(id))) : null,
    !query && unpinnedRecent.length ? section('Recent', unpinnedRecent.map((id) => byId.get(id))) : null,
    GROUPS.map((group) => section(group, TOOLS.filter((tool) => tool.group === group))))
}

// Retained views keep their input, but only the displayed tool should run live work.
function activateViews() {
  for (const [id, { view }] of built) view.setActive?.(home.hidden && current === id && !document.hidden)
}

function open(id, value) {
  const tool = byId.get(id)
  if (!built.has(id)) {
    const view = tool.create()
    const node = h('section', { class: 'view', 'data-view': id, 'aria-label': tool.title }, view.node)
    views.append(node)
    built.set(id, { node, view })
  }
  const { view } = built.get(id)
  for (const [other, entry] of built) entry.node.hidden = other !== id
  if (value !== undefined) view.fill?.(value)
  set(headerTile, tile(tool, 'large'))
  title.textContent = tool.title
  subtitle.textContent = tool.description
  current = id
  showPin()
  header.hidden = false
  home.hidden = true
  views.hidden = false
  activateViews()
  recent = [id, ...recent.filter((other) => other !== id)].slice(0, RECENT_LIMIT)
  save('recent', recent)
  save('last', id)
  view.focus?.focus()
}

function goHome() {
  header.hidden = true
  views.hidden = true
  home.hidden = false
  activateViews()
  search.value = ''
  renderList()
  search.focus()
  save('last', null)
}

search.addEventListener('input', renderList)
search.addEventListener('paste', (event) => {
  const value = event.clipboardData?.getData('text') ?? ''
  const id = detect(value)
  if (!id) return
  event.preventDefault()
  open(id, value.trim())
})
search.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    // The tool takes focus during this keydown; without this, the Enter lands in its input.
    event.preventDefault()
    const detected = detect(search.value)
    if (detected) return open(detected, search.value.trim())
    const first = list.querySelector('.tool-item')
    if (first) open(first.dataset.tool)
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    list.querySelector('.tool-item')?.focus()
  } else if (event.key === 'Escape') {
    search.value = ''
    renderList()
  }
})
list.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const items = [...list.querySelectorAll('.tool-item')]
  const index = items.indexOf(document.activeElement)
  if (index === -1) return
  event.preventDefault()
  if (event.key === 'ArrowUp' && index === 0) return search.focus()
  items[Math.min(items.length - 1, Math.max(0, index + (event.key === 'ArrowDown' ? 1 : -1)))].focus()
})
back.addEventListener('click', goHome)
document.addEventListener('visibilitychange', activateViews)
pin.addEventListener('click', () => {
  pinned = pinned.includes(current) ? pinned.filter((id) => id !== current) : [...pinned, current]
  save('pinned', pinned)
  showPin()
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !home.hidden) return
  if (event.key === 'Escape') goHome()
})

renderList()
search.focus()

// Saved state arrives after the first paint; a tool the user already opened meanwhile wins.
Promise.all([load('recent'), load('pinned'), load('last')]).then(([savedRecent, savedPinned, last]) => {
  const known = (ids) => (Array.isArray(ids) ? ids.filter((id) => byId.has(id)) : [])
  recent = [...recent, ...known(savedRecent).filter((id) => !recent.includes(id))].slice(0, RECENT_LIMIT)
  pinned = [...pinned, ...known(savedPinned).filter((id) => !pinned.includes(id))]
  if (current) {
    save('recent', recent)
    save('pinned', pinned)
    return showPin()
  }
  if (typeof last === 'string' && byId.has(last) && !search.value) open(last)
  else renderList()
})
