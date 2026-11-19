import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, test } from 'node:test'
import { TOOLS } from '../src/registry.js'
import { launch, openPanel, paste } from './harness.mjs'

const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyNDI2MjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

const CERT = readFileSync(new URL('./fixtures/server.pem', import.meta.url), 'utf8')

let browser
before(async () => (browser = await launch()))
after(async () => browser?.close())

test('lists every tool by group in both themes without CSP violations', async () => {
  for (const theme of ['light', 'dark']) {
    const { page, frame, errors } = await openPanel(browser, { theme })
    const names = await frame.locator('.tool-item .tool-name').allTextContents()
    assert.deepEqual(names.sort(), TOOLS.map((tool) => tool.title).sort())
    assert.deepEqual(await frame.locator('.group h2').allTextContents(), ['Inspect', 'Encode', 'Convert', 'Format', 'Generate', 'Text'])
    assert.equal(await frame.evaluate(() => document.activeElement.id), 'search')
    // Every tool shows its own icon tile.
    assert.equal(await frame.locator('.tool-item .tile svg').count(), TOOLS.length)
    // No horizontal scroll at sidebar width.
    assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
    assert.deepEqual(errors, [])
    await page.close()
  }
})

test('pasting a JWT opens the decoder with its claims', async () => {
  const { page, frame, errors } = await openPanel(browser)
  await paste(frame, '#search', JWT)
  await frame.waitForSelector('[data-view="jwt"]:not([hidden])')
  assert.equal(await frame.locator('.title').textContent(), 'JWT Decoder')
  const view = frame.locator('[data-view="jwt"]')
  assert.match(await view.locator('.out').nth(1).textContent(), /"name": "John Doe"/)
  assert.match(await view.locator('.rows').textContent(), /Expires.*expired/s)
  // Esc returns to the list with an empty search.
  await frame.locator('[data-view="jwt"] textarea').first().press('Escape')
  assert.equal(await frame.locator('.home').isVisible(), true)
  assert.equal(await frame.locator('#search').inputValue(), '')
  assert.deepEqual(await frame.locator('.group').first().locator('h2').textContent(), 'Recent')
  assert.deepEqual(errors, [])
  await page.close()
})

test('typing searches tools by keyword and Enter opens the first match', async () => {
  const { page, frame, errors } = await openPanel(browser)
  await frame.locator('#search').fill('sha256')
  assert.deepEqual(await frame.locator('.tool-item .tool-name').allTextContents(), ['Hash & HMAC'])
  await frame.locator('#search').press('Enter')
  const view = frame.locator('[data-view="hash"]')
  // Enter opens the tool without typing a line break into it.
  assert.equal(await view.locator('textarea').inputValue(), '')
  await view.locator('textarea').fill('abc')
  assert.match(await view.locator('.rows').textContent(), /ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad/)
  await view.locator('input[type="text"]').fill('key')
  assert.match(await view.locator('.rows').textContent(), /HMAC-SHA-256/)
  await frame.locator('.back').click()
  await frame.locator('#search').fill('nothing like this')
  assert.match(await frame.locator('.empty').textContent(), /No tool matches/)
  assert.deepEqual(errors, [])
  await page.close()
})

test('typed values offer the matching tool', async () => {
  const { page, frame, errors } = await openPanel(browser)
  await frame.locator('#search').fill('*/15 * * * *')
  assert.match(await frame.locator('.suggest').textContent(), /Open in Cron/)
  await frame.locator('#search').press('Enter')
  const view = frame.locator('[data-view="cron"]')
  assert.equal(await view.locator('.sentence').textContent(), 'Every 15 minutes')
  assert.equal(await view.locator('.row').count(), 5)
  assert.deepEqual(errors, [])
  await page.close()
})

