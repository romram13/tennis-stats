import { expect, test } from "@playwright/test";

const record = { id: "MostTitles", name: "Most Titles", value: "109", goatPoints: "8", recordHolders: [
  { playerId: 1, name: "Alex Test", country: { id: "FRA" }, detail: "1968–2026" },
  { playerId: 2, name: "Sam Test", country: { id: "USA" } },
] };

test("records, pagination, recherche et types", async ({ page }) => {
  const queries: URLSearchParams[] = [];
  await page.route("**/api/tennis/recordsTable?**", (route) => {
    const query = new URL(route.request().url()).searchParams;
    queries.push(query);
    return route.fulfill({ json: { current: Number(query.get("current")), rowCount: 1, total: 21, rows: [record] } });
  });
  await page.goto("/records");
  await expect(page.getByRole("heading", { name: "Les records" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Alex Test", exact: true })).toHaveAttribute("href", "/joueurs/1");
  await expect(page.getByRole("link", { name: "Sam Test", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Page suivante" }).click();
  await expect(page.getByText("21 records · Page 2")).toBeVisible();
  await page.getByRole("searchbox", { name: "Rechercher un record" }).fill("Grand Slam");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect.poll(() => queries.at(-1)?.get("searchPhrase")).toBe("Grand Slam");
  await expect(page.getByText("21 records · Page 1")).toBeVisible();
  await page.getByLabel("Type de records").selectOption("true");
  await expect.poll(() => queries.at(-1)?.get("infamous")).toBe("true");
  await expect(page.getByRole("navigation").getByRole("link", { name: "Records" })).toHaveAttribute("href", "/records");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("erreur, nouvelle tentative et recherche vide", async ({ page }) => {
  let failing = true;
  await page.route("**/api/tennis/recordsTable?**", (route) => failing
    ? route.fulfill({ status: 503, json: {} })
    : route.fulfill({ json: { current: 1, rowCount: 0, total: 0, rows: [] } }));
  await page.goto("/records");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Records indisponibles");
  failing = false;
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page.getByRole("heading", { name: "Aucun record trouvé" })).toBeVisible();
});
