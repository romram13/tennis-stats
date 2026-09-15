import { expect, test } from "@playwright/test";

// Synthetic fixtures only; the application never displays demonstration data.
const player = {
  id: 1,
  name: "Alex Test",
  country: { id: "FRA" },
  age: 25,
  height: 185,
  currentRank: 1,
  bestRank: 1,
  titles: 8,
  grandSlams: 2,
};
const ranking = {
  rank: 1,
  playerId: 1,
  name: player.name,
  country: player.country,
  points: 12000,
  bestRank: 1,
};

test("classements, pagination, recherche et profil avec filtre de saison", async ({
  page,
}) => {
  const calls: string[] = [];
  await page.route("**/api/tennis/**", (route) => {
    const url = new URL(route.request().url());
    calls.push(url.pathname + url.search);
    let body: unknown;
    if (url.pathname.endsWith("rankingsDate")) body = "2026-01-05";
    else if (url.pathname.endsWith("rankingsTableTable"))
      body = {
        current: Number(url.searchParams.get("current")),
        total: 21,
        rowCount: 1,
        rows: [ranking],
      };
    else if (url.pathname.endsWith("autocompletePlayer"))
      body = [{ id: "1", value: player.name, label: player.name }];
    else if (url.pathname.endsWith("/seasons")) body = [2025, 2026];
    else if (url.pathname.endsWith("/players/1")) body = player;
    else if (url.pathname.endsWith("matchesTable"))
      body = {
        total: 1,
        rows: [
          {
            id: 20,
            date: "2026-01-05",
            tournament: "Tournoi de test",
            surface: "H",
            round: "F",
            score: "6-4 6-3",
            winner: { id: 1, name: player.name },
            loser: { id: 2, name: "Sam Exemple" },
          },
        ],
      };
    else return route.fulfill({ status: 404, json: {} });
    return route.fulfill({ json: body });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Le classement", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Alex Test", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Elo", exact: true }).click();
  await expect(page.getByText("Simple messieurs · Indice Elo")).toBeVisible();
  await expect
    .poll(() => calls.some((url) => url.includes("rankType=ELO_RANK")))
    .toBeTruthy();
  await page
    .getByRole("button", { name: "Page suivante", exact: true })
    .click();
  await expect(page.getByText("21 joueurs · Page 2")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Rechercher un joueur" })
    .fill("Alex");
  await page
    .locator(".search-results")
    .getByRole("link", { name: "Alex Test" })
    .click();
  await expect(page).toHaveURL(/\/joueurs\/1$/);
  await expect(page.getByRole("heading", { name: "Alex Test" })).toBeVisible();
  await expect(page.getByText("Tournoi de test")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Saison", exact: true })
    .selectOption("2025");
  await expect
    .poll(() =>
      calls.some(
        (url) => url.includes("matchesTable") && url.includes("season=2025"),
      ),
    )
    .toBeTruthy();
  await expect(page.getByText("6-4 6-3")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("indisponibilité, nouvelle tentative et classement vide", async ({
  page,
}) => {
  let unavailable = true;
  await page.route("**/api/tennis/**", (route) =>
    unavailable
      ? route.fulfill({ status: 503, json: { error: "offline" } })
      : route.fulfill({
          json: route.request().url().includes("rankingsDate")
            ? null
            : { rows: [], total: 0 },
        }),
  );
  await page.goto("/");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "momentanément indisponibles",
  );
  unavailable = false;
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(
    page.getByText("Aucun classement disponible pour le moment."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("profil absent et route proxy non autorisée", async ({
  page,
  request,
}) => {
  await page.route("**/api/tennis/**", (route) =>
    route.fulfill({ status: 404, json: {} }),
  );
  await page.goto("/joueurs/9999");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "introuvables",
  );
  const denied = await request.get("/api/tennis/actuator/health");
  expect(denied.status()).toBe(404);
});
