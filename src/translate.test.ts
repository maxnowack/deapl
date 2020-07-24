// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava'
import translate, { kill } from './translate'

test('translate with auto language', async (t) => {
  const text = await translate('This is a test', {
    targetLanguage: 'de',
  })
  t.is(text, 'Dies ist ein Test')
})

test('translate with source language', async (t) => {
  const text = await translate('Hallo', {
    sourceLanguage: 'de',
    targetLanguage: 'en',
  })
  t.is(text, 'Hello')
})

test.after(async () => {
  await kill()
})
