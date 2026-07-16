import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { MUSIC_TRACKS } from '../src/music'
import { ENGINEERING_LESSONS } from '../src/engineeringData'
import { GRAND_PRIX_ENGINEERING_LESSONS } from '../src/grandPrixEngineeringData'
import { initialValues, LAB_MODELS } from '../src/engineeringSim'
import { grandPrixInitialValues, GRAND_PRIX_LAB_MODELS } from '../src/grandPrixEngineeringSim'
import { getPartInteractionPack } from '../src/partInteractionRegistry'
import { initialInteractionValues } from '../src/interactionTypes'

const PART_IDS = ['front-wing', 'rear-wing', 'floor', 'nose', 'monocoque', 'halo', 'tires', 'brakes', 'front-suspension', 'rear-suspension', 'steering', 'battery', 'inverter', 'motor', 'differential', 'cooling', 'ecu', 'sensors'] as const

function expectedPrincipleMetricCount(partId: typeof PART_IDS[number], vehicle: 'student-ev' | 'grand-prix-2026') {
  const lessons = vehicle === 'grand-prix-2026' ? GRAND_PRIX_ENGINEERING_LESSONS : ENGINEERING_LESSONS
  const models = vehicle === 'grand-prix-2026' ? GRAND_PRIX_LAB_MODELS : LAB_MODELS
  const values = vehicle === 'grand-prix-2026' ? grandPrixInitialValues : initialValues
  const kind = lessons[partId].labKind
  return models[kind].evaluate(values(kind)).metrics.length
}

