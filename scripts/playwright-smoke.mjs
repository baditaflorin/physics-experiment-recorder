import { chromium } from "playwright";

const baseURL = "http://127.0.0.1:4175/physics-experiment-recorder/";

const browser = await chromium.launch({
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-sandbox"],
});

try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  page.setDefaultTimeout(15_000);
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await expectVisible(page, "h1", /phone video to physics data/i);
  await expectAttribute(
    page,
    'a:has-text("Star on GitHub")',
    "href",
    "https://github.com/baditaflorin/physics-experiment-recorder",
  );
  await expectAttribute(
    page,
    'a:has-text("Support")',
    "href",
    "https://www.paypal.com/paypalme/florinbadita",
  );
  await page.getByRole("button", { name: "Demo" }).click();
  await expectVisible(page, "text=Demo Pendulum Track");
  await page.getByRole("button", { name: "Fit" }).click();
  await page.waitForSelector(".fit-summary");
  const fitText = await page.locator(".fit-summary").innerText();
  if (!fitText.includes("pendulum") || !fitText.includes("R2")) {
    throw new Error(`Fit summary did not contain expected text: ${fitText}`);
  }
} finally {
  await browser.close();
}

process.stdout.write("Playwright smoke passed\n");

async function expectVisible(page, selector, pattern) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible" });
  if (pattern) {
    const text = await locator.innerText();
    if (!pattern.test(text)) {
      throw new Error(`Expected ${selector} to match ${pattern}, got ${text}`);
    }
  }
}

async function expectAttribute(page, selector, name, expected) {
  const actual = await page.locator(selector).first().getAttribute(name);
  if (actual !== expected) {
    throw new Error(`Expected ${selector} ${name}=${expected}, got ${actual}`);
  }
}
