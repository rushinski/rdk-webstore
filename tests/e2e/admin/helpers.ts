import type { Page } from "@playwright/test";

export async function openAdminMenuIfNeeded(page: Page) {
  const toggle = page.getByRole("button", { name: /open admin menu/i });
  if (await toggle.isVisible()) {
    await toggle.click();
  }
}