function expectedInteractionMetricCount(partId: Exclude<typeof PART_IDS[number], 'cooling'>, vehicle: 'student-ev' | 'grand-prix-2026', experimentIndex: number) {
  const experiment = getPartInteractionPack(partId)!.experimentsFor(vehicle)[experimentIndex]!
  return experiment.evaluate(initialInteractionValues(experiment)).metrics.length
}

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
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 844, height: 390 }, { width: 390, height: 844 }, { width: 360, height: 800 }, { width: 320, height: 568 }]) {
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

test('desktop and portrait UI matrix keeps every primary panel reachable', async ({ page }, testInfo: TestInfo) => {
  const errors = captureErrors(page)
  const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }]
  const locales = ['zh', 'en'] as const
  const vehicles = ['student-ev', 'grand-prix-2026'] as const

  for (const viewport of viewports) {
    for (const locale of locales) {
      for (const vehicle of vehicles) {
        await page.setViewportSize(viewport)
        await page.goto('/')
        await page.evaluate(({ locale: nextLocale, vehicle: nextVehicle }) => {
          localStorage.setItem('racecar-lab-locale', nextLocale)
          localStorage.setItem('racecar-lab-vehicle', nextVehicle)
        }, { locale, vehicle })
        await page.reload()
        await expect(page.locator('.intro-screen')).toBeVisible()
        await assertPageFits(page)

        const settingsTrigger = page.locator('.intro-nav__actions button').last()
        await settingsTrigger.click()
        const settings = page.locator('.settings-modal')
        await expect(settings).toBeVisible()
        await assertNoHorizontalOverflow(settings)
        await expect(settings.locator('[data-locale]')).toHaveCount(2)
        await expect(settings.locator('[data-vehicle]')).toHaveCount(2)
        await expect(settings.locator('[data-livery], [data-grand-prix-team]')).toHaveCount(0)
        await expect(settings.locator('.music-track-list button')).toHaveCount(8)
        await settings.locator('.music-track-list button').last().scrollIntoViewIfNeeded()
        await expect(settings.locator('.music-track-list button').last()).toBeVisible()
        if (viewport.width < 680) {
          const choiceLabels = settings.locator('.vehicle-options strong, .music-track-list strong')
          const clippedLabels = await choiceLabels.evaluateAll((elements) => elements.filter((element) => element.scrollWidth > element.clientWidth + 1).map(element => element.textContent))
          expect(clippedLabels).toEqual([])
        }
        await settings.locator('.reset-progress').scrollIntoViewIfNeeded()
        if (viewport.width < 680) await settings.screenshot({ path: testInfo.outputPath(`settings-${locale}-${vehicle}.png`) })
        await settings.locator('.reset-progress').click()
        await expect(settings.locator('.reset-confirm .button--glass')).toBeFocused()
        await settings.locator('.reset-confirm .button--glass').click()
        await expect(settings.locator('.reset-progress')).toBeFocused()
        if (locale === 'en') {
          const isolatedSettingsText = await settings.evaluate((element) => {
            const clone = element.cloneNode(true) as HTMLElement
            clone.querySelector('[data-locale="zh"]')?.remove()
            return clone.innerText
          })
          expect(isolatedSettingsText).not.toMatch(/[\u3400-\u9fff]/)
        }
        await settings.locator('.settings-close').click()
        await expect(settingsTrigger).toBeFocused()

        await enterLab(page)
        await assertPageFits(page)
        await expect(page.locator('.system-button')).toHaveCount(5)
        if (viewport.width < 680) {
          const railButtons = await page.locator('.system-button').evaluateAll((elements) => elements.map((element) => {
            const box = element.getBoundingClientRect()
            return { left: box.left, top: box.top, bottom: box.bottom, width: box.width }
          }))
          for (let index = 1; index < railButtons.length; index += 1) {
            expect(Math.abs(railButtons[index]!.left - railButtons[0]!.left)).toBeLessThanOrEqual(1)
            expect(railButtons[index]!.top).toBeGreaterThanOrEqual(railButtons[index - 1]!.bottom - 1)
            expect(Math.abs(railButtons[index]!.width - railButtons[0]!.width)).toBeLessThanOrEqual(1)
          }
          const hint = await page.locator('.interaction-hint').boundingBox()
          expect(hint).not.toBeNull()
          expect(hint!.x + hint!.width / 2).toBeGreaterThan(viewport.width / 2 + 10)
          if (locale === 'en' && vehicle === 'student-ev') {
            await page.waitForTimeout(700)
            await page.screenshot({ path: testInfo.outputPath('student-en-390x844-lab.png') })
          }
        }
        const railLabels = await page.locator('.system-name strong').evaluateAll((elements) => elements.map((element) => ({
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          clientHeight: element.clientHeight,
          lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight) || Number.parseFloat(getComputedStyle(element).fontSize) * 1.4,
        })))
        for (const label of railLabels) {
          expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth + 1)
          expect(label.clientHeight).toBeLessThanOrEqual(label.lineHeight + 2)
        }

        const courseButton = page.locator('.lab-topbar .top-button').filter({ has: page.locator('svg.lucide-map') })
        const knowledgeButton = page.locator('.lab-topbar .top-button').filter({ has: page.locator('svg.lucide-book-open-check') })
        if (viewport.width < 680) {
          const courseIconAlignment = await courseButton.evaluate((button) => {
            const buttonBox = button.getBoundingClientRect()
            const iconBox = button.querySelector('svg')!.getBoundingClientRect()
            return {
              x: Math.abs((buttonBox.left + buttonBox.width / 2) - (iconBox.left + iconBox.width / 2)),
              y: Math.abs((buttonBox.top + buttonBox.height / 2) - (iconBox.top + iconBox.height / 2)),
            }
          })
          expect(courseIconAlignment.x).toBeLessThanOrEqual(1.1)
          expect(courseIconAlignment.y).toBeLessThanOrEqual(1.6)
        }

        await courseButton.click()
        const courseMap = page.locator('.course-modal')
        await expect(courseMap).toBeVisible()
        await expect(courseMap.locator('.course-node')).toHaveCount(8)
        await courseMap.locator('.course-node').last().scrollIntoViewIfNeeded()
        await assertNoHorizontalOverflow(courseMap)
        if (viewport.width < 680) await courseMap.screenshot({ path: testInfo.outputPath(`course-${locale}-${vehicle}.png`) })
        await courseMap.locator('.settings-close').click()

        await knowledgeButton.click()
        const knowledge = page.locator('.knowledge-modal')
        await expect(knowledge).toBeVisible()
        await expect(knowledge.locator('.knowledge-categories button')).toHaveCount(5)
        await expect(knowledge.locator('.knowledge-parts button')).toHaveCount(3)
        await knowledge.locator('.knowledge-categories button').last().scrollIntoViewIfNeeded()
        await knowledge.locator('.knowledge-parts button').last().scrollIntoViewIfNeeded()
        await assertNoHorizontalOverflow(knowledge)
        if (locale === 'en') await expect(knowledge).not.toContainText(/[\u3400-\u9fff]/)
        if (viewport.width < 680) await knowledge.screenshot({ path: testInfo.outputPath(`knowledge-${locale}-${vehicle}.png`) })
        await knowledge.locator('.settings-close').click()

        if (viewport.width >= 1200 && vehicle === 'grand-prix-2026') {
          await page.locator('button.garage-launch').click()
          const garage = page.locator('.garage-modal')
          await garage.locator('[data-grand-prix-team="mercedes"]').click()
          const profileHero = await garage.locator('.garage-profile-hero').evaluate((hero) => {
            const heroBox = hero.getBoundingClientRect()
            const carBox = hero.querySelector('.garage-car-hero')!.getBoundingClientRect()
            const wheels = [...hero.querySelectorAll('.garage-car-art__wheel')].map((wheel) => {
              const box = wheel.getBoundingClientRect()
              return { top: box.top, bottom: box.bottom }
            })
            const label = hero.querySelector(':scope > div:last-child > span')!
            const title = hero.querySelector('h3')!
            const description = hero.querySelector('p')!
            return {
              hero: { top: heroBox.top, bottom: heroBox.bottom, height: heroBox.height },
              car: { top: carBox.top, bottom: carBox.bottom, height: carBox.height },
              wheels,
              labelFont: Number.parseFloat(getComputedStyle(label).fontSize),
              titleFont: Number.parseFloat(getComputedStyle(title).fontSize),
              descriptionFont: Number.parseFloat(getComputedStyle(description).fontSize),
            }
          })
          expect(profileHero.hero.height).toBeGreaterThanOrEqual(158)
          expect(profileHero.car.height).toBeGreaterThanOrEqual(136)
          expect(profileHero.wheels).toHaveLength(2)
          profileHero.wheels.forEach((wheel) => {
            expect(wheel.top).toBeGreaterThanOrEqual(profileHero.hero.top + 1)
            expect(wheel.bottom).toBeLessThanOrEqual(profileHero.hero.bottom - 3)
          })
          expect(profileHero.labelFont).toBeGreaterThanOrEqual(12)
          expect(profileHero.titleFont).toBeGreaterThanOrEqual(32)
          expect(profileHero.descriptionFont).toBeGreaterThanOrEqual(16)
          await garage.screenshot({ path: testInfo.outputPath(`grand-prix-profile-${locale}.png`) })
          await garage.getByRole('tab', { name: locale === 'zh' ? '当家车手' : 'Driver line-up' }).click()
          await page.waitForTimeout(320)
          const layout = await garage.locator('.garage-drivers').evaluate((panel) => {
            const panelBox = panel.getBoundingClientRect()
            const teams = [...panel.querySelectorAll<HTMLElement>('[data-driver-team]')]
            return {
              panelBottom: panelBox.bottom,
              teamHeights: teams.map(team => team.getBoundingClientRect().height),
              teamBottoms: teams.map(team => team.getBoundingClientRect().bottom),
              driverHeights: teams.map(team => [...team.querySelectorAll<HTMLElement>('[data-driver-id]')].map(driver => driver.getBoundingClientRect().height)),
            }
          })
          expect(Math.max(...layout.teamHeights) - Math.min(...layout.teamHeights)).toBeLessThanOrEqual(1)
          expect(Math.max(...layout.teamBottoms.map(bottom => Math.abs(layout.panelBottom - 5 - bottom)))).toBeLessThanOrEqual(2)
          layout.driverHeights.forEach((heights) => {
            expect(heights).toHaveLength(2)
            expect(Math.abs(heights[0]! - heights[1]!)).toBeLessThanOrEqual(1)
          })
          await garage.screenshot({ path: testInfo.outputPath(`grand-prix-driver-line-up-${locale}.png`) })
          await garage.locator('.garage-close').click()
        }
        await assertPageFits(page)
      }
    }
  }

  expect(errors).toEqual([])
})

