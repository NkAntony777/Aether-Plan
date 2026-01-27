import "dotenv/config";
import express from "express";
import cors from "cors";
import { lookup } from "dns/promises";
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
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("cors_not_allowed"));
    },
  })
);
app.use(express.json());

const PORT = Number(process.env.PORT ?? "8787");
const API_TOKEN = process.env.AETHER_API_TOKEN || "";
const LLM_API_KEY = process.env.LLM_API_KEY || "";
const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
const LLM_MODEL = process.env.LLM_MODEL || "";
const AMAP_API_KEY = process.env.AMAP_API_KEY || "";
const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY || "";
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET || "";

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

let amadeusToken: string | null = null;
let amadeusTokenExpiry = 0;

async function getAmadeusToken(): Promise<string | null> {
  if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) return null;
  if (amadeusToken && Date.now() < amadeusTokenExpiry) return amadeusToken;
  try {
    const response = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: AMADEUS_API_KEY,
        client_secret: AMADEUS_API_SECRET,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Amadeus token error:", response.status, text.slice(0, 200));
      return null;
    }
    const data = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    amadeusToken = data.access_token;
    amadeusTokenExpiry = Date.now() + Math.max(0, (data.expires_in ?? 1800) - 60) * 1000;
    return amadeusToken;
  } catch (error) {
    console.error("Amadeus token fetch error:", error);
    return null;
  }
}

