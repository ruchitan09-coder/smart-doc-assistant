import { test, expect } from "@playwright/test";

// Skeleton end-to-end test for the core flow named in the spec:
// sign up -> login -> upload -> process -> open -> ask -> receive answer -> view source.
// Requires TEST_USER_EMAIL / TEST_USER_PASSWORD env vars for a seeded account
// and a sample file at e2e/fixtures/sample.pdf -- fill these in for your environment.
test.skip("core flow: sign in, upload a document, ask a question", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("Email").fill(process.env.TEST_USER_EMAIL ?? "");
  await page.getByPlaceholder("Password").fill(process.env.TEST_USER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/dashboard/);

  await page.goto("/documents");
  await page.setInputFiles('input[type="file"]', "e2e/fixtures/sample.pdf");
  await expect(page.getByText("READY")).toBeVisible({ timeout: 30000 });

  await page.getByText("sample.pdf").click();
  await page.getByPlaceholder(/Ask a question/).fill("What is this document about?");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Sources/)).toBeVisible({ timeout: 20000 });
});

test.skip("bulk actions: select multiple documents and delete them", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("Email").fill(process.env.TEST_USER_EMAIL ?? "");
  await page.getByPlaceholder("Password").fill(process.env.TEST_USER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign In" }).click();

  await page.goto("/documents");
  // Expects at least two documents already present (upload fixtures in
  // beforeAll once this is wired to a seeded test account).
  const checkboxes = page.locator('input[type="checkbox"]');
  await checkboxes.nth(1).check(); // index 0 is "select all"
  await checkboxes.nth(2).check();

  await expect(page.getByText(/2 selected/)).toBeVisible();
  await page.getByRole("button", { name: "Delete" }).click();
  page.once("dialog", (dialog) => dialog.accept()); // confirm() prompt

  await expect(page.getByText(/2 selected/)).not.toBeVisible({ timeout: 10000 });
});

test.skip("docx preview renders inline instead of a download-only link", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByPlaceholder("Email").fill(process.env.TEST_USER_EMAIL ?? "");
  await page.getByPlaceholder("Password").fill(process.env.TEST_USER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign In" }).click();

  await page.goto("/documents");
  await page.setInputFiles('input[type="file"]', "e2e/fixtures/sample.docx");
  await expect(page.getByText("READY")).toBeVisible({ timeout: 30000 });

  await page.getByText("sample.docx").click();
  // The DOCX preview renders converted HTML inside a .prose container,
  // not the old "Preview isn't available" fallback text.
  await expect(page.getByText(/Preview isn't available/)).not.toBeVisible();
  await expect(page.locator(".prose")).toBeVisible({ timeout: 15000 });
});
