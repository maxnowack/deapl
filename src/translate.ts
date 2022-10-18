/* eslint-disable no-await-in-loop */
import puppeteer, { Browser, Page } from 'puppeteer'
import PQueue from 'p-queue'

type SourceLanguage = 'bg' | 'zh' | 'cs' | 'da' | 'nl' | 'en' | 'et' | 'fi'
  | 'fr' | 'de' | 'el' | 'hu' | 'it' | 'ja' | 'lv' | 'lt' | 'pl' | 'pt'
  | 'ro' | 'ru' | 'sk' | 'sl' | 'es' | 'sv'
const TargetLanguageMap = {
  'bg-BG': 'bg',
  'zh-CN': 'zh',
  'cs-CZ': 'cs',
  'da-DK': 'da',
  'nl-NL': 'nl',
  'en-US': 'en-US',
  'en-GB': 'en-GB',
  'et-ET': 'et',
  'fi-FI': 'fi',
  'fr-FR': 'fr',
  'de-DE': 'de',
  'el-GR': 'el',
  'hu-HU': 'hu',
  'it-IT': 'it',
  'ja-JP': 'ja',
  'lv-LV': 'lv',
  'lt-LT': 'lt',
  'pl-PL': 'pl',
  'pt-PT': 'pt-PT',
  'pt-BR': 'pt-BR',
  'ro-RO': 'ro',
  'ru-RU': 'ru',
  'sk-SK': 'sk',
  'sl-SL': 'sl',
  'es-ES': 'es',
  'sv-SV': 'sv',
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

const selectors = {
  cookieBannerDismiss: '.dl_cookieBanner--buttonSelected',
  translationActive: '.lmt:not(.lmt--active_translation_request)',
  selectSourceLanguageButton: 'button[dl-test="translator-source-lang-btn"]',
  selectTargetLanguageButton: 'button[dl-test="translator-target-lang-btn"]',
  sourceLanguageOption: (language: SourceLanguage) => `[role="listbox"] [dl-test="translator-lang-option-${language}"]`,
  targetLanguageOption: (language: TargetLanguage) => `[role="listbox"] [dl-test="translator-lang-option-${language}"]`,
  sourceTextarea: '.lmt__source_textarea',
  targetTextarea: '.lmt__target_textarea',
  formalityToggler: '.lmt__formalitySwitch__toggler',
  formalitySwitch: '.lmt__formalitySwitch',
  formalitySwitchMenu: '.lmt__formalitySwitch__menu',
  formalOption: '.lmt__formalitySwitch__menu_item_container:nth-child(1) .lmt__formalitySwitch__menu_item',
  informalOption: '.lmt__formalitySwitch__menu_item_container:nth-child(2) .lmt__formalitySwitch__menu_item',
}

async function translatePhrase(text: string, options: Options) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  const defaultDelay = options.defaultDelay || 150
  const targetLanguage = TargetLanguageMap[options.targetLanguage] as TargetLanguage

  const waitForTranslation = async () => {
    await sleepMs(1000)
    await page.waitForSelector(selectors.translationActive)
    await sleepMs(1000)
  }
  await page.goto('https://www.deepl.com/translator')
  await page.waitForSelector(selectors.selectTargetLanguageButton)

  while (await hasSelector(page, selectors.cookieBannerDismiss)) {
    await page.click(selectors.cookieBannerDismiss)
    await sleepMs(1000)
  }

  if (options.sourceLanguage) {
    await sleepMs(defaultDelay)
    console.log('CLICK', options.sourceLanguage)
    await page.screenshot({ path: `/tmp/screenshot_${Date.now()}.png` })
    await page.waitForSelector(selectors.selectSourceLanguageButton)
    await page.click(selectors.selectSourceLanguageButton)
    await sleepMs(defaultDelay)
    await page.click(selectors.sourceLanguageOption(options.sourceLanguage))
  }
  await sleepMs(defaultDelay)
  await page.click(selectors.selectTargetLanguageButton)
  await sleepMs(defaultDelay)
  await page.click(selectors.targetLanguageOption(targetLanguage))
  await sleepMs(defaultDelay)

  await page.click(selectors.sourceTextarea)
  await sleepMs(defaultDelay)
  await page.keyboard.type(text)
  await waitForTranslation()

  if (options.formality) {
    if (!await hasSelector(page, selectors.formalityToggler)) {
      throw new Error('Cannot switch formality')
    }

    await page.evaluate((selector) => {
      const node = document.querySelector(selector)
      if (!node) return
      node.classList.add('dl_visible', 'dl_visible_2', 'lmt__formalitySwitch--is-open_0', 'lmt__formalitySwitch--is-open')
    }, selectors.formalitySwitch)

    await sleepMs(defaultDelay)
    if (options.formality === 'formal') {
      await page.click(selectors.formalityToggler)
      await page.waitForSelector(selectors.formalitySwitchMenu)
      await page.click(selectors.formalOption)
    } else if (options.formality === 'informal') {
      await page.click(selectors.formalityToggler)
      await page.waitForSelector(selectors.formalitySwitchMenu)
      await page.click(selectors.informalOption)
    }

    await waitForTranslation()
  }

  const result = await page.evaluate((selector) => {
    const node = document.querySelector(selector) as HTMLTextAreaElement
    if (!node) return ''
    return node.value
  }, selectors.targetTextarea)
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
