import { expect, test } from "@playwright/test";

test("dates des données dans le pied de page commun", async ({ page }) => {
  await page.route("**/api/tennis/**", (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/dataDates"))
      return route.fulfill({
        json: { matches: "2026-10-04", atp: "2026-10-05", elo: null },
      });
    return route.fulfill({ status: 503, json: {} });
  });
  await page.goto("/goat");
  const footer = page.locator("footer");
  await expect(footer.getByText("Matchs : 4 octobre 2026")).toBeVisible();
  await expect(footer.getByText("Classement ATP : 5 octobre 2026")).toBeVisible();
  await expect(footer.getByText("Classement Elo : Date non disponible")).toBeVisible();
  await expect(footer.locator('time[datetime="2026-10-05"]')).toHaveText("5 octobre 2026");
  await page.getByRole("link", { name: "ATP / Elo", exact: true }).click();
  await expect(page).toHaveURL(/\/classements$/);
  await expect(footer.getByText("Matchs : 4 octobre 2026")).toBeVisible();
});

test("dates indisponibles si l’API ne répond pas", async ({ page }) => {
  await page.route("**/api/tennis/**", (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.goto("/classements");
  await expect(page.locator("footer").getByText("Dates momentanément indisponibles")).toBeVisible();
});
