import assert from 'node:assert/strict'
import { test } from 'node:test'

import { jsonToTypes } from '../../src/tools/types.js'

test('JSON to types: optional, nullable, nested and named', () => {
  const sample = '{"id":1,"user_name":"ann","items":[{"sku":"a","qty":1},{"sku":"b","qty":2.5,"note":"x"}],"parent":null,"meta":{"tags":["t"]}}'
  assert.equal(jsonToTypes(sample, 'typescript'), [
    'export interface Root {', '  id: number', '  user_name: string', '  items: Item[]', '  parent: null', '  meta: Meta', '}', '',
    'export interface Item {', '  sku: string', '  qty: number', '  note?: string', '}', '',
    'export interface Meta {', '  tags: string[]', '}'
  ].join('\n'))
  const go = jsonToTypes(sample, 'go')
  assert.match(go, /ID +int64 +`json:"id"`/)
  assert.match(go, /Qty +float64/)
  assert.match(go, /Note +\*string +`json:"note,omitempty"`/)
  assert.match(jsonToTypes(sample, 'rust'), /#\[serde\(default, skip_serializing_if = "Option::is_none"\)\]\n    pub note: Option<String>,/)
  assert.match(jsonToTypes(sample, 'python'), /note: str \| None = None/)
  assert.equal(jsonToTypes('[{"a":1},{"a":null}]'), 'export type Root = RootItem[]\n\nexport interface RootItem {\n  a: number | null\n}')
  assert.throws(() => jsonToTypes('{'), /Not valid JSON/)
})

test('Go aligns each struct independently, including empty, optional and nullable fields', () => {
  assert.equal(jsonToTypes('{}', 'go'), 'type Root struct {\n}')
  assert.equal(jsonToTypes('[{"id":1,"long_name":"a","meta":{}},{"id":null,"meta":{}}]', 'go'), [
    'type Root []RootItem', '',
    'type RootItem struct {',
    '\tID       *int64  `json:"id"`',
    '\tLongName *string `json:"long_name,omitempty"`',
    '\tMeta     Meta    `json:"meta"`',
    '}', '',
    'type Meta struct {', '}'
  ].join('\n'))
})

test('Go formatting calculates column widths with linear field visits', () => {
  for (const size of [100, 1000]) {
    const sample = Object.fromEntries(Array.from({ length: size }, (_, i) => [`field_${i}`, i]))
    const originalMax = Math.max
    let widthVisits = 0
    let go
    try {
      // Count the field-width work without a machine-dependent timing threshold.
      Math.max = (...values) => { widthVisits += values.length; return originalMax(...values) }
      go = jsonToTypes(JSON.stringify(sample), 'go')
    } finally {
      Math.max = originalMax
    }
    assert.ok(widthVisits <= 4 * size, `${size} fields required ${widthVisits} width visits`)
    const nameWidth = `Field${size - 1}`.length
    const expected = [
      'type Root struct {',
      ...Array.from({ length: size }, (_, i) => `\t${`Field${i}`.padEnd(nameWidth)} int64 \`json:"field_${i}"\``),
      '}'
    ].join('\n')
    assert.equal(go, expected)
  }
})