test('portrait transient learning panels preserve focus and fit without overlap traps', async ({ page }) => {
  const errors = captureErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('racecar-lab-locale', 'en')
    localStorage.setItem('racecar-lab-vehicle', 'student-ev')
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.intro-actions .button--primary').click()

  const lesson = page.locator('.lesson-panel')
  await expect(lesson).toBeVisible()
  await lesson.locator('.panel-minimize').click()
  const lessonMini = page.locator('.panel-minibutton--lesson')
  await expect(lessonMini).toBeFocused()
  await lessonMini.click()
  await expect(page.locator('.lesson-panel .panel-minimize')).toBeFocused()

  const lessonPartButtons = page.locator('.lesson-parts button')
  await lessonPartButtons.first().evaluate((button: HTMLButtonElement) => button.click())
  const partPanel = page.locator('.part-panel')
  await expect(partPanel).toBeVisible()
  await partPanel.locator('.panel-minimize').click()
  const partMini = page.locator('.panel-minibutton--part')
  await expect(partMini).toBeFocused()
  await partMini.click()
  await expect(page.locator('.part-panel .panel-minimize')).toBeFocused()

  const deepButton = page.locator('.part-deep-button')
  await deepButton.click()
  const detail = page.locator('.engineering-detail')
  await expect(detail).toBeVisible()
  await assertNoHorizontalOverflow(detail)
  const detailTabs = detail.locator('[role="tab"]')
  await expect(detailTabs).toHaveCount(5)
  await detailTabs.first().focus()
  await page.keyboard.press('End')
  await expect(detailTabs.last()).toBeFocused()
  await expect(detailTabs.last()).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Home')
  await expect(detailTabs.first()).toBeFocused()
  await detail.locator('.engineering-detail__body').evaluate((element) => { element.scrollTop = 200 })
  await detailTabs.nth(1).click()
  await expect.poll(() => detail.locator('.engineering-detail__body').evaluate(element => element.scrollTop)).toBe(0)
  await detail.locator('.settings-close').click()
  await expect(deepButton).toBeFocused()
  await partPanel.locator('.icon-button').last().click()

  const lessonPartCount = await lessonPartButtons.count()
  for (let index = 0; index < lessonPartCount; index += 1) {
    await lessonPartButtons.nth(index).evaluate((button: HTMLButtonElement) => button.click())
  }
  if (await partPanel.isVisible()) await partPanel.locator('.icon-button').last().click()
  const finish = page.locator('.lesson-finish')
  await finish.click()
  const quiz = page.locator('.quiz-modal')
  await expect(quiz).toBeVisible()
  await expect(quiz.locator('.quiz-options [role="radio"]')).toHaveCount(4)
  await assertNoHorizontalOverflow(quiz)
  await expect(quiz).not.toContainText(/[\u3400-\u9fff]/)
  await quiz.locator('.quiz-actions .button--glass').click()
  await expect(finish).toBeFocused()

  await assertPageFits(page)
  expect(errors).toEqual([])
})

