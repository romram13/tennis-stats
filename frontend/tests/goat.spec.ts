import { expect, test } from "@playwright/test";
const row = {
  rank: 1,
  playerId: 1,
  name: "Alex Test",
  country: { id: "FRA" },
  active: true,
  totalPoints: 9876,
  tournamentPoints: 6000,
  rankingPoints: 3000,
  achievementsPoints: 876,
  grandSlams: 10,
  titles: 30,
  weeksAtNo1: 40,
  recordsPoints: 76,
};
test("GOAT : pondérations, pagination, URL, tri et détail standard par saison", async ({
  page,
}) => {
  const calls: URL[] = [];
  await page.route("**/api/tennis/**", (route) => {
    const url = new URL(route.request().url());
    calls.push(url);
    if (url.pathname.endsWith("goatListTable"))
      return route.fulfill({
        json: {
          rows: [
            {
              ...row,
              totalPoints:
                url.searchParams.get("tournamentFactor") === "2" ? 15876 : 9876,
            },
          ],
          total: 51,
        },
      });
    if (url.pathname.endsWith("/players/1/goat"))
      return route.fulfill({
        json: {
          ...row,
          careerRankingPoints: 200,
          careerAchievementsPoints: 100,
          tournamentResults: [],
          seasons: [
            {
              season: 2025,
              totalPoints: 1000,
              tournamentPoints: 800,
              rankingPoints: 100,
              achievementsPoints: 100,
              tournamentResults: [{ level: "G", result: "W", count: 1 }],
            },
          ],
        },
      });
    if (url.pathname.endsWith("/players/1"))
      return route.fulfill({ json: { id: 1, name: row.name, grandSlams: 10, tourFinals: 1, masters: 3, olympics: 0, atp500: 8, atp250: 8 } });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/");
  await expect(page).toHaveURL(/\/goat$/);
  await expect(
    page.getByRole("link", { name: row.name, exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/goat-${test.info().project.name}.png`,
    fullPage: true,
  });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page
    .getByRole("combobox", { name: "Tournois", exact: true })
    .selectOption("2");
  await page
    .getByRole("combobox", { name: "Surface", exact: true })
    .selectOption("C");
  await page.getByRole("button", { name: "Appliquer au classement" }).click();
  await expect(page).toHaveURL(/tournamentFactor=2/);
  await expect
    .poll(() =>
      calls
        .filter((u) => u.pathname.endsWith("goatListTable"))
        .at(-1)
        ?.searchParams.get("surface"),
    )
    .toBe("C");
  await expect(page.locator("td.goat-total")).toHaveText(/15\s?876/);
  await page.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect(page).toHaveURL(/current=2/);
  await page
    .getByRole("button", { name: "Points GOAT", exact: true })
    .click();
  await expect(page).not.toHaveURL(/current=2/);
  for (const [key, label] of [
    ["tourFinals", "Masters Finals"],
    ["masters", "Masters 1000"],
    ["olympics", "Jeux olympiques"],
  ]) {
    const button = page.getByRole("button", { name: label, exact: true });
    await expect(button).toHaveAttribute("title", label);
    for (const direction of ["desc", "asc"]) {
      await button.click();
      await expect.poll(() =>
        calls.filter((url) => url.pathname.endsWith("goatListTable")).at(-1)?.searchParams.get(`sort[${key}]`),
      ).toBe(direction);
      await expect(button.locator("..")).toHaveAttribute("aria-sort", direction === "desc" ? "descending" : "ascending");
    }
  }
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Tournois", exact: true }),
  ).toHaveValue("2");
  await page
    .getByRole("button", { name: "Détail des points de Alex Test" })
    .click();
  await expect(
    page.getByText("Ventilation avec les pondérations actuelles"),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Carrière et saisons au barème standard" })
    .click();
  await expect(page.getByRole("heading", { name: row.name })).toBeVisible();
  await expect(page).toHaveURL(/joueurs\/1\/goat\?surface=C/);
  const titles = page.getByRole("region", { name: "Titres remportés" });
  await expect(titles.locator(".title-metric")).toHaveCount(6);
  await expect(titles.locator(".title-metric").filter({ hasText: "Grand Chelem" }).locator("dd")).toHaveText("10");
  await expect(titles.locator(".title-metric").filter({ hasText: "Jeux olympiques" }).locator("dd")).toHaveText("0");
  await expect(titles.getByText("Palmarès de carrière, toutes surfaces.")).toBeVisible();
  await expect(
    page.getByText(/9\s?876/, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("rowheader", { name: "2025", exact: true }),
  ).toBeVisible();
  await page.getByText("Détails 2025", { exact: true }).click();
  await expect(page.getByText("Grand Chelem · victoire : 1")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});

test("GOAT : erreur, réessai, résultat vide, réinitialisation et barème", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/tennis/**", (route) => {
    if (route.request().url().includes("goat/legend"))
      return route.fulfill({
        json: {
          tournaments: [{ level: "G", result: "W", goatPoints: 800 }],
          yearEndRank: [],
          bestRank: [],
          bestElo: [],
          weeksAtNo1: 4,
          careerGrandSlam: 1000,
          seasonGrandSlam: 2000,
        },
      });
    return route.fulfill(
      fail ? { status: 503, json: {} } : { json: { rows: [], total: 0 } },
    );
  });
  await page.goto("/goat?rankingFactor=0");
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(page.getByText(/Aucun joueur pour ces critères/)).toBeVisible();
  await page.getByRole("button", { name: "Réinitialiser" }).click();
  await expect(page).toHaveURL(/\/goat$/);
  await expect(
    page.getByRole("combobox", { name: "Classement", exact: true }),
  ).toHaveValue("1");
  await page
    .getByText("Comprendre le calcul et consulter le barème standard")
    .click();
  await expect(page.getByText("4 semaines nº 1 = 1 point.")).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "800", exact: true }),
  ).toBeVisible();
});

test("GOAT : regroupement par pays", async ({ page }) => {
  await page.route("**/api/tennis/**", (route) => {
    if (route.request().url().endsWith("goatListTable?rowCount=0"))
      return route.fulfill({
        json: {
          total: 3,
          rows: [
            { ...row, playerId: 1, name: "Alex Test", totalPoints: 900 },
            { ...row, playerId: 2, name: "Sam Test", totalPoints: 600 },
            {
              ...row,
              playerId: 3,
              name: "Taylor Test",
              country: { id: "USA" },
              totalPoints: 1000,
            },
          ],
        },
      });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto("/goat/pays");
  await expect(
    page.getByRole("heading", { name: "Classement par pays" }),
  ).toBeVisible();
  await expect(page.getByRole("row", { name: /FRA.*2.*1\s?500/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Alex Test" })).toBeVisible();
  await expect(page.getByRole("row", { name: /USA.*1.*1\s?000/ })).toBeVisible();
});
