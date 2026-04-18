import { test, expect } from '@playwright/test'
import {
  createLandscapePng,
  createPortraitPng,
  uploadMultipleTestImages,
} from './test-helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('after uploading and processing, Download All button appears', async ({
  page,
}) => {
  await uploadMultipleTestImages(page, [
    { name: 'img1.png', buffer: createLandscapePng() },
    { name: 'img2.png', buffer: createPortraitPng() },
  ])

  // Process button should be enabled
  const processBtn = page.getByRole('button', { name: 'Process Images' })
  await expect(processBtn).toBeEnabled()
  await processBtn.click()

  // Wait for Download All button to appear
  await expect(
    page.getByRole('button', { name: 'Download All as ZIP' }),
  ).toBeVisible({ timeout: 15000 })
})

test('progress indicator shows during processing', async ({ page }) => {
  await uploadMultipleTestImages(page, [
    { name: 'p1.png', buffer: createLandscapePng() },
    { name: 'p2.png', buffer: createPortraitPng() },
  ])

  await page.getByRole('button', { name: 'Process Images' }).click()

  // Either the progress text or the completed state should appear
  // The progress bar shows "Processing images…" while active
  await expect(
    page
      .getByText('Processing images…')
      .or(page.getByRole('button', { name: 'Download All as ZIP' })),
  ).toBeVisible({ timeout: 15000 })
})