test('320px portrait keeps navigation, lesson, part and scene controls in separate reachable regions', async ({ page }, testInfo: TestInfo) => {
  const errors = captureErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('racecar-lab-locale', 'en')
    localStorage.setItem('racecar-lab-vehicle', 'grand-prix-2026')
  })
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  await assertPageFits(page)

  await page.getByRole('button', { name: 'Settings' }).click()
  const settings = page.locator('.settings-modal')
  await expect(settings.locator('[data-livery], [data-grand-prix-team]')).toHaveCount(0)
  await assertNoHorizontalOverflow(settings)
  await settings.locator('.settings-close').click()

  await page.locator('.intro-actions .button--primary').click()
  await page.locator('button.garage-launch').click()
  const garage = page.locator('.garage-modal')
  await expect(garage.getByRole('tab')).toHaveCount(3)
  await expect(garage.locator('.garage-header p')).toHaveCount(0)
  await expect(garage.locator('[data-grand-prix-team]')).toHaveCount(4)
  await garage.locator('[data-grand-prix-team="red-bull"]').click()
  await expect(page.locator('.scene-canvas')).toHaveAttribute('data-grand-prix-team', 'red-bull')
  await assertNoHorizontalOverflow(garage)
  const profileBlocks = await garage.locator('.garage-profile-hero, .garage-question, .garage-facts, .garage-sources').evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect()
    return { top: box.top, bottom: box.bottom }
  }))
  for (let index = 1; index < profileBlocks.length; index += 1) {
    expect(profileBlocks[index]!.top).toBeGreaterThanOrEqual(profileBlocks[index - 1]!.bottom - 1)
  }
  await garage.screenshot({ path: testInfo.outputPath('grand-prix-garage-320x568.png') })
  await garage.getByRole('tab', { name: 'Driver line-up' }).click()
  await expect(garage.locator('[data-driver-team]')).toHaveCount(4)
  await expect(garage.locator('[data-driver-id]')).toHaveCount(8)
  await expect(garage.locator('.garage-driver-photo img')).toHaveCount(8)
  await garage.screenshot({ path: testInfo.outputPath('grand-prix-drivers-320x568.png') })
  await garage.locator('[data-driver-id="isack-hadjar"]').scrollIntoViewIfNeeded()
  await expect.poll(() => garage.locator('[data-driver-id="isack-hadjar"] img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  await assertNoHorizontalOverflow(garage)
  const driverRow = garage.locator('[data-driver-id="isack-hadjar"]')
  const driverColumns = await driverRow.locator('.garage-driver-photo, .garage-driver-copy').evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect()
    return { left: box.left, right: box.right }
  }))
  expect(driverColumns[1]!.left).toBeGreaterThanOrEqual(driverColumns[0]!.right - 1)
  await garage.screenshot({ path: testInfo.outputPath('grand-prix-drivers-320x568-bottom.png') })
  await garage.locator('.garage-close').click()

  const rail = page.locator('.system-rail')
  const lesson = page.locator('.lesson-panel')
  const part = page.locator('.part-panel')
  const dock = page.locator('.scenario-dock')
  await expect(rail).toBeVisible()
  await expect(lesson).toBeVisible()
  await expect(part).toBeVisible()
  await expect(dock).toBeVisible()
  await rail.locator('.system-button').last().scrollIntoViewIfNeeded()
  await expect(rail.locator('.system-button').last()).toBeVisible()
  await assertNoHorizontalOverflow(dock)

  const boxes = await Promise.all([rail, lesson, part, dock].map(locator => locator.boundingBox()))
  expect(boxes.every(Boolean)).toBe(true)
  const intersectionArea = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
      * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  expect(intersectionArea(boxes[0]!, boxes[1]!)).toBeLessThanOrEqual(1)
  expect(intersectionArea(boxes[1]!, boxes[2]!)).toBeLessThanOrEqual(1)
  expect(intersectionArea(boxes[2]!, boxes[3]!)).toBeLessThanOrEqual(1)
  await assertPageFits(page)
  await page.screenshot({ path: testInfo.outputPath('grand-prix-320x568-lab.png') })
  expect(errors).toEqual([])
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
    await expect(detail.locator('.eng-metrics article')).toHaveCount(expectedPrincipleMetricCount(id, 'student-ev'))
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
      await expect(observe.locator('[data-metric-id]')).toHaveCount(expectedInteractionMetricCount(id, 'student-ev', 4))
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
    await expect(experiments.nth(index)).toHaveAttribute('aria-pressed', 'true')
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
    await expect(card.locator('.cooling-flip-card__return')).toBeFocused()
    await card.locator('.cooling-flip-card__return').click()
    await expect(card).toHaveAttribute('data-flipped', 'false')
    await expect(card.locator('.cooling-flip-card__front')).toBeFocused()
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
    await expect(card.locator('.cooling-flip-card__return')).toBeFocused()
    await card.locator('.cooling-flip-card__return').click()
    await expect(card).toHaveAttribute('data-flipped', 'false')
    await expect(card.locator('.cooling-flip-card__front')).toBeFocused()
  }

  expect(errors).toEqual([])
})

