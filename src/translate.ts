import puppeteer, { Browser } from 'puppeteer'

type Language = 'en' | 'de' | 'fr' | 'es' | 'pt' | 'it' | 'nl' | 'pl' | 'ru'

export interface Options {
  sourceLanguage?: Language,
  targetLanguage: Language,
}

let browserPromise: Promise<Browser> | undefined
const getBrowser = () => {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      // args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: {
        width: 640,
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

export default async function translate(text: string, options: Options) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  await page.goto('https://www.deepl.com/translator')
  await page.waitForSelector(`.lmt__side_container--target button[dl-lang=${options.targetLanguage.toUpperCase()}]`)
  if (options.sourceLanguage) {
    await page.click('.lmt__language_select--source .lmt__language_select__active')
    await page.click(`.lmt__language_select--source button[dl-lang=${options.sourceLanguage.toUpperCase()}]`)
  }
  await page.click('.lmt__language_select--target .lmt__language_select__active')
  await page.click(`.lmt__language_select--target button[dl-lang=${options.targetLanguage.toUpperCase()}]`)
  await page.click('.lmt__source_textarea')
  await page.keyboard.type(text)
  await new Promise(r => setTimeout(r, 10))
  await page.waitForSelector('.lmt:not(.lmt--active_translation_request)')
  await new Promise(r => setTimeout(r, 10))
  const result = await page.evaluate(() => {
    const node = document.querySelector('.lmt__target_textarea') as HTMLTextAreaElement
    if (!node) return ''
    return node.value
  })
  await page.close()
  return result
}
