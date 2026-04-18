import { test, expect } from '@playwright/test'
import { createLandscapePng, uploadTestImage } from './test-helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  // Clear any persisted settings from localStorage
  await page.evaluate(() => localStorage.removeItem('squarify-settings'))
  await page.reload()
})

test('can switch between Solid Color and Background Image fill types', async ({
  page,
}) => {
  const solidBtn = page.getByRole('button', { name: 'Solid Color' })
  const bgImgBtn = page.getByRole('button', { name: 'Background Image' })

  // Solid Color is default (active)
  await expect(solidBtn).toBeVisible()
  await expect(bgImgBtn).toBeVisible()

  // Switch to Background Image
  await bgImgBtn.click()
  // "Upload image" button should appear (background image UI)
  await expect(
    page.getByRole('button', { name: 'Upload image' }),
  ).toBeVisible()

  // Switch back to Solid Color
  await solidBtn.click()
  // Color hex input should appear
  await expect(page.locator('input[placeholder="#ffffff"]')).toBeVisible()
})

test('can change the fill color using the hex input', async ({ page }) => {
  const hexInput = page.locator('input[placeholder="#ffffff"]')
  await expect(hexInput).toBeVisible()

  // Clear and type new color
  await hexInput.fill('#ff0000')
  await expect(hexInput).toHaveValue('#ff0000')
})

test('style buttons appear when Background Image is selected', async ({
  page,
}) => {
  // Switch to Background Image
  await page.getByRole('button', { name: 'Background Image' }).click()

  // Style buttons should be visible
  await expect(page.getByRole('button', { name: 'cover' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'contain' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'tile' })).toBeVisible()
})

test('Process button is disabled when no photos are uploaded', async ({
  page,
}) => {
  const processBtn = page.getByRole('button', { name: 'Process Images' })
  await expect(processBtn).toBeVisible()
  await expect(processBtn).toBeDisabled()
})
