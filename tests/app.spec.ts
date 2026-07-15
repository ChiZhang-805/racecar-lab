import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { MUSIC_TRACKS } from '../src/music'

const PART_IDS = ['front-wing', 'rear-wing', 'floor', 'nose', 'monocoque', 'halo', 'tires', 'brakes', 'front-suspension', 'rear-suspension', 'steering', 'battery', 'inverter', 'motor', 'differential', 'cooling', 'ecu', 'sensors'] as const

function captureErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

async function assertPageFits(page: Page) {
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  }))
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewportWidth + 1)
  expect(dimensions.height).toBeLessThanOrEqual(dimensions.viewportHeight + 1)
}

async function assertNoHorizontalOverflow(locator: Locator) {
  const dimensions = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
}

async function enterLab(page: Page) {
  await page.locator('.intro-actions .button--glass').click()
  await expect(page.locator('.lab-topbar')).toBeVisible()
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map(node => node.target) }))).toEqual([])
}

test('full-screen layout, language isolation and dialog focus work at all target viewports', async ({ page }) => {
  const errors = captureErrors(page)
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 844, height: 390 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.locator('.intro-screen')).toBeVisible()
    await assertPageFits(page)

    await page.locator('.intro-nav__actions button').last().click()
    const settings = page.locator('.settings-modal')
    await expect(settings).toBeVisible()
    await expect(settings.locator(':focus')).toHaveCount(1)
    await page.locator('[data-locale="en"]').click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    const englishText = await settings.locator(':scope > *:not(.settings-section)').allInnerTexts().then((items) => items.join(' '))
    expect(englishText).not.toMatch(/[\u3400-\u9fff]/)
    await page.getByRole('button', { name: 'Close' }).click()

    await page.locator('.intro-nav__actions button').nth(2).click()
    const knowledge = page.locator('.knowledge-modal')
    await expect(knowledge).toBeVisible()
    const box = await knowledge.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1)
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1)
    expect((await page.locator('.knowledge-main').boundingBox())!.width).toBeGreaterThan(250)
    await page.getByRole('button', { name: 'Close' }).click()
    await assertPageFits(page)
  }
  expect(errors).toEqual([])
})

test('all configured music files are served as playable MP3 assets', async ({ request }) => {
  expect(MUSIC_TRACKS).toHaveLength(8)
  for (const track of MUSIC_TRACKS) {
    const response = await request.get(track.file)
    expect(response.ok()).toBe(true)
    const contentType = response.headers()['content-type']?.toLowerCase() ?? ''
    expect(contentType.startsWith('audio/') || contentType === 'application/octet-stream').toBe(true)
    expect(Number(response.headers()['content-length'] ?? 0)).toBeGreaterThan(1024)
  }
})

