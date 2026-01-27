import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  formatInterlinesInfo,
  formatRouteStationsInfo,
  formatTicketsInfo,
  formatTicketsInfoCSV,
  getCityCodes,
  getCurrentDate,
  getInterlineTickets,
  getStationByTelecode,
  getStations,
  getStationsByNames,
  getStationsInCity,
  getTickets,
  getTrainRouteStations,
  init12306,
} from "./12306/service.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT ?? "8787");

init12306().catch((error) => {
  console.error("12306 init failed:", error);
});

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.toLowerCase();
  return ["1", "true", "yes", "y"].includes(normalized);
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function errorResponse(error: unknown): { status: number; code: string } {
  const message = error instanceof Error ? error.message : "unknown_error";
  switch (message) {
    case "date_before_today":
    case "station_not_found":
    case "train_not_found":
    case "route_not_found":
    case "interline_no_result":
      return { status: 400, code: message };
    case "cookie_failed":
    case "tickets_request_failed":
    case "interline_request_failed":
    case "route_request_failed":
    case "stations_init_failed":
    case "station_js_not_found":
    case "station_js_request_failed":
    case "lcquery_init_failed":
    case "lcquery_path_not_found":
      return { status: 502, code: message };
    default:
      return { status: 500, code: message };
  }
}

app.get("/api/12306/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/12306/date", (_req, res) => {
  res.json({ date: getCurrentDate() });
});

app.get("/api/12306/stations", async (_req, res) => {
  try {
    const stations = await getStations();
    res.json({ stations });
  } catch (error) {
    const { status, code } = errorResponse(error);
    res.status(status).json({ error: code });
  }
});

app.get("/api/12306/stations/city", async (req, res) => {
  const city = req.query.name as string | undefined;
  if (!city) {
    res.status(400).json({ error: "missing_city" });
    return;
  }
  try {
    const stations = await getStationsInCity(city);
    if (!stations) {
      res.status(404).json({ error: "city_not_found" });
      return;
    }
    res.json({ stations });
  } catch (error) {
    const { status, code } = errorResponse(error);
    res.status(status).json({ error: code });
  }
});

app.get("/api/12306/stations/cities", async (req, res) => {
  const names = parseList(req.query.names as string | undefined);
  if (names.length === 0) {
    res.status(400).json({ error: "missing_city_names" });
    return;
  }
  try {
    const result = await getCityCodes(names);
    res.json({ cities: result });
  } catch (error) {
    const { status, code } = errorResponse(error);
    res.status(status).json({ error: code });
  }
});

app.get("/api/12306/stations/by-names", async (req, res) => {
  const names = parseList(req.query.names as string | undefined);
  if (names.length === 0) {
    res.status(400).json({ error: "missing_station_names" });
    return;
  }
  try {
    const result = await getStationsByNames(names);
    res.json({ stations: result });
  } catch (error) {
    const { status, code } = errorResponse(error);
    res.status(status).json({ error: code });
  }
});

app.get("/api/12306/stations/telecode/:code", async (req, res) => {
  try {
    const station = await getStationByTelecode(req.params.code);
    if (!station) {
      res.status(404).json({ error: "station_not_found" });
      return;
    }
    res.json({ station });
  } catch (error) {
    const { status, code } = errorResponse(error);
    res.status(status).json({ error: code });
  }
});

app.get("/api/12306/tickets", async (req, res) => {
  const date = req.query.date as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const format = (req.query.format as string | undefined)?.toLowerCase();
  if (!date || !from || !to) {
    res.status(400).json({ error: "missing_required_params" });
    return;
  }
  try {
    const tickets = await getTickets({
      date,
      from,
      to,
      trainFilterFlags: (req.query.trainFilterFlags as string | undefined) ?? "",
      earliestStartTime: parseNumber(req.query.earliestStartTime as string | undefined, 0),
      latestStartTime: parseNumber(req.query.latestStartTime as string | undefined, 24),
      sortFlag: (req.query.sortFlag as string | undefined) ?? "",
      sortReverse: parseBool(req.query.sortReverse as string | undefined, false),
      limitedNum: parseNumber(req.query.limitedNum as string | undefined, 0),
    });

    if (format === "csv") {
      res.type("text/plain").send(formatTicketsInfoCSV(tickets));
      return;
    }
    if (format === "text") {
      res.type("text/plain").send(formatTicketsInfo(tickets));
      return;
    }
    res.json({ tickets });
  } catch (error) {
    const { status, code } = errorResponse(error);
    res.status(status).json({ error: code });
  }
});