function getClientId(req: express.Request): string {
  const header = req.headers["x-forwarded-for"];
  if (typeof header === "string" && header.length > 0) {
    return header.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function requireToken(req: express.Request, res: express.Response): boolean {
  if (!API_TOKEN) return true;
  const token = req.headers["x-aether-token"];
  if (token !== API_TOKEN) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(req: express.Request, res: express.Response, max: number, windowMs: number): boolean {
  const key = `${getClientId(req)}:${req.path}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) {
    res.status(429).json({ error: "rate_limited" });
    return false;
  }
  bucket.count += 1;
  return true;
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
  if (!requireToken(req, res)) return;
  if (!rateLimit(req, res, 30, 60_000)) return;
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const requestSearch = async (queryParams: URLSearchParams) =>
      fetch("https://api.search.brave.com/res/v1/web/search?" + queryParams.toString(), {
        headers: {
          "X-Subscription-Token": apiKey,
          Accept: "application/json",
        },
        signal: controller.signal,
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
      clearTimeout(timeout);
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
    clearTimeout(timeout);
  } catch (error) {
    const message = error instanceof Error ? error.message : "search_failed";
    console.error("Brave search error:", message);
    res.status(502).json({ error: message });
  }
});

app.post("/api/llm/chat", async (req, res) => {
  if (!requireToken(req, res)) return;
  if (!rateLimit(req, res, 20, 60_000)) return;
  if (!LLM_API_KEY) {
    res.status(500).json({ error: "missing_llm_api_key" });
    return;
  }

  const { messages, model, max_tokens, temperature } = (req.body || {}) as {
    messages?: Array<{ role: string; content: string }>;
    model?: string;
    max_tokens?: number;
    temperature?: number;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "missing_messages" });
    return;
  }

  const finalModel = LLM_MODEL || model || "gpt-4o";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${LLM_BASE_URL.replace(/\\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: finalModel,
        messages,
        max_tokens: max_tokens ?? 2048,
        temperature: temperature ?? 0.7,
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      res.status(502).json({ error: data.error?.message || "llm_request_failed", status: response.status });
      clearTimeout(timeout);
      return;
    }

    const content = data.choices?.[0]?.message?.content || data.content?.[0]?.text || "";
    res.json({ message: content });
    clearTimeout(timeout);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "llm_request_failed" });
  }
});

app.get("/api/amap/geocode", async (req, res) => {
  if (!requireToken(req, res)) return;
  if (!rateLimit(req, res, 60, 60_000)) return;
  if (!AMAP_API_KEY) {
    res.status(500).json({ error: "missing_amap_api_key" });
    return;
  }
  const address = req.query.address as string | undefined;
  if (!address) {
    res.status(400).json({ error: "missing_address" });
    return;
  }
  try {
    const response = await fetch(
      `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${AMAP_API_KEY}&output=json`
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      res.status(502).json({ error: "amap_request_failed", status: response.status });
      return;
    }
    if (data.status !== "1" || !data.geocodes || data.geocodes.length === 0) {
      res.status(502).json({ error: data.info || "geocode_failed" });
      return;
    }
    const geocode = data.geocodes[0];
    const [lng, lat] = (geocode.location || "0,0").split(",").map(Number);
    res.json({ location: { lat, lng }, formattedAddress: geocode.formatted_address });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "geocode_failed" });
  }
});

app.get("/api/amap/poi", async (req, res) => {
  if (!requireToken(req, res)) return;
  if (!rateLimit(req, res, 60, 60_000)) return;
  if (!AMAP_API_KEY) {
    res.status(500).json({ error: "missing_amap_api_key" });
    return;
  }
  const keywords = req.query.keywords as string | undefined;
  const city = req.query.city as string | undefined;
  const types = req.query.types as string | undefined;
  const offset = parseNumber(req.query.offset as string | undefined, 10);
  if (!keywords || !city) {
    res.status(400).json({ error: "missing_query" });
    return;
  }
  try {
    const params = new URLSearchParams({
      key: AMAP_API_KEY,
      keywords,
      city,
      citylimit: "true",
      offset: String(offset),
      output: "json",
      extensions: "all",
    });
    if (types) params.set("types", types);
    const response = await fetch(`https://restapi.amap.com/v3/place/text?${params.toString()}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      res.status(502).json({ error: "amap_request_failed", status: response.status });
      return;
    }
    if (data.status !== "1") {
      res.status(502).json({ error: data.info || "poi_failed" });
      return;
    }
    const pois = (data.pois || []).map((poi: any) => {
      const [lng, lat] = (poi.location || "0,0").split(",").map(Number);
      return {
        id: poi.id,
        name: poi.name,
        type: poi.type,
        typecode: poi.typecode,
        address: poi.address || "",
        location: { lat, lng },
        tel: poi.tel,
        rating: poi.biz_ext ? parseFloat(poi.biz_ext.rating || "0") : undefined,
        cost: poi.biz_ext ? poi.biz_ext.cost : undefined,
        photos: poi.photos ? poi.photos.map((p: any) => p.url) : undefined,
        distance: poi.distance ? parseInt(poi.distance, 10) : undefined,
      };
    });
    res.json({ pois });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "poi_failed" });
  }
});

app.get("/api/amap/around", async (req, res) => {
  if (!requireToken(req, res)) return;
  if (!rateLimit(req, res, 60, 60_000)) return;
  if (!AMAP_API_KEY) {
    res.status(500).json({ error: "missing_amap_api_key" });
    return;
  }
  const location = req.query.location as string | undefined;
  const radius = parseNumber(req.query.radius as string | undefined, 3000);
  if (!location) {
    res.status(400).json({ error: "missing_location" });
    return;
  }
  try {
    const response = await fetch(
      `https://restapi.amap.com/v3/place/around?key=${AMAP_API_KEY}&location=${location}&radius=${radius}&types=110000&offset=5&output=json`
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status !== "1") {
      res.status(502).json({ error: data.info || "around_failed" });
      return;
    }
    const items = (data.pois || []).map((poi: any) => ({
      name: poi.name,
      distance:
        parseInt(poi.distance, 10) >= 1000
          ? `${(parseInt(poi.distance, 10) / 1000).toFixed(1)}km`
          : `${poi.distance}m`,
    }));
    res.json({ items });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "around_failed" });
  }
});

