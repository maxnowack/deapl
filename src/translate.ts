import puppeteer, { Browser } from 'puppeteer'

type Language = 'en' | 'de' | 'fr' | 'es' | 'pt' | 'it' | 'nl' | 'pl' | 'ru'

export interface Options {
  sourceLanguage?: Language,
  targetLanguage: Language,
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
        width: 700,
        height: 480,
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

export default async function translate(text: string, options: Options) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  const defaultDelay = options.defaultDelay || 50

  const waitForTranslation = async () => {
    await sleepMs(1000)
    await page.waitForSelector('.lmt:not(.lmt--active_translation_request)')
    await sleepMs(1000)
  }
  await page.goto('https://www.deepl.com/translator')
  await page.waitForSelector(`.lmt__side_container--target button[dl-lang=${options.targetLanguage.toUpperCase()}]`)
  if (options.sourceLanguage) {
    await sleepMs(defaultDelay)
    await page.click('.lmt__language_select--source .lmt__language_select__active')
    await sleepMs(defaultDelay)
    await page.click(`.lmt__language_select--source button[dl-lang=${options.sourceLanguage.toUpperCase()}]`)
  }
  await sleepMs(defaultDelay)
  await page.click('.lmt__language_select--target .lmt__language_select__active')
  await sleepMs(defaultDelay)
  await page.click(`.lmt__language_select--target button[dl-lang=${options.targetLanguage.toUpperCase()}]`)
  await sleepMs(defaultDelay)

  await page.click('.lmt__source_textarea')
  await sleepMs(defaultDelay)
  await page.keyboard.type(text)
  await waitForTranslation()

  if (options.formality) {
    const hasSelector = await page.evaluate(() =>
      !!document.querySelector('.lmt__formalitySwitch__toggler'))
    if (!hasSelector) throw new Error('Cannot switch formality')

    await page.click('.lmt__formalitySwitch__toggler')
    await sleepMs(defaultDelay)
    if (options.formality === 'formal') {
      await page.click('.lmt__formalitySwitch__menu_item:nth-child(1)')
    } else if (options.formality === 'informal') {
      await page.click('.lmt__formalitySwitch__menu_item:nth-child(2)')
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