app.get("/api/12306/interline", async (req, res) => {
  const date = req.query.date as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const format = (req.query.format as string | undefined)?.toLowerCase();
  if (!date || !from || !to) {
    res.status(400).json({ error: "missing_required_params" });
    return;
  }
  try {
    const tickets = await getInterlineTickets({
      date,
      from,
      to,
      middleStation: (req.query.middleStation as string | undefined) ?? "",
      showWZ: parseBool(req.query.showWZ as string | undefined, false),
      trainFilterFlags: (req.query.trainFilterFlags as string | undefined) ?? "",
      earliestStartTime: parseNumber(req.query.earliestStartTime as string | undefined, 0),
      latestStartTime: parseNumber(req.query.latestStartTime as string | undefined, 24),
      sortFlag: (req.query.sortFlag as string | undefined) ?? "",
      sortReverse: parseBool(req.query.sortReverse as string | undefined, false),
      limitedNum: parseNumber(req.query.limitedNum as string | undefined, 10),
    });

    if (format === "text") {
      res.type("text/plain").send(formatInterlinesInfo(tickets));
      return;
    }
    res.json({ tickets });
  } catch (error) {
    const { status, code } = errorResponse(error);
    res.status(status).json({ error: code });
  }
});

app.get("/api/12306/route", async (req, res) => {
  const trainCode = req.query.trainCode as string | undefined;
  const departDate = req.query.date as string | undefined;
  const format = (req.query.format as string | undefined)?.toLowerCase();
  if (!trainCode || !departDate) {
    res.status(400).json({ error: "missing_required_params" });
    return;
  }
  try {
    const stations = await getTrainRouteStations({
      trainCode,
      departDate,
    });
    if (format === "text") {
      res.type("text/plain").send(formatRouteStationsInfo(stations));
      return;
    }
    res.json({ stations });
  } catch (error) {
    const { status, code } = errorResponse(error);
    res.status(status).json({ error: code });
  }
});



app.get("/api/search", async (req, res) => {
  const query = req.query.q as string | undefined;
  if (!query) {
    res.status(400).json({ error: "missing_query" });
    return;
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "missing_brave_api_key" });
    return;
  }

  const count = Math.min(10, Math.max(1, parseNumber(req.query.count as string | undefined, 5)));
  const params = new URLSearchParams({
    q: query,
    count: String(count),
  });

  const country = req.query.country as string | undefined;
  const freshness = req.query.freshness as string | undefined;
  const safesearch = req.query.safesearch as string | undefined;
  const searchLang = req.query.search_lang as string | undefined;

  if (country) params.set("country", country);
  if (freshness) params.set("freshness", freshness);
  if (safesearch) params.set("safesearch", safesearch);
  if (searchLang) params.set("search_lang", searchLang);

  try {
    const requestSearch = async (queryParams: URLSearchParams) =>
      fetch("https://api.search.brave.com/res/v1/web/search?" + queryParams.toString(), {
        headers: {
          "X-Subscription-Token": apiKey,
          Accept: "application/json",
        },
      });

    let response = await requestSearch(params);

    if (!response.ok && (searchLang || country)) {
      const relaxedParams = new URLSearchParams(params);
      relaxedParams.delete("search_lang");
      relaxedParams.delete("country");
      response = await requestSearch(relaxedParams);
    }

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error("Brave search failed:", response.status, details.slice(0, 300));
      res.status(502).json({
        error: "search_request_failed",
        status: response.status,
        details: details ? details.slice(0, 300) : undefined,
      });
      return;
    }

    const data = (await response.json()) as {
      web?: {
        results?: Array<{
          title?: string;
          url?: string;
          description?: string;
          age?: string;
          snippet?: string;
          profile?: { name?: string; url?: string };
        }>;
      };
    };

    const results = (data.web?.results || [])
      .filter((item) => item.title && item.url)
      .map((item) => ({
        title: item.title as string,
        url: item.url as string,
        description: item.description || item.snippet || '',
        age: item.age,
        source: item.profile?.name || item.profile?.url || '',
      }));

    res.json({ query, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "search_failed";
    console.error("Brave search error:", message);
    res.status(502).json({ error: message });
  }
});

function isPrivateHostname(hostname: string): boolean {
  if (!hostname) return true;
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local")) return true;
  if (lower === "::1") return true;
  if (lower.startsWith("fe80") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [a, b] = ipv4Match.slice(1).map((part) => Number(part));
    if ([a, b].some((part) => Number.isNaN(part))) return true;
    if (a === 10 || a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return "";
  return match[1].replace(/\s+/g, " ").trim();
}

app.get("/api/web/page", async (req, res) => {
  const url = req.query.url as string | undefined;
  if (!url) {
    res.status(400).json({ error: "missing_url" });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    res.status(400).json({ error: "invalid_url" });
    return;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    res.status(400).json({ error: "invalid_protocol" });
    return;
  }

  if (isPrivateHostname(parsed.hostname)) {
    res.status(400).json({ error: "blocked_host" });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html, text/plain;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      res.status(502).json({ error: "page_request_failed", status: response.status });
      return;
    }

    const contentType = response.headers.get("content-type") || "";
    const html = await response.text();
    const title = extractTitle(html);
    const text = contentType.includes("text/html") ? stripHtml(html) : html;
    const content = text.slice(0, 8000);

    res.json({ url: parsed.toString(), title, content });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "page_fetch_failed" });
  } finally {
    clearTimeout(timeout);
  }
});

app.listen(PORT, () => {
  console.log(`12306 backend listening on http://localhost:${PORT}`);
});
