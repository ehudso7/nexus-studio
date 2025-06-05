import { test, expect } from '@playwright/test'

test.describe('Billing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'testpassword')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should display current plan on dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for plan display
    const planBadge = page.locator('[data-testid="current-plan"]')
    await expect(planBadge).toBeVisible()
    await expect(planBadge).toContainText('Free Plan')
  })

  test('should navigate to billing page', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Click on billing link
    await page.click('a[href="/billing"]')
    await page.waitForURL('/billing')
    
    // Check billing page elements
    await expect(page.locator('h1')).toContainText('Billing & Subscription')
    await expect(page.locator('[data-testid="plan-selector"]')).toBeVisible()
  })

  test('should show plan comparison', async ({ page }) => {
    await page.goto('/billing')
    
    // Check plan cards
    const planCards = page.locator('[data-testid="plan-card"]')
    await expect(planCards).toHaveCount(4) // FREE, STARTER, PRO, ENTERPRISE
    
    // Check features list
    const starterCard = planCards.filter({ hasText: 'Starter' })
    await expect(starterCard.locator('[data-testid="plan-features"] li')).toContainText([
      '10 Projects',
      '5 Team Members',
      '10 GB Storage',
      '100 Deployments/month'
    ])
  })

  test('should upgrade to paid plan', async ({ page }) => {
    await page.goto('/billing')
    
    // Click upgrade on Starter plan
    const starterCard = page.locator('[data-testid="plan-card"]').filter({ hasText: 'Starter' })
    await starterCard.locator('button:has-text("Upgrade")').click()
    
    // Should show payment method modal
    await expect(page.locator('[data-testid="payment-modal"]')).toBeVisible()
    
    // Fill in test card details
    const cardElement = page.frameLocator('iframe[title="Secure card payment input frame"]')
    await cardElement.locator('[placeholder="Card number"]').fill('4242424242424242')
    await cardElement.locator('[placeholder="MM / YY"]').fill('12/25')
    await cardElement.locator('[placeholder="CVC"]').fill('123')
    await cardElement.locator('[placeholder="ZIP"]').fill('12345')
    
    // Confirm upgrade
    await page.click('button:has-text("Confirm Upgrade")')
    
    // Wait for success
    await expect(page.locator('[data-testid="upgrade-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="current-plan"]')).toContainText('Starter Plan')
  })

  test('should show usage metrics', async ({ page }) => {
    await page.goto('/billing/usage')
    
    // Check usage dashboard
    await expect(page.locator('h2:has-text("Current Usage")')).toBeVisible()
    
    // Check usage meters
    const usageMeters = page.locator('[data-testid="usage-meter"]')
    await expect(usageMeters).toHaveCount(7) // All tracked metrics
    
    // Check specific meter
    const projectsUsage = usageMeters.filter({ hasText: 'Projects' })
    await expect(projectsUsage.locator('[data-testid="usage-current"]')).toBeVisible()
    await expect(projectsUsage.locator('[data-testid="usage-limit"]')).toBeVisible()
    await expect(projectsUsage.locator('[data-testid="usage-percentage"]')).toBeVisible()
  })

  test('should download invoice', async ({ page }) => {
    // Navigate to invoices
    await page.goto('/billing/invoices')
    
    // Check invoice list
    await expect(page.locator('[data-testid="invoice-row"]').first()).toBeVisible()
    
    // Click download on first invoice
    const downloadPromise = page.waitForEvent('download')
    await page.locator('[data-testid="invoice-row"]').first().locator('button:has-text("Download")').click()
    
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/invoice-.*\.pdf/)
  })

  test('should cancel subscription', async ({ page }) => {
    await page.goto('/billing')
    
    // Click cancel subscription
    await page.click('button:has-text("Cancel Subscription")')
    
    // Confirm cancellation
    await expect(page.locator('[data-testid="cancel-modal"]')).toBeVisible()
    await page.click('[data-testid="cancel-modal"] button:has-text("Confirm Cancellation")')
    
    // Check success message
    await expect(page.locator('[data-testid="cancellation-notice"]')).toContainText('will be canceled at the end of your billing period')
  })

  test('should manage payment methods', async ({ page }) => {
    await page.goto('/billing/payment-methods')
    
    // Add new card
    await page.click('button:has-text("Add Payment Method")')
    
    // Fill card details
    const cardElement = page.frameLocator('iframe[title="Secure card payment input frame"]')
    await cardElement.locator('[placeholder="Card number"]').fill('5555555555554444')
    await cardElement.locator('[placeholder="MM / YY"]').fill('12/26')
    await cardElement.locator('[placeholder="CVC"]').fill('123')
    
    await page.click('button:has-text("Add Card")')
    
    // Check card added
    await expect(page.locator('[data-testid="payment-method"]')).toHaveCount(2)
    await expect(page.locator('[data-testid="payment-method"]').last()).toContainText('•••• 4444')
  })

  test('should enforce plan limits', async ({ page }) => {
    // Try to create project beyond limit
    await page.goto('/dashboard/projects/new')
    
    // If at limit, should show upgrade prompt
    const limitModal = page.locator('[data-testid="limit-reached-modal"]')
    if (await limitModal.isVisible()) {
      await expect(limitModal).toContainText('You\'ve reached your plan limit')
      await expect(limitModal.locator('button:has-text("Upgrade Plan")')).toBeVisible()
    }
  })

  test('should access billing portal', async ({ page }) => {
    await page.goto('/billing')
    
    // Click manage billing
    const [newPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('button:has-text("Manage Billing")')
    ])
    
    // Should open Stripe billing portal
    await expect(newPage.url()).toContain('billing.stripe.com')
  })
})