test('all 18 detailed 3D component models assemble, explode, select and calculate', async ({ page }, testInfo: TestInfo) => {
  const errors = captureErrors(page)
  await page.addInitScript(() => localStorage.setItem('racecar-lab-locale', 'en'))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await enterLab(page)

  for (const id of PART_IDS) {
    await page.locator(`[data-part-id="${id}"]`).evaluate((element: HTMLButtonElement) => element.click())
    await expect(page.locator('.part-panel')).toBeVisible()
    await page.locator('.part-deep-button').click()
    const detail = page.locator('.engineering-detail')
    await expect(detail).toBeVisible()
    await expect(detail.locator('.component-workshop__parts button.is-active')).toHaveCount(0)
    await expect(detail.locator('.component-inspector.is-empty')).toBeVisible()
    await expect(detail.locator('.component-workshop__parts button')).toHaveCount(6)
    await expect(detail.locator('.component-inspector article')).toHaveCount(0)
    await expect(detail.locator('.component-workshop__stage canvas')).toBeVisible()
    await expect(detail).not.toContainText(/[\u3400-\u9fff]/)
    const inspectorArticles = await detail.locator('.component-inspector article').evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect()
      return { top: box.top, bottom: box.bottom }
    }))
    for (let index = 1; index < inspectorArticles.length; index += 1) {
      expect(inspectorArticles[index]!.top).toBeGreaterThanOrEqual(inspectorArticles[index - 1]!.bottom - 1)
    }
    await page.waitForTimeout(120)
    await detail.locator('.component-learning').screenshot({ path: testInfo.outputPath(`model-${id}-assembled.png`) })

    const thirdName = (await detail.locator('.component-workshop__parts button').nth(2).innerText()).trim()
    await detail.locator('.component-workshop__parts button').nth(2).click()
    await expect(detail.locator('.component-inspector h3')).toHaveText(thirdName)
    await expect(detail.locator('.component-inspector article')).toHaveCount(4)
    await detail.locator('.component-workshop__explode input').fill('1')
    await expect(detail.locator('.component-workshop__explode strong')).toHaveText('100%')
    await page.waitForTimeout(120)
    await detail.locator('.component-learning').screenshot({ path: testInfo.outputPath(`model-${id}-exploded.png`) })
    await detail.locator('.component-workshop__explode input').fill('0')

    await detail.locator('.engineering-tabs button').nth(1).click()
    await expect(detail.locator('.eng-metrics article')).toHaveCount(4)
    await expect(detail.locator('.eng-chart svg')).toBeVisible()
    await expect(detail.locator('.eng-formula-dots button')).toHaveCount(3)
    for (let formulaIndex = 0; formulaIndex < 3; formulaIndex += 1) {
      await detail.locator('.eng-formula-dots button').nth(formulaIndex).click()
      await expect(detail.locator('.eng-formula-math .katex')).toBeVisible()
      await expect(detail.locator('.eng-formula-math .katex-error')).toHaveCount(0)
      await expect(detail.locator('.eng-worked-example')).toBeVisible()
      await expect(detail.locator('.eng-worked-example > h4').first()).toHaveText('Engineering scenario')
      expect(await detail.locator('.eng-worked-example li').count()).toBeGreaterThanOrEqual(2)
      await expect(detail.locator('.eng-worked-result')).toContainText(/\d/)
      await expect(detail.locator('.eng-formula-card')).not.toContainText(/[\u3400-\u9fff]/)
    }
    await detail.locator('.eng-formulas').screenshot({ path: testInfo.outputPath(`formula-${id}.png`) })
    const metricsBefore = await detail.locator('.eng-metrics').innerText()
    const firstSlider = detail.locator('.eng-slider input').first()
    await firstSlider.fill(await firstSlider.getAttribute('min') ?? '0')
    await expect.poll(() => detail.locator('.eng-metrics').innerText()).not.toBe(metricsBefore)

    if (id !== 'cooling') {
      await detail.locator('.engineering-tabs button').nth(2).click()
      const observe = detail.getByTestId('part-observe')
      await expect(observe).toBeVisible()
      await expect(observe).toHaveAttribute('data-part-id', id)
      const experiments = observe.locator('[data-experiment-id]')
      await expect(experiments).toHaveCount(5)
      await experiments.nth(4).click()
      await expect(experiments.nth(4)).toHaveClass(/is-active/)
      await expect(experiments.nth(4)).toHaveAttribute('aria-pressed', 'true')
      await expect(experiments.first()).toHaveAttribute('aria-pressed', 'false')
      await expect(observe.locator('.interaction-lab-stage svg')).toBeVisible()
      await expect(observe.locator('[data-metric-id]')).toHaveCount(4)
      const interactionMetricsBefore = await observe.locator('.cooling-lab-results').innerText()
      const interactionSlider = observe.locator('.cooling-lab-inputs input[type="range"]').first()
      const interactionMin = await interactionSlider.getAttribute('min') ?? '0'
      const interactionMax = await interactionSlider.getAttribute('max') ?? '1'
      const currentValue = await interactionSlider.inputValue()
      await interactionSlider.fill(currentValue === interactionMin ? interactionMax : interactionMin)
      await expect.poll(() => observe.locator('.cooling-lab-results').innerText()).not.toBe(interactionMetricsBefore)
      await expect(observe).not.toContainText(/[\u3400-\u9fff]/)

      await detail.locator('.engineering-tabs button').nth(3).click()
      const referenceCards = detail.locator('[data-resource-card-id]')
      await expect(referenceCards).toHaveCount(3)
      await expect(referenceCards.first().locator('img')).toBeVisible()
      await expect.poll(() => referenceCards.first().locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0), { timeout: 30_000 }).toBe(true)
      await referenceCards.first().locator('.cooling-flip-card__front').click()
      await expect(referenceCards.first()).toHaveAttribute('data-flipped', 'true')
      await expect(referenceCards.first().locator('.cooling-flip-card__return')).toBeFocused()
      await referenceCards.first().locator('.cooling-flip-card__return').click()
      await expect(referenceCards.first().locator('.cooling-flip-card__front')).toBeFocused()

      await detail.locator('.engineering-tabs button').nth(4).click()
      const faultCards = detail.locator('[data-fault-card-id]')
      await expect(faultCards).toHaveCount(3)
      await expect(faultCards.first().locator('img')).toBeVisible()
      await expect.poll(() => faultCards.first().locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0), { timeout: 30_000 }).toBe(true)
      await faultCards.first().locator('.cooling-flip-card__front').click()
      await expect(faultCards.first()).toHaveAttribute('data-flipped', 'true')
      await expect(faultCards.first().locator('.cooling-flip-card__return')).toBeFocused()
      await faultCards.first().locator('.cooling-flip-card__return').click()
      await expect(faultCards.first().locator('.cooling-flip-card__front')).toBeFocused()
      await expect(detail).not.toContainText(/[\u3400-\u9fff]/)
    }

    await detail.locator('.settings-close').click()
    await expect(detail).toBeHidden()
  }
  expect(errors).toEqual([])
})

