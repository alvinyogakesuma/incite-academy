/**
 * Batch screenshot runner.
 *
 * Captures every route in the manifest at three viewports using the
 * installed Playwright Chromium - no test runner, no config file.
 * Starts `php artisan serve` itself when the app is not already
 * reachable, logs in once as the screenshot admin, reuses the session
 * for authenticated routes, and writes PNGs to screenshots/<viewport>/.
 *
 * Usage:
 *   npm run screenshots
 *
 * Credentials come from the environment (or .env):
 *   SCREENSHOT_EMAIL (default admin@itera.ac.id)
 *   SCREENSHOT_PASS  (default "password")
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

// -- Configuration -----------------------------------------------------
const BASE_URL = 'http://127.0.0.1:8000';
const OUTPUT_DIR = 'screenshots';

const loadEnvFile = () => {
    const envPath = path.resolve('.env');
    if (!fs.existsSync(envPath)) {
        return;
    }

    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (match && process.env[match[1]] === undefined) {
            process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
        }
    }
};

loadEnvFile();

const EMAIL = process.env.SCREENSHOT_EMAIL ?? 'admin@itera.ac.id';
const PASSWORD = process.env.SCREENSHOT_PASS ?? 'password';

const VIEWPORTS = {
    mobile: { width: 375, height: 812 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 800 },
};

const PUBLIC_ROUTES = [
    { name: 'welcome', url: '/' },
    { name: 'auth-login', url: '/login' },
    { name: 'auth-register', url: '/register' },
    { name: 'auth-forgot-password', url: '/forgot-password' },
    { name: 'auth-reset-password', url: '/reset-password/preview-token' },
];

const AUTH_ROUTES = [
    { name: 'home', url: '/home' },
    { name: 'profile', url: '/profile' },
    { name: 'verify-email', url: '/verify-email' },
    { name: 'confirm-password', url: '/confirm-password' },
];

const ADMIN_ROUTES = [
    { name: 'admin-dashboard', url: '/dashboard' },
    { name: 'admin-users', url: '/dashboard/users' },
    { name: 'admin-courses', url: '/dashboard/courses' },
];

// -- Server management -------------------------------------------------
const isUp = async () => {
    try {
        const response = await fetch(`${BASE_URL}/login`, {
            signal: AbortSignal.timeout(2000),
        });
        return response.ok;
    } catch {
        return false;
    }
};

let serverProcess = null;

const ensureServer = async () => {
    if (await isUp()) {
        console.log(`App already running at ${BASE_URL}`);
        return;
    }

    console.log('Starting php artisan serve...');
    serverProcess = spawn('php', ['artisan', 'serve', '--port=8000'], {
        stdio: 'ignore',
        shell: true,
    });

    for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (await isUp()) {
            console.log('Server is up.');
            return;
        }
    }

    throw new Error('php artisan serve did not become reachable in 30s.');
};

// -- Helpers -----------------------------------------------------------
const capture = async (page, viewport, { name, url }) => {
    const size = VIEWPORTS[viewport];
    await page.setViewportSize(size);
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
    try {
        await page.waitForSelector('#app > *', { timeout: 15000 });
    } catch {
        // Page may legitimately be blank (e.g. a page component that
        // does not exist yet). Capture whatever rendered after a short
        // settle so the sweep continues and records the broken state.
        console.warn(`    '#app' stayed empty for ${url}`);
        await page.waitForTimeout(2000);
    }
    await page.waitForTimeout(1000);

    const dir = path.join(OUTPUT_DIR, viewport);
    fs.mkdirSync(dir, { recursive: true });

    await page.screenshot({ path: path.join(dir, `${name}.png`) });
    console.log(`  [${viewport}] ${name} -> ${dir}/${name}.png`);
};

const captureAll = async (page, viewport, routes) => {
    for (const route of routes) {
        try {
            await capture(page, viewport, route);
        } catch (error) {
            console.warn(
                `  [${viewport}] FAILED ${route.url}: ${error.message}`,
            );
        }
    }
};

// -- Main --------------------------------------------------------------
const run = async () => {
    await ensureServer();

    const browser = await chromium.launch();
    let loggedIn = false;

    try {
        // Log in once and persist the session for the auth/admin passes.
        const loginContext = await browser.newContext({
            viewport: VIEWPORTS.desktop,
        });
        const loginPage = await loginContext.newPage();

        try {
            await loginPage.goto(`${BASE_URL}/login`, {
                waitUntil: 'networkidle',
            });
            await loginPage
                .getByRole('textbox', { name: /email/i })
                .fill(EMAIL);
            await loginPage
                .getByRole('textbox', { name: /^password/i })
                .fill(PASSWORD);
            await loginPage.getByRole('button', { name: /sign in/i }).click();
            // Admins land on /dashboard, other users on /home.
            await loginPage.waitForURL(/\/(home|dashboard)/, {
                timeout: 15000,
            });
            await loginContext.storageState({
                path: path.join(OUTPUT_DIR, '.auth-state.json'),
            });
            loggedIn = true;
            console.log(`Logged in as ${EMAIL}`);
        } catch (error) {
            console.warn(
                `Login failed (${error.message}); auth/admin pages will be skipped.`,
            );
        }
        await loginContext.close();

        for (const viewport of Object.keys(VIEWPORTS)) {
            console.log(`-- ${viewport} --`);

            // Public pages: a clean, logged-out context.
            const publicContext = await browser.newContext({
                viewport: VIEWPORTS[viewport],
            });
            const publicPage = await publicContext.newPage();
            await captureAll(publicPage, viewport, PUBLIC_ROUTES);
            await publicContext.close();

            if (!loggedIn) {
                continue;
            }

            // Authenticated pages: reuse the admin session.
            const authContext = await browser.newContext({
                viewport: VIEWPORTS[viewport],
                storageState: path.join(OUTPUT_DIR, '.auth-state.json'),
            });
            const authPage = await authContext.newPage();
            await captureAll(authPage, viewport, [
                ...AUTH_ROUTES,
                ...ADMIN_ROUTES,
            ]);
            await authContext.close();
        }
    } finally {
        await browser.close();
        if (serverProcess) {
            serverProcess.kill();
            console.log('Stopped php artisan serve.');
        }
    }
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
