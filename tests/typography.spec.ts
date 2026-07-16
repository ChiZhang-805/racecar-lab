import { expect, test, type Locator, type Page } from '@playwright/test'

const PART_IDS = ['front-wing', 'rear-wing', 'floor', 'nose', 'monocoque', 'halo', 'tires', 'brakes', 'front-suspension', 'rear-suspension', 'steering', 'battery', 'inverter', 'motor', 'differential', 'cooling', 'ecu', 'sensors'] as const

type CopyMetric = {
  forced: boolean
  lines: number
  ratio: number
  text: string
}

async function balancedCopyMetrics(root: Locator): Promise<CopyMetric[]> {
  await expect.poll(async () => root.locator('[data-balanced-copy]').evaluateAll((elements) => elements.filter((element) => {
    const paragraph = element as HTMLParagraphElement
    const bounds = paragraph.getBoundingClientRect()
    const style = getComputedStyle(paragraph)
    const visible = style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && bounds.width >= 120 && bounds.height >= 1
    return visible && paragraph.dataset.balanceReady === undefined
  }).length), { timeout: 2_000 }).toBe(0)
  return root.locator('[data-balanced-copy]').evaluateAll((elements) => elements.flatMap((element) => {
    const paragraph = element as HTMLParagraphElement
    const bounds = paragraph.getBoundingClientRect()
    const style = getComputedStyle(paragraph)
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0 || bounds.width < 120 || bounds.height < 1) return []

    const rows: Array<{ top: number; left: number; right: number }> = []
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const textNode = walker.currentNode
      const range = document.createRange()
      range.selectNodeContents(textNode)
      for (const rect of range.getClientRects()) {
        if (rect.width < 1 || rect.height < 1 || rect.bottom <= bounds.top + 1 || rect.top >= bounds.bottom - 1) continue
        const row = rows.find((candidate) => Math.abs(candidate.top - rect.top) < 2)
        if (row) {
          row.left = Math.min(row.left, rect.left)
          row.right = Math.max(row.right, rect.right)
        } else {
          rows.push({ top: rect.top, left: rect.left, right: rect.right })
        }
      }
    }
    rows.sort((a, b) => a.top - b.top)
    if (rows.length < 2) return []

    const boxContentWidth = bounds.width
      - Number.parseFloat(style.borderInlineStartWidth || style.borderLeftWidth)
      - Number.parseFloat(style.borderInlineEndWidth || style.borderRightWidth)
      - Number.parseFloat(style.paddingInlineStart || style.paddingLeft)
      - Number.parseFloat(style.paddingInlineEnd || style.paddingRight)
    const contentElement = paragraph.querySelector<HTMLElement>('.balanced-copy__content')
    const contentWidth = style.display.includes('flex') && contentElement
      ? contentElement.getBoundingClientRect().width
      : boxContentWidth
    const last = rows.at(-1)!
    return [{
      forced: paragraph.querySelector('br') !== null,
      lines: rows.length,
      ratio: (last.right - last.left) / contentWidth,
      text: (paragraph.textContent ?? '').trim().slice(0, 120),
    }]
  }))
}

async function expectBalancedCopy(root: Locator, context: string) {
  const metrics = await balancedCopyMetrics(root)
  const orphaned = metrics.filter(({ ratio }) => ratio < 0.67)
  const forcedOutsideTarget = metrics.filter(({ forced, ratio }) => forced && (ratio < 0.7 || ratio > 0.9))
  expect(orphaned, `${context}: explanatory paragraphs must not leave an orphaned desktop last line`).toEqual([])
  expect(forcedOutsideTarget, `${context}: rebalanced last lines should occupy about 80% of the text measure`).toEqual([])
}

async function enterLab(page: Page) {
  await page.locator('.intro-actions .button--glass').click()
  await expect(page.locator('.lab-topbar')).toBeVisible()
}