test('cooling detail exposes five experiments and two sets of three working flip cards', async ({ page }) => {
  const errors = captureErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('racecar-lab-locale', 'en')
    localStorage.setItem('racecar-lab-vehicle', 'student-ev')
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await enterLab(page)

  await page.locator('[data-part-id="cooling"]').evaluate((element: HTMLButtonElement) => element.click())
  await expect(page.locator('.part-panel')).toBeVisible()
  await page.locator('.part-deep-button').click()
  const detail = page.locator('.engineering-detail')
  await expect(detail).toBeVisible()

  await detail.locator('.engineering-tabs button').nth(2).click()
  const observe = detail.getByTestId('cooling-observe')
  await expect(observe).toBeVisible()
  const experiments = observe.locator('[data-experiment-id]')
  await expect(experiments).toHaveCount(5)
  await expect(observe.locator('.eng-prediction-switch')).toHaveCount(0)
  await expect(observe.locator('.eng-visual-conclusion')).toHaveCount(0)
  const expectedModes = ['loop', 'pump-map', 'radiator', 'branches', 'timeline']
  for (let index = 0; index < expectedModes.length; index += 1) {
    await experiments.nth(index).click()
    await expect(experiments.nth(index)).toHaveClass(/is-active/)
    await expect(observe.locator('.cooling-lab-stage')).toHaveAttribute('data-diagram-mode', expectedModes[index]!)
    await expect(observe.locator('[data-metric-id]')).toHaveCount(4)
  }

  await experiments.first().click()
  const metricsBefore = await observe.locator('.cooling-lab-results').innerText()
  const firstSlider = observe.locator('.cooling-lab-inputs input[type="range"]').first()
  await firstSlider.fill(await firstSlider.getAttribute('min') ?? '0')
  await expect.poll(() => observe.locator('.cooling-lab-results').innerText()).not.toBe(metricsBefore)

  await detail.locator('.engineering-tabs button').nth(3).click()
  const referenceCards = detail.locator('[data-resource-card-id]')
  await expect(referenceCards).toHaveCount(3)
  for (let index = 0; index < 3; index += 1) {
    const card = referenceCards.nth(index)
    await expect(card.locator('img')).toBeVisible()
    await expect.poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0), { timeout: 30_000 }).toBe(true)
    await card.locator('.cooling-flip-card__front').click()
    await expect(card).toHaveAttribute('data-flipped', 'true')
    await expect(card.locator('.cooling-flip-card__back')).toHaveAttribute('aria-hidden', 'false')
    await card.locator('.cooling-flip-card__return').click()
    await expect(card).toHaveAttribute('data-flipped', 'false')
  }

  await detail.locator('.engineering-tabs button').nth(4).click()
  const faultCards = detail.locator('[data-fault-card-id]')
  await expect(faultCards).toHaveCount(3)
  for (let index = 0; index < 3; index += 1) {
    const card = faultCards.nth(index)
    await expect(card.locator('img')).toBeVisible()
    await expect.poll(() => card.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0), { timeout: 30_000 }).toBe(true)
    await card.locator('.cooling-flip-card__front').click()
    await expect(card).toHaveAttribute('data-flipped', 'true')
    await expect(card.locator('.cooling-flip-card__back')).toHaveAttribute('aria-hidden', 'false')
    await card.locator('.cooling-flip-card__return').click()
    await expect(card).toHaveAttribute('data-flipped', 'false')
  }

  expect(errors).toEqual([])
})

