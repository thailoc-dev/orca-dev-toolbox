import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { base32Decode, totp } from '../src/tools/totp.js'
import { launch, openPanel, paste } from './harness.mjs'

const SECRET = 'JBSWY3DPEHPK3PXP'
let browser
before(async () => (browser = await launch()))
after(async () => browser?.close())

test('TOTP stops hidden work and refreshes current codes immediately on return', async () => {
  const { page, frame, errors } = await openPanel(browser)
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })
  // Count interval callbacks at the browser seam, alongside actual output mutations.
  await frame.evaluate(() => {
    window.otpTicks = 0
    const original = window.setInterval
    window.setInterval = (callback, delay, ...args) => original(() => {
      window.otpTicks++
      callback(...args)
    }, delay)
  })
  await paste(frame, '#search', `otpauth://totp/Test:me?secret=${SECRET}`)
  const view = frame.locator('[data-view="totp"]')
  const result = view.locator('.result')
  await view.waitFor()
  await frame.evaluate(() => {
    window.otpMutations = 0
    new MutationObserver((records) => { window.otpMutations += records.length }).observe(
      document.querySelector('[data-view="totp"] .result'), { childList: true, subtree: true, characterData: true })
  })
  async function counts() {
    return frame.evaluate(() => [window.otpTicks, window.otpMutations])
  }
  async function assertCurrent() {
    const now = await frame.evaluate(() => Date.now())
    const expected = totp(base32Decode(SECRET), { time: now })
    assert.equal((await view.locator('.otp').textContent()).replaceAll(' ', ''), expected.code)
    assert.equal(await view.locator('.otp-time').textContent(), `${expected.remaining}s`)
    assert.equal(await view.locator('.row-value').nth(0).textContent(), expected.next)
    assert.equal(await view.locator('.row-value').nth(1).textContent(), expected.previous)
  }
  async function reopen() {
    await frame.locator('#search').fill('totp')
    await frame.locator('.tool-item[data-tool="totp"]').click()
    assert.equal(await view.locator('input').inputValue(), `otpauth://totp/Test:me?secret=${SECRET}`)
    await assertCurrent()
  }

  await assertCurrent()
  await page.clock.runFor(1000)
  assert.equal((await counts())[0], 1)
  await assertCurrent()
  // Home and another tool must stop both callbacks and DOM changes across a period boundary.
  await frame.locator('.back').click()
  const homeCounts = await counts()
  const homeOutput = await result.textContent()
  await page.clock.runFor(31_000)
  assert.deepEqual(await counts(), homeCounts)
  assert.equal(await result.textContent(), homeOutput)
  await frame.locator('#search').fill('ports')
  await frame.locator('.tool-item[data-tool="ports"]').click()
  await page.clock.runFor(31_000)
  assert.deepEqual(await counts(), homeCounts)
  await frame.locator('.back').click()
  await reopen()
  await page.clock.runFor(1000)
  assert.equal((await counts())[0], homeCounts[0] + 1)
  await assertCurrent()

  // Simulate the document visibility signal used by the panel host.
  await frame.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const hiddenCounts = await counts()
  await page.clock.runFor(61_000)
  assert.deepEqual(await counts(), hiddenCounts)
  await frame.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await assertCurrent()
  // Duplicate activation signals must not add timers.
  await frame.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await page.clock.runFor(1000)
  assert.equal((await counts())[0], hiddenCounts[0] + 1)
  await assertCurrent()
  assert.deepEqual(errors, [])
  await page.close()
})

test('invalid and cleared TOTP secrets stay stopped across navigation', async () => {
  const { page, frame, errors } = await openPanel(browser)
  await page.clock.install()
  await paste(frame, '#search', `otpauth://totp/Test:me?secret=${SECRET}`)
  const view = frame.locator('[data-view="totp"]')
  for (const value of ['!', `otpauth://totp/Test?secret=${SECRET}&algorithm=INVALID`, '']) {
    await view.locator('input').fill(value)
    const output = await view.locator('.result').textContent()
    await frame.locator('.back').click()
    await page.clock.runFor(31_000)
    await frame.locator('#search').fill('totp')
    await frame.locator('.tool-item[data-tool="totp"]').click()
    await page.clock.runFor(1000)
    assert.equal(await view.locator('.result').textContent(), output)
  }
  // Recover after invalid and empty values with a fresh, ticking code.
  await view.locator('select[aria-label="Algorithm"]').selectOption('SHA1')
  await view.locator('input').fill(SECRET)
  assert.match(await view.locator('.otp').textContent(), /^\d{3} \d{3}$/)
  const remaining = await view.locator('.otp-time').textContent()
  await page.clock.runFor(1000)
  assert.notEqual(await view.locator('.otp-time').textContent(), remaining)
  assert.deepEqual(errors, [])
  await page.close()
})
