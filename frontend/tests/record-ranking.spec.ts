import { expect, test } from "@playwright/test";

const definition = { id: "Titles", name: "Most Titles", category: "Most Titles", columns: [
  { name: "value", caption: "Titles", align: "right" },
  { name: "season", caption: "Season" },
  { name: "tournament", caption: "Tournament" },
] };

test("ouvrir un record et parcourir son classement", async ({ page }) => {
  await page.route("**/api/tennis/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/records/Titles")) return route.fulfill({ json: definition });
    if (url.pathname.endsWith("/recordsTable")) return route.fulfill({ json: { total: 1, rows: [
      { id: "Titles", name: "Most Titles", value: "109", recordHolders: [] },
    ] } });
    const current = Number(url.searchParams.get("current"));
    expect(url.searchParams.get("recordId")).toBe("Titles");
    expect(url.searchParams.get("active")).toBe("false");
    return route.fulfill({ json: { total: 21, current, rows: [
      { rank: current === 1 ? 1 : 21, playerId: 1, name: current === 1 ? "Alex Test" : "Sam Test", country: { id: "FRA" }, value: 109, season: 2025, tournament: { name: "Paris" } },
    ] } });
  });
  await page.goto("/records");
  await page.getByRole("link", { name: "Most Titles", exact: true }).click();
  await expect(page).toHaveURL(/\/records\/Titles$/);
  await expect(page.getByRole("heading", { name: "Most Titles", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Titles", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "2025", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Paris", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Alex Test" })).toHaveAttribute("href", "/joueurs/1");
  await page.getByRole("button", { name: "Page suivante" }).click();
  await expect(page.getByRole("link", { name: "Sam Test" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Page suivante" })).toBeDisabled();
  await page.getByRole("button", { name: "Page précédente" }).click();
  await expect(page.getByRole("link", { name: "Alex Test" })).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("accès direct, erreur et classement vide", async ({ page }) => {
  let failing = true;
  await page.route("**/api/tennis/**", (route) => {
    if (failing) return route.fulfill({ status: 404, json: {} });
    return route.fulfill({ json: route.request().url().includes("recordTable?") ? { total: 0, rows: [] } : definition });
  });
  await page.goto("/records/Titles");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("introuvables");
  failing = false;
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page.getByRole("heading", { name: "Aucun résultat disponible" })).toBeVisible();
});