test('cooling experiments and flip cards remain reachable without horizontal overflow on portrait mobile', async ({ page }) => {
  const errors = captureErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('racecar-lab-locale', 'en')
    localStorage.setItem('racecar-lab-vehicle', 'student-ev')
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await enterLab(page)

  await page.locator('[data-part-id="cooling"]').evaluate((element: HTMLButtonElement) => element.click())
  await expect(page.locator('.part-panel')).toBeVisible()
  await page.locator('.part-deep-button').click()
  const detail = page.locator('.engineering-detail')
  const body = detail.locator('.engineering-detail__body')
  await expect(detail).toBeVisible()
  await assertNoHorizontalOverflow(detail)

  await detail.locator('.engineering-tabs button').nth(2).click()
  const observe = detail.getByTestId('cooling-observe')
  await expect(observe).toBeVisible()
  await expect(observe).not.toContainText(/[\u3400-\u9fff]/)
  await assertNoHorizontalOverflow(body)
  await assertNoHorizontalOverflow(observe)
  const fifthExperiment = observe.locator('[data-experiment-id]').nth(4)
  await fifthExperiment.scrollIntoViewIfNeeded()
  await fifthExperiment.click()
  await expect(fifthExperiment).toHaveClass(/is-active/)
  await expect(observe.locator('.cooling-lab-stage')).toHaveAttribute('data-diagram-mode', 'timeline')

  await detail.locator('.engineering-tabs button').nth(3).click()
  const references = detail.locator('[data-resource-card-id]')
  await expect(references).toHaveCount(3)
  await expect(detail.locator('.cooling-card-page')).not.toContainText(/[\u3400-\u9fff]/)
  await assertNoHorizontalOverflow(body)
  await assertNoHorizontalOverflow(detail.locator('.cooling-card-page'))
  const thirdReference = references.nth(2)
  await thirdReference.scrollIntoViewIfNeeded()
  await thirdReference.locator('.cooling-flip-card__front').click()
  await expect(thirdReference).toHaveAttribute('data-flipped', 'true')
  await thirdReference.locator('.cooling-flip-card__return').click()

  await detail.locator('.engineering-tabs button').nth(4).click()
  const faults = detail.locator('[data-fault-card-id]')
  await expect(faults).toHaveCount(3)
  await expect(detail.locator('.cooling-card-page')).not.toContainText(/[\u3400-\u9fff]/)
  await assertNoHorizontalOverflow(body)
  await assertNoHorizontalOverflow(detail.locator('.cooling-card-page'))
  const thirdFault = faults.nth(2)
  await thirdFault.scrollIntoViewIfNeeded()
  await thirdFault.locator('.cooling-flip-card__front').click()
  await expect(thirdFault).toHaveAttribute('data-flipped', 'true')
  await thirdFault.locator('.cooling-flip-card__return').click()

  await assertPageFits(page)
  expect(errors).toEqual([])
})

