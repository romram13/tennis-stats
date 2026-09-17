import { NextRequest, NextResponse } from "next/server";

// Explicit allowlist: this route cannot proxy administration or arbitrary URLs.
const endpoints = new Set([
  "autocompletePlayer",
  "rankingsTableTable",
  "rankingsDate",
  "matchesTable",
  "goatListTable",
  "goat/legend",
  "recordsTable",
  "recordTable",
]);
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  if (
    !endpoints.has(endpoint) &&
    !/^players\/[1-9]\d*(\/(seasons|goat))?$/.test(endpoint) &&
    !/^records\/[A-Za-z0-9]+$/.test(endpoint)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const base = process.env.API_BASE_URL || "http://127.0.0.1:8080";
    const url = new URL(`/api/v1/${endpoint}`, base);
    url.search = request.nextUrl.search;
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      return NextResponse.json(
        { error: "Upstream unavailable" },
        { status: response.status },
      );
    const text = await response.text();
    return NextResponse.json(text ? JSON.parse(text) : null);
  } catch {
    return NextResponse.json({ error: "API unavailable" }, { status: 503 });
  }
}