app.get("/api/amap/route", async (req, res) => {
  if (!requireToken(req, res)) return;
  if (!rateLimit(req, res, 60, 60_000)) return;
  if (!AMAP_API_KEY) {
    res.status(500).json({ error: "missing_amap_api_key" });
    return;
  }
  const origin = req.query.origin as string | undefined;
  const destination = req.query.destination as string | undefined;
  const strategy = parseNumber(req.query.strategy as string | undefined, 0);
  if (!origin || !destination) {
    res.status(400).json({ error: "missing_route" });
    return;
  }
  try {
    const response = await fetch(
      `https://restapi.amap.com/v3/direction/driving?origin=${origin}&destination=${destination}&strategy=${strategy}&key=${AMAP_API_KEY}&output=json`
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status !== "1" || !data.route?.paths?.[0]) {
      res.status(502).json({ error: data.info || "route_failed" });
      return;
    }
    const path = data.route.paths[0];
    res.json({ distance: parseInt(path.distance, 10), duration: parseInt(path.duration, 10) });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "route_failed" });
  }
});

app.get("/api/flights", async (req, res) => {
  if (!requireToken(req, res)) return;
  if (!rateLimit(req, res, 20, 60_000)) return;
  const origin = req.query.origin as string | undefined;
  const destination = req.query.destination as string | undefined;
  const departureDate = req.query.departureDate as string | undefined;
  const returnDate = req.query.returnDate as string | undefined;
  const adults = parseNumber(req.query.adults as string | undefined, 1);

  if (!origin || !destination || !departureDate) {
    res.status(400).json({ error: "missing_flight_query" });
    return;
  }

  const token = await getAmadeusToken();
  if (!token) {
    res.status(500).json({ error: "amadeus_token_failed" });
    return;
  }

  try {
    const params = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults: String(adults),
      currencyCode: "CNY",
      max: "10",
    });
    if (returnDate) params.append("returnDate", returnDate);
    const response = await fetch(`https://test.api.amadeus.com/v2/shopping/flight-offers?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      res.status(502).json({ error: data.errors?.[0]?.detail || "flight_search_failed", status: response.status });
      return;
    }
    const flights = (data.data || []).map((offer: any, index: number) => {
      const itineraries = offer.itineraries || [];
      const firstItinerary = itineraries[0] || {};
      const segments = firstItinerary.segments || [];
      const firstSegment = segments[0] || {};
      const lastSegment = segments[segments.length - 1] || firstSegment;
      const price = offer.price || {};
      return {
        id: `flight-${index}`,
        airline: firstSegment.carrierCode || "Unknown",
        airlineCode: firstSegment.carrierCode || "",
        flightNumber: `${firstSegment.carrierCode || ""}${firstSegment.number || ""}`,
        departure: {
          airport: firstSegment.departure?.iataCode || "",
          time: firstSegment.departure?.at || "",
          terminal: firstSegment.departure?.terminal,
        },
        arrival: {
          airport: lastSegment.arrival?.iataCode || "",
          time: lastSegment.arrival?.at || "",
          terminal: lastSegment.arrival?.terminal,
        },
        duration: (firstItinerary.duration || "").replace("PT", "").toLowerCase(),
        stops: Math.max(0, segments.length - 1),
        price: {
          amount: parseFloat(price.total || "0"),
          currency: price.currency || "CNY",
        },
        cabinClass:
          offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || "ECONOMY",
      };
    });
    res.json({ flights });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "flight_search_failed" });
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

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const lower = ip.toLowerCase();
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

async function resolvePublicHost(hostname: string): Promise<boolean> {
  try {
    const results = await lookup(hostname, { all: true });
    return results.every((item) => !isPrivateIp(item.address));
  } catch {
    return false;
  }
}

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    return response.text();
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      received += value.length;
      if (received > maxBytes) {
        throw new Error("response_too_large");
      }
      chunks.push(value);
    }
  }
  const decoder = new TextDecoder("utf-8");
  return chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join("") + decoder.decode();
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
  if (!requireToken(req, res)) return;
  if (!rateLimit(req, res, 20, 60_000)) return;
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
  if (!(await resolvePublicHost(parsed.hostname))) {
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
    const html = await readLimitedText(response, 512 * 1024);
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