test('all non-cooling interaction panels remain usable on portrait mobile', async ({ page }) => {
  const errors = captureErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('racecar-lab-locale', 'en')
    localStorage.setItem('racecar-lab-vehicle', 'student-ev')
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await enterLab(page)

  for (const id of PART_IDS.filter(partId => partId !== 'cooling')) {
    await page.locator(`[data-part-id="${id}"]`).evaluate((element: HTMLButtonElement) => element.click())
    await page.locator('.part-deep-button').click()
    const detail = page.locator('.engineering-detail')
    const body = detail.locator('.engineering-detail__body')
    await expect(detail).toBeVisible()
    await assertNoHorizontalOverflow(detail)

    await detail.locator('.engineering-tabs button').nth(2).click()
    const observe = detail.getByTestId('part-observe')
    await expect(observe).toBeVisible()
    await expect(observe.locator('[data-experiment-id]')).toHaveCount(5)
    const fifthExperiment = observe.locator('[data-experiment-id]').nth(4)
    await fifthExperiment.scrollIntoViewIfNeeded()
    await fifthExperiment.click()
    await expect(fifthExperiment).toHaveClass(/is-active/)
    await expect(fifthExperiment).toHaveAttribute('aria-pressed', 'true')
    await assertNoHorizontalOverflow(body)
    await assertNoHorizontalOverflow(observe)
    await expect(observe).not.toContainText(/[\u3400-\u9fff]/)

    await detail.locator('.engineering-tabs button').nth(3).click()
    const references = detail.locator('[data-resource-card-id]')
    await expect(references).toHaveCount(3)
    await references.nth(2).scrollIntoViewIfNeeded()
    await assertNoHorizontalOverflow(body)
    await expect(detail.locator('.cooling-card-page')).not.toContainText(/[\u3400-\u9fff]/)

    await detail.locator('.engineering-tabs button').nth(4).click()
    const faults = detail.locator('[data-fault-card-id]')
    await expect(faults).toHaveCount(3)
    await faults.nth(2).scrollIntoViewIfNeeded()
    await assertNoHorizontalOverflow(body)
    await expect(detail.locator('.cooling-card-page')).not.toContainText(/[\u3400-\u9fff]/)

    await detail.locator('.settings-close').click()
    await expect(detail).toBeHidden()
  }

  await assertPageFits(page)
  expect(errors).toEqual([])
})