test('every tool opens and produces output without errors', async () => {
  const { page, frame, errors } = await openPanel(browser)
  const inputs = {
    time: ['input', '1730000000', /2024-10-27T03:33:20\.000Z/],
    base64: ['textarea', 'SGVsbG8sIHdvcmxkIQ==', /Hello, world!/],
    url: ['textarea', 'https://example.com/a?x=1&y=two', /two/],
    json: ['textarea', '{"b":1,"a":2}', /"b": 1/],
    regex: ['textarea', 'ann@a.com bob@b.com', null],
    escape: ['textarea', '<b>&</b>', /&lt;b&gt;&amp;&lt;\/b&gt;/],
    color: ['input', 'hsl(217 91% 60%)', /#3c83f6/],
    number: ['input', '0xff', /0b11111111/],
    chmod: ['input', 'rw-r--r--', /chmod 644 file/],
    case: ['textarea', 'userProfileId', /user_profile_id/],
    lines: ['textarea', 'b\na\nb', /b\na3 lines → 2/],
    stats: ['textarea', 'Hello world', /Words\s*2/],
    diff: ['textarea', 'one\ntwo', null],
    yaml: ['textarea', 'a: 1\nb: [x]', /"b": \[\n\s+"x"/],
    csv: ['textarea', 'n,v\nx,1', /"v": 1/],
    types: ['textarea', '{"id": 1, "tags": ["a"]}', /tags: string\[\]/],
    curl: ['textarea', "curl https://x.dev -H 'A: b'", /fetch\("https:\/\/x\.dev"/],
    cidr: ['input', '10.0.0.0/30', /10\.0\.0\.2/],
    http: ['input', '429', /Too Many Requests/],
    qr: ['textarea', 'https://onorca.dev', /modules/],
    transform: ['textarea', 'Xin chào Đà Nẵng', /Xin chao Da Nang/],
    chars: ['textarea', 'a\u200bb', /ZERO WIDTH SPACE/],
    units: ['input', '1.5 GB', /1,500,000,000/],
    xml: ['textarea', '<a><b>1</b></a>', /<a>\n  <b>1<\/b>\n<\/a>/],
    sql: ['textarea', 'select a from t where x = 1 and y = 2', /WHERE x = 1\n  AND y = 2/],
    cert: ['textarea', CERT, /api\.example\.com/],
    jsx: ['textarea', '<div class="a"><br></div>', /<div className="a"><br \/><\/div>/],
    cssunits: ['input', '32px', /2rem/]
  }
  for (const tool of TOOLS) {
    await frame.locator('#search').fill(tool.title)
    await frame.locator(`.tool-item[data-tool="${tool.id}"]`).click()
    const view = frame.locator(`[data-view="${tool.id}"]`)
    await view.waitFor()
    const input = inputs[tool.id]
    if (input) {
      if (tool.id === 'regex') await view.locator('input').first().fill('(\\w+)@')
      if (tool.id === 'base64') await view.getByRole('button', { name: 'Decode' }).click()
      await view.locator(input[0]).first().fill(input[1])
      if (input[2]) assert.match(await view.textContent(), input[2], tool.id)
    }
    if (tool.id === 'regex') assert.match(await view.locator('.subhead').textContent(), /^2 matches/)
    if (tool.id === 'ids') assert.equal((await view.locator('.ids').textContent()).split('\n').length, 5)
    assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, tool.id)
    await frame.locator('.back').click()
  }
  assert.deepEqual(errors, [])
  await page.close()
})

test('new tools: diff marks changed words, chmod grid stays in sync, colours paste', async () => {
  const { page, frame, errors } = await openPanel(browser)
  await frame.locator('#search').fill('text diff')
  await frame.locator('#search').press('Enter')
  const diff = frame.locator('[data-view="diff"]')
  await diff.locator('textarea').nth(0).fill('const answer = 41;\nkeep')
  await diff.locator('textarea').nth(1).fill('const answer = 42;\nkeep\nadded')
  assert.equal(await diff.locator('.block-head').textContent(), '+2 −1Copy')
  assert.equal(await diff.locator('ins').first().textContent(), '42')
  assert.equal(await diff.locator('del').first().textContent(), '41')
  await frame.locator('.back').click()

  await frame.locator('#search').fill('chmod')
  await frame.locator('#search').press('Enter')
  const chmod = frame.locator('[data-view="chmod"]')
  await chmod.getByLabel('Others execute').uncheck()
  assert.equal(await chmod.locator('input.mono').inputValue(), '754')
  assert.match(await chmod.locator('.rows').textContent(), /rwxr-xr--/)
  await frame.locator('.back').click()

  await paste(frame, '#search', '#ff000080')
  const color = frame.locator('[data-view="color"]')
  await color.waitFor()
  assert.match(await color.locator('.rows').first().textContent(), /rgba\(255, 0, 0, 0\.502\)/)
  assert.equal(await frame.locator('.tool-header .tile svg').count(), 1)
  assert.deepEqual(errors, [])
  await page.close()
})

test('JWT verifies and signs; QR renders an image', async () => {
  const { page, frame, errors } = await openPanel(browser)
  await paste(frame, '#search', JWT)
  const jwt = frame.locator('[data-view="jwt"]')
  await jwt.waitFor()
  await jwt.locator('input').first().fill('your-256-bit-secret')
  assert.match(await jwt.locator('.rows').nth(1).textContent(), /invalid/)
  await jwt.getByRole('button', { name: 'Sign', exact: true }).click()
  await jwt.locator('input').nth(1).fill('s3cret')
  assert.match(await jwt.locator('.out').last().textContent(), /^eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJ/)
  await frame.locator('.back').click()
  await frame.locator('#search').fill('qr')
  await frame.locator('#search').press('Enter')
  const qr = frame.locator('[data-view="qr"]')
  await qr.locator('textarea').fill('Xin chào 👋')
  assert.equal(await qr.locator('img.qr').evaluate((img) => img.complete && img.naturalWidth > 0), true)
  assert.deepEqual(errors, [])
  await page.close()
})

test('bcrypt hashes and verifies; a pasted data URI previews; passwords generate', async () => {
  const { page, frame, errors } = await openPanel(browser)
  await frame.locator('#search').fill('bcrypt')
  await frame.locator('#search').press('Enter')
  const bcrypt = frame.locator('[data-view="bcrypt"]')
  await bcrypt.locator('input[type="number"]').fill('4')
  await bcrypt.getByPlaceholder('Password').fill('hunter2')
  await frame.waitForFunction(() => /\$2b\$04\$/.test(document.querySelector('[data-view="bcrypt"] .rows')?.textContent ?? ''))
  const hash = (await bcrypt.locator('.row-value').first().textContent()).trim()
  await bcrypt.getByRole('button', { name: 'Verify', exact: true }).click()
  await bcrypt.getByPlaceholder('$2b$10$…').fill(hash)
  await frame.waitForFunction(() => /matches/.test(document.querySelector('[data-view="bcrypt"] .rows')?.textContent ?? ''))
  await frame.locator('.back').click()

  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  await paste(frame, '#search', png)
  const image = frame.locator('[data-view="image"]')
  await image.locator('img.preview').waitFor()
  assert.match(await image.locator('.hint').first().textContent(), /1×1/)
  await frame.locator('.back').click()

  await frame.locator('#search').fill('password')
  await frame.locator('#search').press('Enter')
  const lines = (await frame.locator('[data-view="password"] .out').textContent()).split('\n')
  assert.equal(lines.length, 5)
  assert.equal(lines[0].length, 20)
  assert.deepEqual(errors, [])
  await page.close()
})

test('copy buttons copy, or fall back without throwing', async () => {
  const { page, frame, errors } = await openPanel(browser)
  await paste(frame, '#search', '{"a":1}')
  const copy = frame.locator('[data-view="json"] .block .copy')
  await copy.click()
  await frame.waitForFunction(() => /Copied|Select/.test(document.querySelector('[data-view="json"] .block .copy').textContent))
  assert.deepEqual(errors, [])
  await page.close()
})

test('docker, env, JSON query and TOTP work end to end', async () => {
  const { page, frame, errors } = await openPanel(browser)
  await paste(frame, '#search', 'docker run -d --name web -p 8080:80 nginx:alpine')
  const docker = frame.locator('[data-view="docker"]')
  assert.match(await docker.locator('.out').textContent(), /services:\n {2}web:\n {4}image: nginx:alpine/)
  await frame.locator('.back').click()

  await paste(frame, '#search', 'API_KEY=abc\nDEBUG=true')
  const env = frame.locator('[data-view="env"]')
  assert.deepEqual(JSON.parse(await env.locator('.out').textContent()), { API_KEY: 'abc', DEBUG: 'true' })
  await env.getByRole('button', { name: 'K8s Secret' }).click()
  assert.match(await env.locator('.out').textContent(), /API_KEY: YWJj/)
  await frame.locator('.back').click()

  await frame.locator('#search').fill('jsonpath')
  await frame.locator('#search').press('Enter')
  const query = frame.locator('[data-view="jsonpath"]')
  await query.locator('textarea').fill('{"items":[{"name":"Pen","price":3},{"name":"Lamp","price":25}]}')
  await query.locator('input[aria-label="JSONPath"]').fill('$.items[?(@.price < 10)].name')
  assert.equal(JSON.parse(await query.locator('.out').textContent()), 'Pen')
  await frame.locator('.back').click()

  await paste(frame, '#search', 'otpauth://totp/Test:me?secret=JBSWY3DPEHPK3PXP')
  const otp = frame.locator('[data-view="totp"]')
  assert.match(await otp.locator('.otp').textContent(), /^\d{3} \d{3}$/)
  assert.deepEqual(errors, [])
  await page.close()
})

test('pinned tools stay at the top of the list', async () => {
  const { page, frame, errors } = await openPanel(browser)
  await frame.locator('#search').fill('ports')
  await frame.locator('#search').press('Enter')
  const pin = frame.locator('.pin')
  assert.equal(await pin.getAttribute('aria-pressed'), 'false')
  await pin.click()
  assert.equal(await pin.getAttribute('aria-pressed'), 'true')
  await frame.locator('.back').click()
  const first = frame.locator('.group').first()
  assert.equal(await first.locator('h2').textContent(), 'Pinned')
  assert.deepEqual(await first.locator('.tool-name').allTextContents(), ['Ports'])
  // A pinned tool is not repeated under Recent.
  assert.equal(await frame.locator('.group', { hasText: 'Recent' }).count(), 0)
  await frame.locator('.group').first().locator('.tool-item').click()
  await pin.click()
  await frame.locator('.back').click()
  assert.equal(await frame.locator('.group').first().locator('h2').textContent(), 'Recent')
  assert.deepEqual(errors, [])
  await page.close()
})

test('pins, recent tools and the open tool are kept in orca.storage', async () => {
  const storage = {}
  const first = await openPanel(browser, { storage })
  await first.frame.locator('#search').fill('ports')
  await first.frame.locator('#search').press('Enter')
  await first.frame.locator('.pin').click()
  await first.frame.locator('.back').click()
  await first.frame.locator('#search').fill('cron')
  await first.frame.locator('#search').press('Enter')
  await first.page.waitForTimeout(50)
  assert.deepEqual([storage.pinned, storage.recent, storage.last], [['ports'], ['cron', 'ports'], 'cron'])
  assert.deepEqual(first.errors, [])
  await first.page.close()
  // Reopening the panel returns to the open tool, and the list keeps the pin.
  const second = await openPanel(browser, { storage })
  await second.frame.waitForSelector('[data-view="cron"]:not([hidden])')
  await second.frame.locator('.back').click()
  assert.deepEqual(await second.frame.locator('.group').first().locator('.tool-name').allTextContents(), ['Ports'])
  assert.deepEqual(await second.frame.locator('.group').nth(1).locator('.tool-name').allTextContents(), ['Cron'])
  assert.deepEqual(second.errors, [])
  await second.page.close()
})


test('terminal output and token counts', async () => {
  const { page, frame, errors } = await openPanel(browser)
  await paste(frame, '#search', '\x1b[32m✓\x1b[0m 12 passed\n\x1b[31m✗\x1b[0m 1 failed')
  const ansi = frame.locator('[data-view="ansi"]')
  await ansi.waitFor()
  assert.equal(await ansi.locator('.out').textContent(), '✓ 12 passed\n✗ 1 failed')
  await ansi.locator('textarea').fill('\x1b[1mbold\x1b[0m   \n\n\n\nend')
  await ansi.locator('.check', { hasText: 'Fold blank lines' }).click()
  assert.equal(await ansi.locator('.out').textContent(), 'bold\n\nend')
  await frame.locator('.back').click()
  await frame.locator('#search').fill('tokens context')
  await frame.locator('#search').press('Enter')
  const tokens = frame.locator('[data-view="tokens"]')
  await tokens.locator('textarea').fill('The quick brown fox jumps over the lazy dog.')
  assert.match(await tokens.locator('.rows').textContent(), /≈ 10/)
  assert.equal(await tokens.locator('.meter').count(), 4)
  assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  assert.deepEqual(errors, [])
  await page.close()
})

test('JSON Diff, TOML and Redact Secrets', async () => {
  const { page, frame, errors } = await openPanel(browser)
  await frame.locator('#search').fill('json diff')
  await frame.locator('#search').press('Enter')
  const diff = frame.locator('[data-view="jsondiff"]')
  await diff.locator('textarea').nth(0).fill('{"id": 1, "status": "active", "updatedAt": 1}')
  await diff.locator('textarea').nth(1).fill('{"status": "inactive", "id": 1, "updatedAt": 2}')
  assert.deepEqual(await diff.locator('.change-path').allTextContents(), ['$.status', '$.updatedAt'])
  await diff.locator('input[aria-label="Keys to ignore"]').fill('updatedAt')
  assert.deepEqual(await diff.locator('.change-path').allTextContents(), ['$.status'])
  await frame.locator('.back').click()

  await paste(frame, '#search', '[package]\nname = "app"\nversion = "0.1.0"')
  const toml = frame.locator('[data-view="toml"]')
  await toml.waitFor()
  assert.deepEqual(JSON.parse(await toml.locator('.out').textContent()), { package: { name: 'app', version: '0.1.0' } })
  await toml.locator('.segmented button[data-value="yaml"]').click()
  assert.equal(await toml.locator('.out').textContent(), 'package:\n  name: app\n  version: 0.1.0\n')
  await frame.locator('.back').click()

  await frame.locator('#search').fill('redact')
  await frame.locator('#search').press('Enter')
  const redact = frame.locator('[data-view="redact"]')
  await redact.locator('textarea').fill('DATABASE_URL=postgres://app:hunter22@db:5432/prod\nAPI_KEY=abc123xyz')
  assert.equal(await redact.locator('.out').textContent(), 'DATABASE_URL=postgres://app:[PASSWORD_1]@db:5432/prod\nAPI_KEY=[SECRET_1]')
  assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  assert.deepEqual(errors, [])
  await page.close()
})

test('JSON Diff pages large results and copies changes across pages', async () => {
  const { page, frame, errors } = await openPanel(browser, { width: 280 })
  await frame.locator('[data-tool="jsondiff"]').click()
  const diff = frame.locator('[data-view="jsondiff"]')
  const changed = Array.from({ length: 401 }, (_, i) => i + 1)
  await diff.locator('textarea').first().fill(JSON.stringify(changed.map(() => 0)))
  await diff.locator('textarea').last().fill(JSON.stringify(changed))
  assert.equal(await diff.locator('.change').count(), 200)
  const nav = diff.getByRole('navigation', { name: 'Diff pages' })
  const previous = nav.getByRole('button', { name: 'Previous' })
  const next = nav.getByRole('button', { name: 'Next' })
  assert.equal(await previous.isDisabled(), true)
  await next.click()
  assert.equal(await diff.locator('.change-path').first().textContent(), '$[200]')
  await next.click()
  assert.deepEqual(await diff.locator('.change-path').allTextContents(), ['$[400]'])
  assert.equal(await next.isDisabled(), true)
  await previous.click()
  assert.equal(await diff.locator('.change-path').first().textContent(), '$[200]')

  await frame.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (text) => { window.copiedText = text } }
    })
  })
  await diff.getByRole('button', { name: 'Copy the changes' }).click()
  const report = await frame.evaluate(() => window.copiedText)
  assert.equal(report.split('\n').length, changed.length)
  assert.match(report, /^~ \$\[0\]: 0 → 1\n/)
  assert.match(report, /~ \$\[400\]: 0 → 401$/)
  assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
  assert.deepEqual(errors, [])
  await page.close()
})

test('JSON Query refreshes cached input after edits, errors and clearing', async () => {
  const { page, frame, errors } = await openPanel(browser)
  await frame.locator('[data-tool="jsonpath"]').click()
  const query = frame.locator('[data-view="jsonpath"]')
  const source = query.locator('textarea')
  const path = query.getByRole('textbox', { name: 'JSONPath' })
  await source.fill('{"before":1,"after":2}')
  await path.fill('$.before')
  assert.equal(await query.locator('.out').textContent(), '1')
  await path.fill('$.after')
  assert.equal(await query.locator('.out').textContent(), '2')
  await source.fill('{')
  assert.match(await query.getByRole('alert').textContent(), /Not valid JSON/)
  await source.fill('{"after":3}')
  assert.equal(await query.locator('.out').textContent(), '3')
  await source.fill('')
  assert.equal(await query.locator('.out').count(), 0)
  assert.deepEqual(errors, [])
  await page.close()
})
