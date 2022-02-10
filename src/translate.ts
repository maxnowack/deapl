/* eslint-disable no-await-in-loop */
import puppeteer, { Browser, Page } from 'puppeteer'
import PQueue from 'p-queue'

type SourceLanguage = 'bg' | 'zh' | 'cs' | 'da' | 'nl' | 'en' | 'et' | 'fi'
  | 'fr' | 'de' | 'el' | 'hu' | 'it' | 'ja' | 'lv' | 'lt' | 'pl' | 'pt'
  | 'ro' | 'ru' | 'sk' | 'sl' | 'es' | 'sv'
const TargetLanguageMap = {
  'bg-BG': 'bg-BG',
  'zh-CN': 'zh-ZH',
  'cs-CZ': 'cs-CS',
  'da-DK': 'da-DA',
  'nl-NL': 'nl-NL',
  'en-US': 'en-US',
  'en-GB': 'en-GB',
  'et-ET': 'et-ET',
  'fi-FI': 'fi-FI',
  'fr-FR': 'fr-FR',
  'de-DE': 'de-DE',
  'el-GR': 'el-EL',
  'hu-HU': 'hu-HU',
  'it-IT': 'it-IT',
  'ja-JP': 'ja-JA',
  'lv-LV': 'lv-LV',
  'lt-LT': 'lt-LT',
  'pl-PL': 'pl-PL',
  'pt-PT': 'pt-PT',
  'pt-BR': 'pt-BR',
  'ro-RO': 'ro-RO',
  'ru-RU': 'ru-RU',
  'sk-SK': 'sk-SK',
  'sl-SL': 'sl-SL',
  'es-ES': 'es-ES',
  'sv-SV': 'sv-SV',
}
type TargetLanguage = keyof typeof TargetLanguageMap

export interface Options {
  sourceLanguage?: SourceLanguage,
  targetLanguage: TargetLanguage,
  formality?: 'formal' | 'informal',
  defaultDelay?: number,
}

let browserPromise: Promise<Browser> | undefined
const getBrowser = () => {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      // headless: false,
      // args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: {
        width: 800,
        height: 600,
      },
    })
  }
  return browserPromise
}

export async function kill() {
  if (!browserPromise) return
  const browser = await getBrowser()
  await browser.close()
}

const sleepMs = (ms: number) => new Promise(r => setTimeout(r, ms))
const hasSelector = (page: Page, selector: string) => page.evaluate(s =>
  !!document.querySelector(s), [selector])

async function translatePhrase(text: string, options: Options) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  const defaultDelay = options.defaultDelay || 150
  const targetLanguage = TargetLanguageMap[options.targetLanguage]

  const waitForTranslation = async () => {
    await sleepMs(1000)
    await page.waitForSelector('.lmt:not(.lmt--active_translation_request)')
    await sleepMs(1000)
  }
  await page.goto('https://www.deepl.com/translator')
  await page.waitForSelector('.lmt__language_select--target .lmt__language_select__active')

  while (await hasSelector(page, '.dl_cookieBanner--buttonSelected')) {
    await page.click('.dl_cookieBanner--buttonSelected')
    await sleepMs(1000)
  }

  if (options.sourceLanguage) {
    await sleepMs(defaultDelay)
    await page.click('.lmt__language_select--source .lmt__language_select__active')
    await sleepMs(defaultDelay)
    await page.click(`.lmt__language_select__menu_source [dl-test="translator-lang-option-${options.sourceLanguage}"]`)
  }
  await sleepMs(defaultDelay)
  await page.click('.lmt__language_select--target .lmt__language_select__active')
  await sleepMs(defaultDelay)
  await page.click(`.lmt__language_select__menu_target [dl-test="translator-lang-option-${targetLanguage}"]`)
  await sleepMs(defaultDelay)

  await page.click('.lmt__source_textarea')
  await sleepMs(defaultDelay)
  await page.keyboard.type(text)
  await waitForTranslation()

  if (options.formality) {
    if (!await hasSelector(page, '.lmt__formalitySwitch__toggler')) {
      throw new Error('Cannot switch formality')
    }

    await page.evaluate(() => {
      const node = document.querySelector('.lmt__formalitySwitch')
      if (!node) return
      node.classList.add('dl_visible')
      node.classList.add('dl_visible_2')
      node.classList.add('lmt__formalitySwitch--is-open_0')
      node.classList.add('lmt__formalitySwitch--is-open')
    })

    await sleepMs(defaultDelay)
    if (options.formality === 'formal') {
      await page.click('.lmt__formalitySwitch__toggler')
      await page.waitForSelector('.lmt__formalitySwitch__menu')
      await page.click('.lmt__formalitySwitch__menu_item_container:nth-child(1) .lmt__formalitySwitch__menu_item')
    } else if (options.formality === 'informal') {
      await page.click('.lmt__formalitySwitch__toggler')
      await page.waitForSelector('.lmt__formalitySwitch__menu')
      await page.click('.lmt__formalitySwitch__menu_item_container:nth-child(2) .lmt__formalitySwitch__menu_item')
    }

    await waitForTranslation()
  }

  const result = await page.evaluate(() => {
    const node = document.querySelector('.lmt__target_textarea') as HTMLTextAreaElement
    if (!node) return ''
    return node.value
  })
  await page.close()
  return result
}

const pQueue = new PQueue({
  concurrency: process.env.DEAPL_CONCURRENCY ? parseInt(process.env.DEAPL_CONCURRENCY, 10) : 1,
})

export function setConcurrency(concurrency: number) {
  pQueue.concurrency = concurrency
}

export default async function translate(text: string, options: Options) {
  return pQueue.add(() => translatePhrase(text, options))
}