test('grand prix vehicle persists, isolates content and exposes all 18 dedicated assemblies', async ({ page }, testInfo: TestInfo) => {
  const errors = captureErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('racecar-lab-locale', 'en')
    localStorage.setItem('racecar-lab-vehicle', 'grand-prix-2026')
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('.intro-screen')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('grand-prix-intro.png') })
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.locator('[data-vehicle="grand-prix-2026"]')).toHaveAttribute('aria-pressed', 'true')
  const settingsWithoutNativeLocaleNames = await page.locator('.settings-modal').evaluate((element) => {
    const clone = element.cloneNode(true) as HTMLElement
    clone.querySelector('[data-locale="zh"]')?.remove()
    return clone.innerText
  })
  expect(settingsWithoutNativeLocaleNames).not.toMatch(/[\u3400-\u9fff]/)
  await page.getByRole('button', { name: 'Close' }).click()
  await enterLab(page)
  await page.screenshot({ path: testInfo.outputPath('grand-prix-lab.png') })

  for (let scenarioIndex = 1; scenarioIndex < 5; scenarioIndex += 1) {
    const scenarioButton = page.locator('.scenario-group button').nth(scenarioIndex)
    await scenarioButton.click()
    await expect(scenarioButton).toHaveAttribute('aria-pressed', 'true')
    await page.waitForTimeout(180)
    await page.locator('.scene-canvas').screenshot({ path: testInfo.outputPath(`grand-prix-scenario-${scenarioIndex}.png`) })
  }
  await page.locator('.scenario-group button').first().click()

  await page.getByRole('button', { name: 'Course map' }).click()
  await expect(page.locator('.course-modal')).toBeVisible()
  await expect(page.locator('.course-node').first()).toContainText('Enter the grand prix single-seater')
  await expect(page.locator('.course-modal')).not.toContainText(/[\u3400-\u9fff]/)
  await page.locator('.course-modal .settings-close').click()

  await page.getByRole('button', { name: 'Knowledge centre' }).click()
  await expect(page.locator('.knowledge-modal')).toBeVisible()
  await expect(page.locator('.knowledge-parts button').first()).toContainText('ACTIVE FRONT WING')
  await expect(page.locator('.knowledge-modal')).not.toContainText(/[\u3400-\u9fff]/)
  await expect(page.locator('.knowledge-label')).toHaveCount(0)
  await expect(page.locator('.knowledge-record')).toHaveCount(0)
  await page.locator('.knowledge-modal .settings-close').click()

  for (const id of PART_IDS) {
    await page.locator(`[data-part-id="${id}"]`).evaluate((element: HTMLButtonElement) => element.click())
    const panel = page.locator('.part-panel')
    await expect(panel).toBeVisible()
    await expect(panel).not.toContainText(/[\u3400-\u9fff]/)
    await panel.locator('.part-deep-button').click()
    const detail = page.locator('.engineering-detail')
    await expect(detail).toBeVisible()
    await expect(detail.locator('.component-workshop__parts button.is-active')).toHaveCount(0)
    await expect(detail.locator('.component-inspector.is-empty')).toBeVisible()
    await expect(detail.locator('.component-workshop__parts button')).toHaveCount(6)
    await expect(detail.locator('.component-inspector article')).toHaveCount(0)
    await expect(detail.locator('.component-workshop__stage canvas')).toBeVisible()
    await expect(detail).not.toContainText(/[\u3400-\u9fff]/)
    const articleBoxes = await detail.locator('.component-inspector article').evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect()
      return { top: box.top, bottom: box.bottom }
    }))
    for (let index = 1; index < articleBoxes.length; index += 1) {
      expect(articleBoxes[index]!.top).toBeGreaterThanOrEqual(articleBoxes[index - 1]!.bottom - 1)
    }

    await detail.locator('.component-workshop__parts button').nth(5).click()
    await expect(detail.locator('.component-inspector.is-empty')).toHaveCount(0)
    await expect(detail.locator('.component-inspector article')).toHaveCount(4)
    await detail.locator('.component-workshop__explode input').fill('0.72')
    await expect(detail.locator('.component-workshop__explode strong')).toHaveText('72%')
    await detail.locator('.component-learning').screenshot({ path: testInfo.outputPath(`grand-prix-${id}.png`) })

    await detail.locator('.engineering-tabs button').nth(1).click()
    await expect(detail.locator('.eng-metrics article')).toHaveCount(4)
    await expect(detail.locator('.eng-chart svg')).toBeVisible()
    await expect(detail.locator('.eng-formula-dots button')).toHaveCount(3)
    for (let formulaIndex = 0; formulaIndex < 3; formulaIndex += 1) {
      await detail.locator('.eng-formula-dots button').nth(formulaIndex).click()
      await expect(detail.locator('.eng-formula-math .katex')).toBeVisible()
      await expect(detail.locator('.eng-formula-math .katex-error')).toHaveCount(0)
      await expect(detail.locator('.eng-worked-example li')).not.toHaveCount(0)
      await expect(detail.locator('.eng-worked-result')).toContainText(/\d/)
      await expect(detail.locator('.eng-formula-card')).not.toContainText(/[\u3400-\u9fff]/)
    }
    await detail.locator('.settings-close').click()
  }

  await page.reload()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.locator('[data-vehicle="grand-prix-2026"]')).toHaveAttribute('aria-pressed', 'true')
  expect(errors).toEqual([])
})

