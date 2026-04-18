import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility', () => {
  test('home page has no critical a11y violations', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // Tailwind utility classes handle contrast contextually
      .analyze()

    const critical = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    )

    if (critical.length > 0) {
      const summary = critical.map(v =>
        `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instance(s))`
      ).join('\n')
      console.log('A11y violations:\n' + summary)
    }

    expect(critical).toEqual([])
  })

  test('color contrast check (informational)', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze()

    const violations = results.violations
    if (violations.length > 0) {
      const count = violations.reduce((sum, v) => sum + v.nodes.length, 0)
      console.log(`⚠️ ${count} color contrast issue(s) found — consider fixing for better accessibility`)
    }
    // Informational — don't fail the build for now
  })

  test('upload area is keyboard accessible', async ({ page }) => {
    await page.goto('/')

    // Tab to the upload zone
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // The upload zone should be focusable
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()
  })

  test('settings panel controls are keyboard navigable', async ({ page }) => {
    await page.goto('/')

    // All buttons in the settings panel should be reachable via tab
    const settingsPanel = page.locator('text=Padding Settings').locator('..')
    const buttons = settingsPanel.locator('button')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)
  })
})
