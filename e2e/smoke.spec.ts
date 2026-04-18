import { test, expect } from '@playwright/test'

test('app loads and shows header', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Squarify')
  await expect(page.getByText('Pad photos to a uniform aspect ratio')).toBeVisible()
})

test('upload zone is visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Drop photos here or click to browse')).toBeVisible()
})

test('padding settings panel is visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Padding Settings')).toBeVisible()
  await expect(page.getByText('Gradient')).toBeVisible()
  await expect(page.getByText('Blur')).toBeVisible()
})
