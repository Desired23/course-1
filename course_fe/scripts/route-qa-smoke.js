const { chromium, devices } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE_URL = process.env.QA_BASE_URL || 'http://127.0.0.1:4173'
const OUTPUT_DIR = path.resolve(__dirname, '../qa-artifacts/route-smoke')

const ROLE_CONFIGS = [
  {
    role: 'admin',
    username: process.env.QA_ADMIN_USERNAME || 'admin',
    password: process.env.QA_ADMIN_PASSWORD || 'password123',
    routes: [
      '/admin',
      '/admin/statistics',
      '/admin/settings',
      '/admin/website-management',
      '/admin/subscriptions',
    ],
  },
  {
    role: 'instructor',
    username: process.env.QA_INSTRUCTOR_USERNAME || 'nguyenvana',
    password: process.env.QA_INSTRUCTOR_PASSWORD || 'password123',
    routes: [
      '/instructor',
      '/instructor/analytics',
      '/instructor/courses/create',
      '/instructor/discounts',
      '/instructor/lessons',
      '/instructor/quizzes',
      '/instructor/course-landing',
      '/instructor/payouts',
      '/instructor/resources',
      '/instructor/subscription-revenue',
      '/instructor/onboarding',
    ],
  },
]

const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', useDevice: devices['iPhone 13'] },
]

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

async function login(page, username, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('#username', username)
  await page.fill('#password', password)
  await Promise.all([
    page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ])
  await page.waitForTimeout(1200)
  return !page.url().includes('/login')
}

async function checkRoute(page, route, screenshotDir, consoleBag) {
  const startedAt = Date.now()
  let status = 'pass'
  let reason = ''
  let pageError = null
  const localErrors = []

  const onPageError = (error) => {
    pageError = String(error)
  }

  const onConsole = (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      localErrors.push(text)
      consoleBag.push({ route, text })
    }
  }

  page.on('pageerror', onPageError)
  page.on('console', onConsole)

  try {
    const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null)
    await page.waitForTimeout(700)

    const currentUrl = page.url()
    const httpStatus = response ? response.status() : null

    if (currentUrl.includes('/login')) {
      status = 'fail'
      reason = 'redirected_to_login'
    }

    if (httpStatus && httpStatus >= 400 && status === 'pass') {
      status = 'fail'
      reason = `http_${httpStatus}`
    }

    if (pageError && status === 'pass') {
      status = 'fail'
      reason = 'runtime_pageerror'
    }

    if (localErrors.length > 0 && status === 'pass') {
      status = 'warn'
      reason = 'console_errors'
    }

    const metrics = await page.evaluate(() => {
      const h1 = document.querySelector('h1')
      return {
        title: document.title,
        h1: h1 ? h1.textContent.trim().slice(0, 120) : null,
        bodyTextLength: document.body?.innerText?.length || 0,
        documentHeight: document.documentElement?.scrollHeight || 0,
      }
    })

    const fileSafeRoute = route.replace(/[^a-z0-9]/gi, '_').replace(/^_+/, '') || 'root'
    const screenshotPath = path.join(screenshotDir, `${fileSafeRoute}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })

    return {
      route,
      status,
      reason,
      currentUrl,
      httpStatus,
      pageError,
      consoleErrorCount: localErrors.length,
      metrics,
      elapsedMs: Date.now() - startedAt,
      screenshot: screenshotPath,
    }
  } catch (error) {
    return {
      route,
      status: 'fail',
      reason: 'navigation_exception',
      error: String(error),
      elapsedMs: Date.now() - startedAt,
    }
  } finally {
    page.off('pageerror', onPageError)
    page.off('console', onConsole)
  }
}

async function run() {
  ensureDir(OUTPUT_DIR)

  const browser = await chromium.launch({ headless: true })
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    checks: [],
    summary: {},
  }

  try {
    for (const viewportConfig of VIEWPORTS) {
      for (const roleConfig of ROLE_CONFIGS) {
        const contextOptions = viewportConfig.useDevice
          ? { ...viewportConfig.useDevice }
          : { viewport: viewportConfig.viewport }

        const context = await browser.newContext(contextOptions)
        const page = await context.newPage()
        const consoleBag = []

        const loginOk = await login(page, roleConfig.username, roleConfig.password)
        const groupDir = path.join(OUTPUT_DIR, `${viewportConfig.name}-${roleConfig.role}`)
        ensureDir(groupDir)

        if (!loginOk) {
          report.checks.push({
            viewport: viewportConfig.name,
            role: roleConfig.role,
            route: '/login',
            status: 'fail',
            reason: 'login_failed',
            currentUrl: page.url(),
          })
          await context.close()
          continue
        }

        for (const route of roleConfig.routes) {
          const result = await checkRoute(page, route, groupDir, consoleBag)
          report.checks.push({
            viewport: viewportConfig.name,
            role: roleConfig.role,
            ...result,
          })
        }

        if (consoleBag.length > 0) {
          fs.writeFileSync(
            path.join(groupDir, 'console-errors.json'),
            JSON.stringify(consoleBag, null, 2),
            'utf8',
          )
        }

        await context.close()
      }
    }
  } finally {
    await browser.close()
  }

  const total = report.checks.length
  const pass = report.checks.filter((item) => item.status === 'pass').length
  const warn = report.checks.filter((item) => item.status === 'warn').length
  const fail = report.checks.filter((item) => item.status === 'fail').length

  report.summary = { total, pass, warn, fail }

  const reportPath = path.join(OUTPUT_DIR, 'report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')

  console.log(JSON.stringify({ reportPath, summary: report.summary }, null, 2))
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