for (const vehicle of ['student-ev', 'grand-prix-2026'] as const) {
  for (const locale of ['zh', 'en'] as const) {
    test(`desktop explanatory copy is balanced across every ${vehicle}/${locale} learning surface`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/')
      await page.evaluate(({ nextLocale, nextVehicle }) => {
        localStorage.setItem('racecar-lab-locale', nextLocale)
        localStorage.setItem('racecar-lab-vehicle', nextVehicle)
      }, { nextLocale: locale, nextVehicle: vehicle })
      await page.reload()
      await enterLab(page)

      const courseButton = page.locator('.lab-topbar .top-button').filter({ has: page.locator('svg.lucide-map') })
      await courseButton.click()
      await page.locator('.course-node').first().click()
      const lesson = page.locator('.lesson-panel')
      await expect(lesson).toBeVisible()
      await expectBalancedCopy(lesson, `${vehicle}/${locale}/lesson`)
      await lesson.locator('.panel-actions button').last().click()

      const knowledgeButton = page.locator('.lab-topbar .top-button').filter({ has: page.locator('svg.lucide-book-open-check') })
      await knowledgeButton.click()
      const knowledge = page.locator('.knowledge-modal')
      for (let categoryIndex = 0; categoryIndex < 5; categoryIndex += 1) {
        await knowledge.locator('.knowledge-categories button').nth(categoryIndex).click()
        const partCount = await knowledge.locator('.knowledge-parts button').count()
        for (let partIndex = 0; partIndex < partCount; partIndex += 1) {
          await knowledge.locator('.knowledge-parts button').nth(partIndex).click()
          await knowledge.locator('.knowledge-options button').first().click()
          await knowledge.locator('.knowledge-actions .button').click()
          await expectBalancedCopy(knowledge, `${vehicle}/${locale}/knowledge/${categoryIndex}/${partIndex}`)
        }
      }
      await knowledge.locator('.settings-close').click()

      for (const partId of PART_IDS) {
        await page.locator(`[data-part-id="${partId}"]`).evaluate((element: HTMLButtonElement) => element.click())
        const panel = page.locator('.part-panel')
        await expect(panel).toBeVisible()
        await expectBalancedCopy(panel, `${vehicle}/${locale}/${partId}/summary`)
        await panel.locator('.part-deep-button').click()

        const detail = page.locator('.engineering-detail')
        await expect(detail).toBeVisible()
        await detail.locator('.component-workshop__parts button').last().click()
        await expectBalancedCopy(detail, `${vehicle}/${locale}/${partId}/intro`)
        for (let tabIndex = 1; tabIndex < 5; tabIndex += 1) {
          await detail.locator('.engineering-tabs button').nth(tabIndex).click()
          await expectBalancedCopy(detail, `${vehicle}/${locale}/${partId}/tab-${tabIndex}`)
        }
        await detail.locator('.settings-close').click()
      }

      if (vehicle === 'grand-prix-2026') {
        await page.locator('button.garage-launch').click()
        const garage = page.locator('.garage-modal')
        for (const team of ['ferrari', 'mclaren', 'mercedes', 'red-bull']) {
          await garage.locator(`[data-grand-prix-team="${team}"]`).click()
          await expectBalancedCopy(garage, `${vehicle}/${locale}/garage/${team}`)
        }
        await garage.locator('.garage-tabs button').nth(1).click()
        await expectBalancedCopy(garage, `${vehicle}/${locale}/garage/compare`)
        await garage.locator('.garage-tabs button').nth(2).click()
        await expectBalancedCopy(garage, `${vehicle}/${locale}/garage/drivers`)
        await garage.locator('.garage-close').click()
      }

      await page.setViewportSize({ width: 390, height: 844 })
      await page.reload()
      await enterLab(page)
      await page.locator('[data-part-id="front-wing"]').evaluate((element: HTMLButtonElement) => element.click())
      await page.waitForTimeout(160)
      await expect(page.locator('[data-balanced-copy] br')).toHaveCount(0)
    })
  }
}