test('vehicle switch keeps course and knowledge progress in separate storage namespaces', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('racecar-lab-locale', 'en')
    localStorage.setItem('racecar-lab-profile', 'VEHICLE-ISOLATION')
    localStorage.setItem('racecar-lab-progress:VEHICLE-ISOLATION', '["orientation"]')
    localStorage.setItem('racecar-lab-progress:VEHICLE-ISOLATION:grand-prix-2026', '["aero","powertrain"]')
    localStorage.setItem('racecar-lab-knowledge:VEHICLE-ISOLATION', '{"score":3}')
    localStorage.setItem('racecar-lab-knowledge:VEHICLE-ISOLATION:grand-prix-2026', '{"score":9}')
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.locator('[data-vehicle="grand-prix-2026"]').click()
  await expect(page.locator('[data-vehicle="grand-prix-2026"]')).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Close' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Settings' }).click()
  await expect(page.locator('[data-vehicle="grand-prix-2026"]')).toHaveAttribute('aria-pressed', 'true')
  const stored = await page.evaluate(() => ({
    studentCourse: localStorage.getItem('racecar-lab-progress:VEHICLE-ISOLATION'),
    grandPrixCourse: localStorage.getItem('racecar-lab-progress:VEHICLE-ISOLATION:grand-prix-2026'),
    studentKnowledge: localStorage.getItem('racecar-lab-knowledge:VEHICLE-ISOLATION'),
    grandPrixKnowledge: localStorage.getItem('racecar-lab-knowledge:VEHICLE-ISOLATION:grand-prix-2026'),
  }))
  expect(stored.studentCourse).toBe('["orientation"]')
  expect(stored.grandPrixCourse).toBe('["aero","powertrain"]')
  expect(stored.studentKnowledge).toBe('{"score":3}')
  expect(stored.grandPrixKnowledge).toBe('{"score":9}')

  // An unfinished answer belongs to the mounted vehicle session only. Switching
  // vehicles must unmount it so neither the selected option nor prompt leaks.
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Knowledge centre' }).click()
  const grandPrixPrompt = await page.locator('.knowledge-question h3').innerText()
  await page.locator('.knowledge-options button').first().click()
  await expect(page.locator('.knowledge-options button').first()).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.locator('[data-vehicle="student-ev"]').click()
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Knowledge centre' }).click()
  await expect(page.locator('.knowledge-options button[aria-pressed="true"]')).toHaveCount(0)
  expect(await page.locator('.knowledge-question h3').innerText()).not.toBe(grandPrixPrompt)
})

test('course observation state resets and corrupt local progress cannot break startup', async ({ page }) => {
  const errors = captureErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('racecar-lab-locale', 'en')
    localStorage.setItem('racecar-lab-profile', 'QA-PROFILE')
    localStorage.setItem('racecar-lab-progress:QA-PROFILE', '{invalid-json')
    localStorage.setItem('racecar-lab-knowledge:QA-PROFILE', '["invalid"]')
  })
  await page.goto('/')
  await page.locator('.intro-actions .button--primary').click()
  await expect(page.locator('.lesson-panel')).toBeVisible()
  const partButtons = page.locator('.lesson-parts button')
  const count = await partButtons.count()
  expect(count).toBeGreaterThan(1)
  for (let index = 0; index < count; index += 1) await partButtons.nth(index).click()
  await expect(page.locator('.lesson-finish')).toBeEnabled()

  await page.locator('.lab-topbar .top-button').first().click()
  await expect(page.locator('.course-modal')).toBeVisible()
  await page.locator('.course-node').first().click()
  await expect(page.locator('.lesson-finish')).toBeDisabled()
  expect(errors).toEqual([])
})

test('intro, lab and learning dialogs satisfy automated WCAG checks', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('racecar-lab-locale', 'en'))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expectAccessible(page)
  await enterLab(page)
  await expectAccessible(page)

  await page.getByRole('button', { name: 'Settings' }).click()
  await expectAccessible(page)
  await page.getByRole('button', { name: 'Close' }).click()

  await page.getByRole('button', { name: 'Knowledge centre' }).click()
  await expectAccessible(page)
  await page.getByRole('button', { name: 'Close' }).click()

  await page.locator('[data-part-id="front-wing"]').evaluate((element: HTMLButtonElement) => element.click())
  await page.locator('.part-deep-button').click()
  const detail = page.locator('.engineering-detail')
  await expect(detail).toBeVisible()
  await expectAccessible(page)

  await detail.locator('.engineering-tabs button').nth(2).click()
  await expectAccessible(page)

  await detail.locator('.engineering-tabs button').nth(3).click()
  await expectAccessible(page)
  const reference = detail.locator('[data-resource-card-id]').first()
  await reference.locator('.cooling-flip-card__front').focus()
  await page.keyboard.press('Enter')
  await expect(reference.locator('.cooling-flip-card__return')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(reference.locator('.cooling-flip-card__front')).toBeFocused()

  await detail.locator('.engineering-tabs button').nth(4).click()
  await expectAccessible(page)
  const fault = detail.locator('[data-fault-card-id]').first()
  await fault.locator('.cooling-flip-card__front').focus()
  await page.keyboard.press('Enter')
  await expect(fault.locator('.cooling-flip-card__return')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(fault.locator('.cooling-flip-card__front')).toBeFocused()
})
