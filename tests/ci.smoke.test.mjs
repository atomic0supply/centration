import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('firebase hosting apunta a dist', () => {
  const firebaseJson = JSON.parse(
    readFileSync(new URL('../firebase.json', import.meta.url), 'utf8'),
  )

  assert.equal(firebaseJson.hosting?.public, 'dist')
})

test('la pantalla principal contiene Hello World', () => {
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  assert.match(appSource, /Hello World/)
})