test('cooling experiments and flip cards remain reachable without horizontal overflow on portrait mobile', async ({ page }, testInfo: TestInfo) => {
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
  await detail.screenshot({ path: testInfo.outputPath('mobile-cooling-observe.png') })

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
  await thirdReference.screenshot({ path: testInfo.outputPath('mobile-cooling-reference-flipped.png') })
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
  await thirdFault.screenshot({ path: testInfo.outputPath('mobile-cooling-fault-flipped.png') })
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
  await expect(page.locator('.settings-modal [data-livery], .settings-modal [data-grand-prix-team]')).toHaveCount(0)
  const settingsWithoutNativeLocaleNames = await page.locator('.settings-modal').evaluate((element) => {
    const clone = element.cloneNode(true) as HTMLElement
    clone.querySelector('[data-locale="zh"]')?.remove()
    return clone.innerText
  })
  expect(settingsWithoutNativeLocaleNames).not.toMatch(/[\u3400-\u9fff]/)
  await page.getByRole('button', { name: 'Close' }).click()
  await enterLab(page)

  const geometrySignatures = new Set<string>()
  const paintSignatures = new Set<string>()
  for (const id of ['ferrari', 'mclaren', 'mercedes', 'red-bull']) {
    await page.locator('button.garage-launch').click()
    const garage = page.locator('.garage-modal')
    await expect(garage).toBeVisible()
    await expect(garage).not.toContainText(/[\u3400-\u9fff]/)
    await expect(garage.getByRole('tab')).toHaveCount(3)
    await expect(garage.locator('.garage-header p')).toHaveCount(0)
    await expect(garage.locator('[data-grand-prix-team]')).toHaveCount(4)
    await garage.locator(`[data-grand-prix-team="${id}"]`).click()
    const scene = page.locator('.scene-canvas')
    await expect(scene).toHaveAttribute('data-grand-prix-team', id)
    await expect(scene).toHaveAttribute('data-gp-power-unit', /.+/)
    await expect(scene).toHaveAttribute('data-gp-nose-profile', /.+/)
    await expect(scene).toHaveAttribute('data-gp-sidepod-width', /.+/)
    await expect(scene).toHaveAttribute('data-gp-paint-signature', /^#[0-9a-f]{6}(\|#[0-9a-f]{6}){9}$/i)
    const signature = await scene.evaluate(element => JSON.stringify([
      element.getAttribute('data-gp-power-unit'),
      element.getAttribute('data-gp-nose-profile'),
      element.getAttribute('data-gp-sidepod-width'),
    ]))
    geometrySignatures.add(signature)
    paintSignatures.add((await scene.getAttribute('data-gp-paint-signature'))!)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('racecar-lab-grand-prix-team'))).toBe(id)
    await expect(garage.locator(`[data-grand-prix-team="${id}"]`)).toHaveAttribute('aria-pressed', 'true')
    await assertNoHorizontalOverflow(garage)
    if (id === 'ferrari') {
      const tabBoxes = await garage.getByRole('tab').evaluateAll(elements => elements.map(element => {
        const box = element.getBoundingClientRect()
        return { left: box.left, right: box.right, width: box.width }
      }))
      const tabsWidth = tabBoxes.at(-1)!.right - tabBoxes[0]!.left
      const tabListWidth = (await garage.locator('.garage-tabs').boundingBox())!.width
      expect(tabsWidth).toBeGreaterThanOrEqual(tabListWidth - 2)
      expect(Math.max(...tabBoxes.map(box => box.width)) - Math.min(...tabBoxes.map(box => box.width))).toBeLessThan(2)
      await garage.getByRole('tab', { name: 'Compare four' }).click()
      await page.waitForTimeout(320)
      await expect(garage.locator('[data-compare-team]')).toHaveCount(4)
      await expect(garage.locator('.garage-compare-lead')).toHaveCount(0)
      await expect(garage.locator('[data-car-art-team]')).toHaveCount(4)
      expect(await garage.locator('[data-car-art-team]').first().locator('path, circle, ellipse').count()).toBeGreaterThan(16)
      const compareSizes = await garage.locator('.garage-compare-grid dt, .garage-compare-grid dd').evaluateAll(elements => elements.map(element => Number.parseFloat(getComputedStyle(element).fontSize)))
      expect(Math.min(...compareSizes)).toBeGreaterThanOrEqual(11)
      expect(Math.max(...compareSizes)).toBeGreaterThanOrEqual(15)
      await assertNoHorizontalOverflow(garage)
      await garage.screenshot({ path: testInfo.outputPath('grand-prix-team-comparison.png') })
      await garage.getByRole('tab', { name: 'Driver line-up' }).click()
      await expect(garage.locator('[data-driver-team]')).toHaveCount(4)
      await expect(garage.locator('[data-driver-id]')).toHaveCount(8)
      await expect(garage.locator('.garage-driver-photo img')).toHaveCount(8)
      await expect.poll(() => garage.locator('[data-driver-id="charles-leclerc"] img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
      const introSize = await garage.locator('.garage-driver-copy > p').first().evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))
      expect(introSize).toBeGreaterThanOrEqual(13)
      await assertNoHorizontalOverflow(garage)
      await garage.screenshot({ path: testInfo.outputPath('grand-prix-driver-line-up.png') })
    }
    await garage.locator('.garage-close').click()
    await page.waitForTimeout(180)
    await scene.screenshot({ path: testInfo.outputPath(`grand-prix-team-${id}.png`) })
  }
  expect(geometrySignatures.size).toBe(4)
  expect(paintSignatures.size).toBe(4)
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
    await panel.locator('.part-deep-button').scrollIntoViewIfNeeded()
    const panelAndDock = await Promise.all([panel.boundingBox(), page.locator('.scenario-dock').boundingBox()])
    expect(panelAndDock[0]!.y + panelAndDock[0]!.height).toBeLessThanOrEqual(panelAndDock[1]!.y + 1)
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
    await expect(detail.locator('.eng-metrics article')).toHaveCount(expectedPrincipleMetricCount(id, 'grand-prix-2026'))
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
    await expect(detail).toBeHidden()
  }

  await page.reload()
  await enterLab(page)
  await expect(page.locator('.scene-canvas')).toHaveAttribute('data-grand-prix-team', 'red-bull')
  await expect(page.locator('button.garage-launch')).toHaveAttribute('data-current-team', 'red-bull')
  await page.locator('button.garage-launch').click()
  await expect(page.locator('.garage-modal [data-grand-prix-team="red-bull"]')).toHaveAttribute('aria-pressed', 'true')
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
  await page.locator('[data-vehicle="grand-prix-2026"]').click()
  await expectAccessible(page)
  await page.getByRole('button', { name: 'Close' }).click()

  await page.locator('button.garage-launch').click()
  await expectAccessible(page)
  await page.getByRole('tab', { name: 'Compare four' }).click()
  await expectAccessible(page)
  await page.getByRole('tab', { name: 'Driver line-up' }).click()
  await expectAccessible(page)
  await page.locator('.garage-close').click()

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
