/* eslint-disable no-await-in-loop */
import { Browser, Page, executablePath } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import PQueue from 'p-queue'

puppeteer.use(StealthPlugin())

const saveScreenshotOnFail = process.env.DEAPL_SAVE_SCREENSHOT === '1'
const defaultViewport = {
  width: 1024,
  height: 768,
}

type SourceLanguage = 'bg' | 'zh' | 'cs' | 'da' | 'nl'
  | 'en' | 'et' | 'fi' | 'fr' | 'de' | 'el'
  | 'hu' | 'id' | 'it' | 'ja' | 'lv' | 'lt'
  | 'pl' | 'pt' | 'ro' | 'ru' | 'sk' | 'sl'
  | 'es' | 'sv' | 'tr' | 'uk'
const TargetLanguageMap = {
  'bg-BG': 'bg',
  'zh-CN': 'zh-Hans',
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
  'id-ID': 'id',
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
  'tr-TR': 'tr',
  'uk-UA': 'uk',
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
      executablePath: executablePath(),
      headless: process.env.DEAPL_HEADLESS !== '0',
      args: [`--window-size=${defaultViewport.width},${defaultViewport.height}`],
      defaultViewport,
    })
  }
  return browserPromise
}

export async function kill() {
  if (!browserPromise) return
  const browser = await getBrowser()
  await browser.close()
}

const sleepMs = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms)
})
const hasSelector = (page: Page, selector: string) => page.evaluate(s =>
  !!document.querySelector(s), selector)
async function clickElement(
  page: Page,
  selector: string,
  failSilently = false,
) {
  const result = await page.evaluate((sel) => {
    const element: HTMLElement | null = document.querySelector(sel)
    if (!element) return false
    element.click()
    return true
  }, selector)
  if (!failSilently && !result) throw new Error(`Element not found: ${selector}`)
  if (!result) console.warn('Element not found:', selector)
}

const selectors = {
  dialogDismiss: '[data-testid="chrome-extension-toast"] button',
  cookieBannerDismiss: 'button[data-testid="cookie-banner-strict-accept-selected"]',
  translationActive: '[data-testid="translator-inline-loading-indicator"]',
  selectSourceLanguageButton: 'button[data-testid="translator-source-lang-btn"]',
  selectTargetLanguageButton: 'button[data-testid="translator-target-lang-btn"]',
  sourceLangList: '[data-testid="translator-source-lang-list"]',
  targetLangList: '[data-testid="translator-target-lang-list"]',
  sourceLanguageOption: (language: SourceLanguage) => `[data-testid="translator-source-lang-list"] [data-testid="translator-lang-option-${language}"]`,
  targetLanguageOption: (language: TargetLanguage) => `[data-testid="translator-target-lang-list"] [data-testid="translator-lang-option-${language}"]`,
  sourceTextarea: '[data-testid="translator-source-input"] div[contenteditable]',
  targetTextarea: '[data-testid="translator-target-input"] div[contenteditable]',
  formalityToggler: 'button[data-testid="formality-button"]',
  formalOption: 'button[data-testid="formality-menu-entry-formal"]',
  informalOption: 'button[data-testid="formality-menu-entry-formal"] + button',
  floaterButton: '.__floater.__floater__open button[data-action=primary]',
}

async function translatePhrase(text: string, options: Options) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  const targetLanguage = TargetLanguageMap[options.targetLanguage] as TargetLanguage

  const doTranslation = async () => {
    const waitForTranslation = async () => {
      await sleepMs(options.defaultDelay ?? 1000)
      await page.waitForSelector(selectors.translationActive, { hidden: true })
    }
    // set privacy settings
    await page.setCookie({
      name: 'privacySettings',
      value: encodeURIComponent(JSON.stringify({
        v: 2,
        t: Math.floor(Date.now() / 1000),
        m: 'STRICT',
        consent: ['NECESSARY'],
      })),
      domain: '.deepl.com',
    })
    await page.evaluateOnNewDocument(() => {
      window.localStorage.setItem('LMT_browserExtensionPromo', JSON.stringify({
        dismissed: true,
        'dismissed__%expires': 4844479408,
      }))
      window.localStorage.setItem('LMT_docTransOnboarding', JSON.stringify({
        suppressed: true,
        'suppressed__%expires': 4844479408,
      }))
      window.localStorage.setItem('LMT_advanced_mode', JSON.stringify({
        onboardingDismissed: true,
        'onboardingDismissed__%expires': 4844479408,
      }))
      window.localStorage.setItem('LMT_vertical_product_navigation', JSON.stringify({
        onboardingDismissed: true,
        'onboardingDismissed__%expires': 4844479408,
      }))
      window.localStorage.setItem('LMT_postSignupCallout', JSON.stringify({
        visible: false,
        'visible__%expires': 4844479408,
      }))
    })
    await page.goto('https://www.deepl.com/translator')
    await page.waitForSelector(selectors.selectTargetLanguageButton)

    if (options.sourceLanguage) {
      while (!await hasSelector(page, selectors.sourceLangList)) {
        await page.waitForSelector(selectors.selectSourceLanguageButton)
        await clickElement(page, selectors.selectSourceLanguageButton)
      }
      await page.waitForSelector(selectors.sourceLanguageOption(options.sourceLanguage))
      await clickElement(page, selectors.sourceLanguageOption(options.sourceLanguage))
    }

    while (!await hasSelector(page, selectors.targetLangList)) {
      await page.waitForSelector(selectors.selectTargetLanguageButton)
      await clickElement(page, selectors.selectTargetLanguageButton)
    }
    await page.waitForSelector(selectors.targetLanguageOption(targetLanguage))
    await clickElement(page, selectors.targetLanguageOption(targetLanguage))

    await clickElement(page, selectors.sourceTextarea)
    await page.keyboard.type(text)
    await waitForTranslation()

    if (options.formality) {
      if (!await hasSelector(page, selectors.formalityToggler)) {
        throw new Error('Cannot switch formality')
      }

      if (options.formality === 'formal') {
        await clickElement(page, selectors.formalityToggler)
        await page.waitForSelector(selectors.formalOption)
        await clickElement(page, selectors.formalOption)
      } else if (options.formality === 'informal') {
        await clickElement(page, selectors.formalityToggler)
        await page.waitForSelector(selectors.informalOption)
        await clickElement(page, selectors.informalOption)
      }

      await waitForTranslation()
    }
  }

  await doTranslation()
    .catch((err) => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      if (saveScreenshotOnFail) page.screenshot({ path: `/tmp/screenshot_${Date.now()}.png` }).catch(() => {})
      throw err
    })

  const result = await page.evaluate((selector) => {
    const node = document.querySelector(selector) as HTMLDivElement
    if (!node) return ''
    return node.innerText
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
