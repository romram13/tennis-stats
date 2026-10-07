import { expect, test } from "@playwright/test";

test("fiche joueur : onglet records, recherche, pagination et navigation", async ({ page }) => {
  const queries: URLSearchParams[] = [];
  await page.route("**/api/tennis/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/players/1")) return route.fulfill({ json: { id: 1, name: "Alex Test", country: { id: "FRA" } } });
    if (url.pathname.endsWith("/players/1/seasons")) return route.fulfill({ json: [] });
    if (url.pathname.endsWith("/matchesTable")) return route.fulfill({ json: { total: 0, rows: [] } });
    if (url.pathname.endsWith("/playerRecordsTable")) {
      queries.push(url.searchParams);
      return route.fulfill({ json: { total: 21, rows: [
        { id: "GrandSlamTitles", name: "Most Grand Slam Titles", value: "24", details: ["1968–2026"], recordHolders: [] },
        { id: "MostTitles", name: "Most Titles", value: "109", recordHolders: [{ playerId: 2, name: "Sam Test" }] },
      ] } });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/joueurs/1");
  const tabs = page.getByRole("navigation", { name: "Rubriques du joueur" });
  await tabs.getByRole("link", { name: "Records", exact: true }).click();
  await expect(page).toHaveURL(/\/joueurs\/1\?tab=records$/);
  await expect(tabs.getByRole("link", { name: "Records", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Records de Alex Test" })).toBeVisible();
  const records = page.getByRole("region", { name: "Records du joueur", exact: true });
  await expect(records.getByText("Seul détenteur", { exact: true })).toBeVisible();
  await expect(records.getByText("1968–2026")).toBeVisible();
  await expect(records.getByRole("link", { name: "Sam Test" })).toHaveAttribute("href", "/joueurs/2");
  await expect(records.getByRole("link", { name: "Most Grand Slam Titles" })).toHaveAttribute("href", "/records/GrandSlamTitles");
  await expect.poll(() => queries.at(-1)?.get("playerId")).toBe("1");
  await records.getByRole("button", { name: "Page suivante" }).click();
  await expect(records.getByText("21 records · Page 2")).toBeVisible();
  await records.getByRole("searchbox", { name: "Rechercher un record" }).fill("Grand Slam");
  await records.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.get("searchPhrase")).toBe("Grand Slam");
  await expect(records.getByText("21 records · Page 1")).toBeVisible();
  await records.getByLabel("Type de records").selectOption("true");
  await expect.poll(() => queries.at(-1)?.get("infamous")).toBe("true");
  await page.reload();
  await expect(tabs.getByRole("link", { name: "Records", exact: true })).toHaveAttribute("aria-current", "page");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await tabs.getByRole("link", { name: "Profil et matchs" }).click();
  await expect(page.getByRole("heading", { name: "Les matchs" })).toBeVisible();
});

test("records du joueur : erreur, réessai et liste vide", async ({ page }) => {
  let failing = true;
  await page.route("**/api/tennis/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/players/1")) return route.fulfill({ json: { id: 1, name: "Alex Test", country: { id: "FRA" } } });
    if (path.endsWith("/players/1/seasons")) return route.fulfill({ json: [] });
    if (path.endsWith("/playerRecordsTable")) return failing
      ? route.fulfill({ status: 503, json: {} })
      : route.fulfill({ json: { total: 0, rows: [] } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/joueurs/1?tab=records");
  const records = page.getByRole("region", { name: "Records du joueur", exact: true });
  await expect(records.getByRole("alert")).toContainText("Records indisponibles");
  failing = false;
  await records.getByRole("button", { name: "Réessayer" }).click();
  await expect(records.getByRole("heading", { name: "Aucun record trouvé" })).toBeVisible();
});
