import assert from 'node:assert/strict'
import { test } from 'node:test'

import { queryJson } from '../../src/tools/jsonpath.js'

const data = { store: { book: [{ title: 'A', price: 8, tags: ['x', 'y'] }, { title: 'B', price: 12 }, { title: 'C', price: 9, isbn: '1' }], bicycle: { price: 19 } } }
const values = (path) => queryJson(data, path).map((m) => m.value)

test('names, wildcards, indexes, slices and unions', () => {
  assert.deepEqual(values('$.store.book[*].title'), ['A', 'B', 'C'])
  assert.deepEqual(values("$['store']['bicycle'].price"), [19])
  assert.deepEqual(values('$.store.book[-1].title'), ['C'])
  assert.deepEqual(values('$.store.book[0:2].title'), ['A', 'B'])
  assert.deepEqual(values('$.store.book[::-1].title'), ['C', 'B', 'A'])
  assert.deepEqual(values('store.book[0,2].title'), ['A', 'C'])
  assert.deepEqual(values('$..price'), [8, 12, 9, 19])
})

test('filters with comparisons, logic, existence, regex and functions', () => {
  assert.deepEqual(values('$.store.book[?(@.price < 10)].title'), ['A', 'C'])
  assert.deepEqual(values('$.store.book[?@.price > 8 && !@.isbn].title'), ['B'])
  assert.deepEqual(values('$.store.book[?(@.isbn)].title'), ['C'])
  assert.deepEqual(values("$.store.book[?(@.title == 'B' || @.price == 9)].title"), ['B', 'C'])
  assert.deepEqual(values('$.store.book[?(@.title =~ /^[AB]$/)].title'), ['A', 'B'])
  assert.deepEqual(values('$..book[?(length(@.tags) > 1)].title'), ['A'])
  assert.deepEqual(values("$.store.book[?(match(@.title, '[BC]'))].title"), ['B', 'C'])
})

test('paths of matches, and errors', () => {
  assert.deepEqual(queryJson(data, '$..bicycle.price').map((m) => m.path), ['$.store.bicycle.price'])
  assert.deepEqual(queryJson({ 'a b': 1 }, '$.*').map((m) => m.path), ['$["a b"]'])
  assert.throws(() => queryJson(data, '$.store[?(@.price <'), /never closed|ends early/)
})

test('deep traversal preserves preorder, selector order, duplicate matches and quoted paths', () => {
  const sample = { id: 'root', 'odd key': [{ id: 'first', nested: { id: 'nested' } }, { id: 'last' }] }
  assert.deepEqual(queryJson(sample, "$..['id','id']"), [
    { value: 'root', path: '$.id' }, { value: 'root', path: '$.id' },
    { value: 'first', path: '$["odd key"][0].id' }, { value: 'first', path: '$["odd key"][0].id' },
    { value: 'nested', path: '$["odd key"][0].nested.id' }, { value: 'nested', path: '$["odd key"][0].nested.id' },
    { value: 'last', path: '$["odd key"][1].id' }, { value: 'last', path: '$["odd key"][1].id' }
  ])
  assert.deepEqual(queryJson(sample, '$..*').map((m) => m.path), [
    '$.id', '$["odd key"]', '$["odd key"][0]', '$["odd key"][1]',
    '$["odd key"][0].id', '$["odd key"][0].nested', '$["odd key"][0].nested.id', '$["odd key"][1].id'
  ])
})

test('large recursive and wildcard queries avoid argument-count limits', () => {
  const size = 150_000
  const items = Array.from({ length: size }, (_, id) => ({ id }))
  const recursive = queryJson({ items }, '$..id')
  assert.equal(recursive.length, size)
  for (let i = 0; i < size; i++) assert.deepEqual(recursive[i], { value: i, path: `$.items[${i}].id` })
  for (const path of ['$.items[*]', '$.items[?(@.id >= 0)]', '$.items[:]']) {
    const found = queryJson({ items }, path)
    assert.equal(found.length, size, path)
    assert.equal(found[0].value, items[0], path)
    assert.equal(found[size - 1].value, items[size - 1], path)
    assert.equal(found[size - 1].path, `$.items[${size - 1}]`, path)
  }
})

test('deep queries walk nested documents without recursive traversal or subtree copies', () => {
  const depth = 15_000
  let sample = { id: 'leaf' }
  for (let i = 0; i < depth; i++) sample = { child: sample }
  assert.deepEqual(queryJson(sample, '$..id'), [{ value: 'leaf', path: '$' + '.child'.repeat(depth) + '.id' }])
})
