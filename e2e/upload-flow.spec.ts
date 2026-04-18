import { test, expect } from '@playwright/test'
import {
  createLandscapePng,
  createPortraitPng,
  uploadTestImage,
  uploadMultipleTestImages,
} from './test-helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('can upload a single image and see it in the grid', async ({ page }) => {
  await uploadTestImage(page, 'landscape.png', createLandscapePng())

  // Photo should appear in grid with its filename
  await expect(page.getByText('landscape.png')).toBeVisible()
})

test('can upload multiple images and see correct count in stats bar', async ({
  page,
}) => {
  await uploadMultipleTestImages(page, [
    { name: 'photo1.png', buffer: createLandscapePng() },
    { name: 'photo2.png', buffer: createPortraitPng() },
    { name: 'photo3.png', buffer: createLandscapePng() },
  ])

  // Stats bar should show "3 photos"
  await expect(page.getByText('3 photos')).toBeVisible()
})

test('shows file name and dimensions for uploaded photo', async ({ page }) => {
  await uploadTestImage(page, 'test-shot.png', createLandscapePng())

  await expect(page.getByText('test-shot.png')).toBeVisible()
  // Landscape PNG is 10x5
  await expect(page.getByText('10 × 5')).toBeVisible()
})

test('Clear All button removes all photos', async ({ page }) => {
  await uploadMultipleTestImages(page, [
    { name: 'a.png', buffer: createLandscapePng() },
    { name: 'b.png', buffer: createPortraitPng() },
  ])

  // Verify photos are present
  await expect(page.getByText('2 photos')).toBeVisible()

  // Click Clear all
  await page.getByText('Clear all').click()

  // Photos should be gone; upload zone should reappear
  await expect(page.getByText('2 photos')).not.toBeVisible()
  await expect(page.getByText('a.png')).not.toBeVisible()
  await expect(
    page.getByText('Drop photos here or click to browse'),
  ).toBeVisible()
})
