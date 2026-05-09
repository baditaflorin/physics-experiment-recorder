import { expect, test } from "@playwright/test";

test("homepage loads and demo flow fits motion", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /phone video to physics data/i }),
  ).toBeVisible();
  await expect(page.getByText(/v0\.2\.0/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /star on github/i }),
  ).toHaveAttribute(
    "href",
    "https://github.com/baditaflorin/physics-experiment-recorder",
  );
  await expect(page.getByRole("link", { name: /support/i })).toHaveAttribute(
    "href",
    "https://www.paypal.com/paypalme/florinbadita",
  );

  await page.getByRole("button", { name: "Demo" }).click();
  await expect(page.getByText("Demo Pendulum Track")).toBeVisible();
  await page.getByRole("button", { name: "Fit" }).click();
  await expect(page.locator(".fit-summary")).toContainText("pendulum");
  await expect(page.locator(".fit-summary")).toContainText("R2");
});
