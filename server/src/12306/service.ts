import {
  InterlineData,
  InterlineInfo,
  InterlineTicketData,
  Price,
  RouteStationData,
  RouteStationInfo,
  StationData,
  StationDataKeys,
  TicketData,
  TicketDataKeys,
  TicketInfo,
  TrainSearchData,
} from "./types.js";

const API_BASE = "https://kyfw.12306.cn";
const SEARCH_API_BASE = "https://search.12306.cn";
const WEB_URL = "https://www.12306.cn/index/";
const LCQUERY_INIT_URL = "https://kyfw.12306.cn/otn/lcQuery/init";

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

const MISSING_STATIONS: StationData[] = [
  {
    station_id: "@cdd",
    station_name: "\u6210\u90fd\u4e1c",
    station_code: "WEI",
    station_pinyin: "chengdudong",
    station_short: "cdd",
    station_index: "",
    code: "1707",
    city: "\u6210\u90fd",
    r1: "",
    r2: "",
  },
];

const SEAT_TYPES = {
  "9": { name: "\u5546\u52a1\u5ea7", short: "swz" },
  P: { name: "\u7279\u7b49\u5ea7", short: "tz" },
  M: { name: "\u4e00\u7b49\u5ea7", short: "zy" },
  D: { name: "\u4f18\u9009\u4e00\u7b49\u5ea7", short: "zy" },
  O: { name: "\u4e8c\u7b49\u5ea7", short: "ze" },
  S: { name: "\u4e8c\u7b49\u5305\u5ea7", short: "ze" },
  "6": { name: "\u9ad8\u7ea7\u8f6f\u5367", short: "gr" },
  A: { name: "\u9ad8\u7ea7\u52a8\u5367", short: "gr" },
  "4": { name: "\u8f6f\u5367", short: "rw" },
  I: { name: "\u4e00\u7b49\u5367", short: "rw" },
  F: { name: "\u52a8\u5367", short: "rw" },
  "3": { name: "\u786c\u5367", short: "yw" },
  J: { name: "\u4e8c\u7b49\u5367", short: "yw" },
  "2": { name: "\u8f6f\u5ea7", short: "rz" },
  "1": { name: "\u786c\u5ea7", short: "yz" },
  W: { name: "\u65e0\u5ea7", short: "wz" },
  WZ: { name: "\u65e0\u5ea7", short: "wz" },
  H: { name: "\u5176\u4ed6", short: "qt" },
};

const DW_FLAGS = [
  "\u667a\u80fd\u52a8\u8f66\u7ec4",
  "\u590d\u5174\u53f7",
  "\u9759\u97f3\u8f66\u53a2",
  "\u6e29\u99a8\u52a8\u5367",
  "\u52a8\u611f\u53f7",
  "\u652f\u6301\u9009\u94fa",
  "\u8001\u5e74\u4f18\u60e0",
];

const TRAIN_FILTERS = {
  G: (ticketInfo: TicketInfo | InterlineInfo) =>
    ticketInfo.start_train_code.startsWith("G") ||
    ticketInfo.start_train_code.startsWith("C"),
  D: (ticketInfo: TicketInfo | InterlineInfo) =>
    ticketInfo.start_train_code.startsWith("D"),
  Z: (ticketInfo: TicketInfo | InterlineInfo) =>
    ticketInfo.start_train_code.startsWith("Z"),
  T: (ticketInfo: TicketInfo | InterlineInfo) =>
    ticketInfo.start_train_code.startsWith("T"),
  K: (ticketInfo: TicketInfo | InterlineInfo) =>
    ticketInfo.start_train_code.startsWith("K"),
  O: (ticketInfo: TicketInfo | InterlineInfo) =>
    !(
      TRAIN_FILTERS.G(ticketInfo) ||
      TRAIN_FILTERS.D(ticketInfo) ||
      TRAIN_FILTERS.Z(ticketInfo) ||
      TRAIN_FILTERS.T(ticketInfo) ||
      TRAIN_FILTERS.K(ticketInfo)
    ),
  F: (ticketInfo: TicketInfo | InterlineInfo) => {
    if ("dw_flag" in ticketInfo) {
      return ticketInfo.dw_flag.includes("\u590d\u5174\u53f7");
    }
    return ticketInfo.ticketList[0]?.dw_flag.includes("\u590d\u5174\u53f7");
  },
  S: (ticketInfo: TicketInfo | InterlineInfo) => {
    if ("dw_flag" in ticketInfo) {
      return ticketInfo.dw_flag.includes("\u667a\u80fd\u52a8\u8f66\u7ec4");
    }
    return ticketInfo.ticketList[0]?.dw_flag.includes(
      "\u667a\u80fd\u52a8\u8f66\u7ec4"
    );
  },
};

interface QueryResponse {
  [key: string]: unknown;
  httpstatus?: string;
  data: Record<string, unknown> | string;
  status: boolean;
}

interface LeftTicketsQueryResponse extends QueryResponse {
  httpstatus: string;
  data: {
    result: string[];
    map: Record<string, string>;
    [key: string]: unknown;
  };
  messages: string;
}

interface InterlineQueryResponse extends QueryResponse {
  data:
    | {
        flag: boolean;
        result_index: number;
        middleStationList: string[];
        can_query: string;
        zd_yp_size: number;
        middleList: InterlineData[];
        zd_size: number;
        [key: string]: unknown;
      }
    | string;
  errorMsg: string;
}

interface RouteQueryResponse extends QueryResponse {
  httpstatus: string;
  data: {
    data: RouteStationData[];
  };
  messages: [];
  validateMessages: Record<string, unknown>;
  validateMessagesShowId: string;
}

interface TrainSearchResponse extends QueryResponse {
  data: TrainSearchData[];
  errorMsg: string;
}

let stationsCache: Record<string, StationData> | null = null;
let cityStationsCache:
  | Record<string, { station_code: string; station_name: string }[]>
  | null = null;
let cityCodesCache:
  | Record<string, { station_code: string; station_name: string }>
  | null = null;
let nameStationsCache:
  | Record<string, { station_code: string; station_name: string }>
  | null = null;
let lcQueryPathCache: string | null = null;

let cookieCache: { value: Record<string, string>; expiresAt: number } | null =
  null;

export async function init12306(): Promise<void> {
  await Promise.all([ensureStations(), ensureLcQueryPath()]);
}

export function getCurrentDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function getStations(): Promise<Record<string, StationData>> {
  await ensureStations();
  return stationsCache ?? {};
}

export async function getStationsInCity(
  city: string
): Promise<{ station_code: string; station_name: string }[] | null> {
  await ensureStations();
  return cityStationsCache?.[city] ?? null;
}

export async function getCityCodes(
  cities: string[]
): Promise<
  Record<string, { station_code: string; station_name: string } | { error: string }>
> {
  await ensureStations();
  const result: Record<
    string,
    { station_code: string; station_name: string } | { error: string }
  > = {};
  for (const city of cities) {
    const entry = cityCodesCache?.[city];
    result[city] = entry ?? { error: "city_not_found" };
  }
  return result;
}

export async function getStationsByNames(
  names: string[]
): Promise<
  Record<string, { station_code: string; station_name: string } | { error: string }>
> {
  await ensureStations();
  const result: Record<
    string,
    { station_code: string; station_name: string } | { error: string }
  > = {};
  for (const name of names) {
    const normalized = normalizeStationName(name);
    const entry = nameStationsCache?.[normalized];
    result[name] = entry ?? { error: "station_not_found" };
  }
  return result;
}

export async function getStationByTelecode(
  telecode: string
): Promise<StationData | null> {
  await ensureStations();
  return stationsCache?.[telecode] ?? null;
}

export async function getTickets(params: {
  date: string;
  from: string;
  to: string;
  trainFilterFlags?: string;
  earliestStartTime?: number;
  latestStartTime?: number;
  sortFlag?: string;
  sortReverse?: boolean;
  limitedNum?: number;
}): Promise<TicketInfo[]> {
  const {
    date,
    from,
    to,
    trainFilterFlags = "",
    earliestStartTime = 0,
    latestStartTime = 24,
    sortFlag = "",
    sortReverse = false,
    limitedNum = 0,
  } = params;

  if (!checkDate(date)) {
    throw new Error("date_before_today");
  }

  await ensureStations();
  const fromStation = await resolveStationInput(from);
  const toStation = await resolveStationInput(to);
  if (!fromStation || !toStation) {
    throw new Error("station_not_found");
  }

  const queryParams = new URLSearchParams({
    "leftTicketDTO.train_date": date,
    "leftTicketDTO.from_station": fromStation,
    "leftTicketDTO.to_station": toStation,
    purpose_codes: "ADULT",
  });
  const queryUrl = `${API_BASE}/otn/leftTicket/query`;
  const cookies = await getCookie();
  if (!cookies || Object.keys(cookies).length === 0) {
    throw new Error("cookie_failed");
  }

  const queryResponse = await make12306Request<LeftTicketsQueryResponse>(
    queryUrl,
    queryParams,
    { Cookie: formatCookies(cookies) },
    "json"
  );
  if (!queryResponse || !queryResponse.data) {
    throw new Error("tickets_request_failed");
  }

  const ticketsData = parseTicketsData(queryResponse.data.result ?? []);
  const ticketsInfo = parseTicketsInfo(ticketsData, queryResponse.data.map ?? {});
  return filterTicketsInfo(
    ticketsInfo,
    trainFilterFlags,
    earliestStartTime,
    latestStartTime,
    sortFlag,
    sortReverse,
    limitedNum
  );
}

export async function getInterlineTickets(params: {
  date: string;
  from: string;
  to: string;
  middleStation?: string;
  showWZ?: boolean;
  trainFilterFlags?: string;
  earliestStartTime?: number;
  latestStartTime?: number;
  sortFlag?: string;
  sortReverse?: boolean;
  limitedNum?: number;
}): Promise<InterlineInfo[]> {
  const {
    date,
    from,
    to,
    middleStation = "",
    showWZ = false,
    trainFilterFlags = "",
    earliestStartTime = 0,
    latestStartTime = 24,
    sortFlag = "",
    sortReverse = false,
    limitedNum = 10,
  } = params;

  if (!checkDate(date)) {
    throw new Error("date_before_today");
  }

  await ensureStations();
  await ensureLcQueryPath();

  const fromStation = await resolveStationInput(from);
  const toStation = await resolveStationInput(to);
  const middle = middleStation ? await resolveStationInput(middleStation) : "";
  if (!fromStation || !toStation) {
    throw new Error("station_not_found");
  }

  const queryUrl = `${API_BASE}${lcQueryPathCache}`;
  const cookies = await getCookie();
  if (!cookies || Object.keys(cookies).length === 0) {
    throw new Error("cookie_failed");
  }

  let interlineData: InterlineData[] = [];
  const queryParams = new URLSearchParams({
    train_date: date,
    from_station_telecode: fromStation,
    to_station_telecode: toStation,
    middle_station: middle ?? "",
    result_index: "0",
    can_query: "Y",
    isShowWZ: showWZ ? "Y" : "N",
    purpose_codes: "00",
    channel: "E",
  });

  while (interlineData.length < limitedNum) {
    const queryResponse = await make12306Request<InterlineQueryResponse>(
      queryUrl,
      queryParams,
      { Cookie: formatCookies(cookies) },
      "json"
    );
    if (!queryResponse) {
      throw new Error("interline_request_failed");
    }
    if (typeof queryResponse.data === "string") {
      throw new Error("interline_no_result");
    }
    interlineData = interlineData.concat(queryResponse.data.middleList ?? []);
    if (queryResponse.data.can_query === "N") {
      break;
    }
    queryParams.set("result_index", queryResponse.data.result_index.toString());
  }

  const interlineTicketsInfo = parseInterlinesInfo(interlineData);
  return filterTicketsInfo(
    interlineTicketsInfo,
    trainFilterFlags,
    earliestStartTime,
    latestStartTime,
    sortFlag,
    sortReverse,
    limitedNum
  );
}

export async function getTrainRouteStations(params: {
  trainCode: string;
  departDate: string;
}): Promise<RouteStationInfo[]> {
  const { trainCode, departDate } = params;
  const searchParams = new URLSearchParams({
    keyword: trainCode,
    date: departDate.replaceAll("-", ""),
  });
  const searchUrl = `${SEARCH_API_BASE}/search/v1/train/search`;
  const searchResponse = await make12306Request<TrainSearchResponse>(
    searchUrl,
    searchParams,
    {},
    "json"
  );

  if (!searchResponse || !searchResponse.data || searchResponse.data.length === 0) {
    throw new Error("train_not_found");
  }

  const searchData = searchResponse.data[0];
  const queryParams = new URLSearchParams({
    "leftTicketDTO.train_no": searchData.train_no,
    "leftTicketDTO.train_date": departDate,
    rand_code: "",
  });
  const queryUrl = `${API_BASE}/otn/queryTrainInfo/query`;
  const cookies = await getCookie();
  if (!cookies || Object.keys(cookies).length === 0) {
    throw new Error("cookie_failed");
  }

  const queryResponse = await make12306Request<RouteQueryResponse>(
    queryUrl,
    queryParams,
    { Cookie: formatCookies(cookies) },
    "json"
  );
  if (!queryResponse || !queryResponse.data) {
    throw new Error("route_request_failed");
  }

  const routeStationsInfo = parseRouteStationsInfo(queryResponse.data.data);
  if (routeStationsInfo.length === 0) {
    throw new Error("route_not_found");
  }
  return routeStationsInfo;
}

export function formatTicketsInfo(ticketsInfo: TicketInfo[]): string {
  if (ticketsInfo.length === 0) {
    return "No matching trains found.";
  }
  let result = "Train|From -> To|Departure -> Arrival|Duration\n";
  ticketsInfo.forEach((ticketInfo) => {
    let infoStr = "";
    infoStr += `${ticketInfo.start_train_code} ${ticketInfo.from_station}(telecode:${ticketInfo.from_station_telecode}) -> ${ticketInfo.to_station}(telecode:${ticketInfo.to_station_telecode}) ${ticketInfo.start_time} -> ${ticketInfo.arrive_time} duration:${ticketInfo.lishi}`;
    ticketInfo.prices.forEach((price) => {
      const ticketStatus = formatTicketStatus(price.num);
      infoStr += `\n- ${price.seat_name}: ${ticketStatus} ${price.price}`;
    });
    result += `${infoStr}\n`;
  });
  return result;
}

export function formatTicketsInfoCSV(ticketsInfo: TicketInfo[]): string {
  if (ticketsInfo.length === 0) {
    return "No matching trains found.";
  }
  let result = "train,from,to,depart,arrive,duration,prices,flags\n";
  ticketsInfo.forEach((ticketInfo) => {
    let infoStr = "";
    infoStr += `${ticketInfo.start_train_code},${ticketInfo.from_station}(telecode:${ticketInfo.from_station_telecode}),${ticketInfo.to_station}(telecode:${ticketInfo.to_station_telecode}),${ticketInfo.start_time},${ticketInfo.arrive_time},${ticketInfo.lishi},[`;
    ticketInfo.prices.forEach((price) => {
      const ticketStatus = formatTicketStatus(price.num);
      infoStr += `${price.seat_name}:${ticketStatus}${price.price}`;
    });
    infoStr += `],${
      ticketInfo.dw_flag.length === 0 ? "/" : ticketInfo.dw_flag.join("&")
    }`;
    result += `${infoStr}\n`;
  });
  return result;
}

export function formatRouteStationsInfo(
  routeStationsInfo: RouteStationInfo[]
): string {
  if (routeStationsInfo.length === 0) {
    return "No route information found.";
  }
  let result = `${routeStationsInfo[0].station_train_code} route\n`;
  result += "No.|Station|Train|Arrive|Depart|Duration\n";
  routeStationsInfo.forEach((routeStationInfo, index) => {
    result += `${index + 1}|${routeStationInfo.station_name}|${
      routeStationInfo.station_train_code
    }|${routeStationInfo.arrive_time}|${routeStationInfo.start_time}|${
      routeStationInfo.arrive_day_str
    } ${routeStationInfo.lishi}\n`;
  });
  return result;
}

export function formatInterlinesInfo(interlinesInfo: InterlineInfo[]): string {
  if (interlinesInfo.length === 0) {
    return "No matching interline routes found.";
  }
  let result =
    "Depart -> Arrive | From -> Middle -> To | Transfer | Wait | Duration\n\n";
  interlinesInfo.forEach((interlineInfo) => {
    result += `${interlineInfo.start_date} ${interlineInfo.start_time} -> ${interlineInfo.arrive_date} ${interlineInfo.arrive_time} | `;
    result += `${interlineInfo.from_station_name} -> ${interlineInfo.middle_station_name} -> ${interlineInfo.end_station_name} | `;
    result += `${
      interlineInfo.same_train
        ? "same_train"
        : interlineInfo.same_station
        ? "same_station"
        : "transfer_station"
    } | ${interlineInfo.wait_time} | ${interlineInfo.lishi}\n\n`;
    result +=
      "\t" + formatTicketsInfo(interlineInfo.ticketList).replace(/\n/g, "\n\t");
    result += "\n";
  });
  return result;
}

function parseCookies(cookies: string[]): Record<string, string> {
  const cookieRecord: Record<string, string> = {};
  cookies.forEach((cookie) => {
    const keyValuePart = cookie.split(";")[0];
    const [key, value] = keyValuePart.split("=");
    if (key && value) {
      cookieRecord[key.trim()] = value.trim();
    }
  });
  return cookieRecord;
}

function formatCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

async function getCookie(): Promise<Record<string, string> | null> {
  if (cookieCache && Date.now() < cookieCache.expiresAt) {
    return cookieCache.value;
  }
  const url = `${API_BASE}/otn/leftTicket/init`;
  try {
    const response = await fetch(url, { headers: DEFAULT_HEADERS });
    const getSetCookie = (response.headers as unknown as { getSetCookie?: () => string[] })
      .getSetCookie;
    const setCookieHeader =
      (typeof getSetCookie === "function" ? getSetCookie.call(response.headers) : null) ??
      response.headers.get("set-cookie");
    if (setCookieHeader) {
      const cookies = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : [setCookieHeader];
      const parsed = parseCookies(cookies);
      cookieCache = { value: parsed, expiresAt: Date.now() + 10 * 60 * 1000 };
      return parsed;
    }
    return null;
  } catch (error) {
    console.error("Error fetching 12306 cookies:", error);
    return null;
  }
}

function parseRouteStationsInfo(
  routeStationsData: RouteStationData[]
): RouteStationInfo[] {
  const result: RouteStationInfo[] = [];
  routeStationsData.forEach((routeStationData, index) => {
    if (index === 0) {
      result.push({
        train_class_name: routeStationData.train_class_name,
        service_type: routeStationData.service_type,
        end_station_name: routeStationData.end_station_name,
        station_name: routeStationData.station_name,
        station_train_code: routeStationData.station_train_code,
        arrive_time: routeStationData.arrive_time,
        start_time: routeStationData.start_time,
        lishi: routeStationData.running_time,
        arrive_day_str: routeStationData.arrive_day_str,
      });
    } else {
      result.push({
        station_name: routeStationData.station_name,
        station_train_code: routeStationData.station_train_code,
        arrive_time: routeStationData.arrive_time,
        start_time: routeStationData.start_time,
        lishi: routeStationData.running_time,
        arrive_day_str: routeStationData.arrive_day_str,
      });
    }
  });
  return result;
}

function parseTicketsData(rawData: string[]): TicketData[] {
  const result: TicketData[] = [];
  for (const item of rawData) {
    const values = item.split("|");
    const entry: Partial<TicketData> = {};
    TicketDataKeys.forEach((key, index) => {
      entry[key] = values[index];
    });
    result.push(entry as TicketData);
  }
  return result;
}

function parseTicketsInfo(
  ticketsData: TicketData[],
  map: Record<string, string>
): TicketInfo[] {
  const result: TicketInfo[] = [];
  for (const ticket of ticketsData) {
    const prices = extractPrices(
      ticket.yp_info_new ?? "",
      ticket.seat_discount_info ?? "",
      ticket
    );
    const dw_flag = extractDWFlags(ticket.dw_flag ?? "");
    const startHours = parseInt(ticket.start_time.split(":")[0], 10);
    const startMinutes = parseInt(ticket.start_time.split(":")[1], 10);
    const durationHours = parseInt(ticket.lishi.split(":")[0], 10);
    const durationMinutes = parseInt(ticket.lishi.split(":")[1], 10);
    const startDate = new Date(
      `${ticket.start_train_date.slice(0, 4)}-${ticket.start_train_date.slice(
        4,
        6
      )}-${ticket.start_train_date.slice(6, 8)}T00:00:00+08:00`
    );
    startDate.setHours(startHours, startMinutes);
    const arriveDate = new Date(startDate);
    arriveDate.setHours(startHours + durationHours, startMinutes + durationMinutes);
    result.push({
      train_no: ticket.train_no,
      start_date: formatDate(startDate),
      arrive_date: formatDate(arriveDate),
      start_train_code: ticket.station_train_code,
      start_time: ticket.start_time,
      arrive_time: ticket.arrive_time,
      lishi: ticket.lishi,
      from_station: map[ticket.from_station_telecode] ?? ticket.from_station_telecode,
      to_station: map[ticket.to_station_telecode] ?? ticket.to_station_telecode,
      from_station_telecode: ticket.from_station_telecode,
      to_station_telecode: ticket.to_station_telecode,
      prices,
      dw_flag,
    });
  }
  return result;
}

function formatTicketStatus(num: string): string {
  if (/^\d+$/.test(num)) {
    const count = parseInt(num, 10);
    return count === 0 ? "sold_out" : `left_${count}`;
  }
  switch (num) {
    case "\\u6709":
    case "\\u5145\\u8db3":
      return "available";
    case "\\u65e0":
    case "--":
    case "":
      return "sold_out";
    case "\\u5019\\u8865":
      return "waitlist";
    default:
      return num;
  }
}

function filterTicketsInfo<T extends TicketInfo | InterlineInfo>(
  ticketsInfo: T[],
  trainFilterFlags: string,
  earliestStartTime: number = 0,
  latestStartTime: number = 24,
  sortFlag: string = "",
  sortReverse: boolean = false,
  limitedNum: number = 0
): T[] {
  let result: T[];
  if (trainFilterFlags.length === 0) {
    result = ticketsInfo;
  } else {
    result = [];
    for (const ticketInfo of ticketsInfo) {
      for (const filter of trainFilterFlags) {
        const fn = TRAIN_FILTERS[filter as keyof typeof TRAIN_FILTERS];
        if (fn && fn(ticketInfo)) {
          result.push(ticketInfo);
          break;
        }
      }
    }
  }

  result = result.filter((ticketInfo) => {
    const startTimeHour = parseInt(ticketInfo.start_time.split(":")[0], 10);
    return startTimeHour >= earliestStartTime && startTimeHour < latestStartTime;
  });

  if (Object.prototype.hasOwnProperty.call(TIME_COMPARETOR, sortFlag)) {
    result.sort(TIME_COMPARETOR[sortFlag as keyof typeof TIME_COMPARETOR]);
    if (sortReverse) {
      result.reverse();
    }
  }
  if (limitedNum === 0) {
    return result;
  }
  return result.slice(0, limitedNum);
}

function parseInterlinesTicketInfo(
  interlineTicketsData: InterlineTicketData[]
): TicketInfo[] {
  const result: TicketInfo[] = [];
  for (const interlineTicketData of interlineTicketsData) {
    const prices = extractPrices(
      interlineTicketData.yp_info ?? "",
      interlineTicketData.seat_discount_info ?? "",
      interlineTicketData
    );
    const startHours = parseInt(interlineTicketData.start_time.split(":")[0], 10);
    const startMinutes = parseInt(interlineTicketData.start_time.split(":")[1], 10);
    const durationHours = parseInt(interlineTicketData.lishi.split(":")[0], 10);
    const durationMinutes = parseInt(interlineTicketData.lishi.split(":")[1], 10);
    const startDate = new Date(
      `${interlineTicketData.start_train_date.slice(0, 4)}-${interlineTicketData.start_train_date.slice(
        4,
        6
      )}-${interlineTicketData.start_train_date.slice(6, 8)}T00:00:00+08:00`
    );
    startDate.setHours(startHours, startMinutes);
    const arriveDate = new Date(startDate);
    arriveDate.setHours(startHours + durationHours, startMinutes + durationMinutes);
    result.push({
      train_no: interlineTicketData.train_no,
      start_train_code: interlineTicketData.station_train_code,
      start_date: formatDate(startDate),
      arrive_date: formatDate(arriveDate),
      start_time: interlineTicketData.start_time,
      arrive_time: interlineTicketData.arrive_time,
      lishi: interlineTicketData.lishi,
      from_station: interlineTicketData.from_station_name,
      to_station: interlineTicketData.to_station_name,
      from_station_telecode: interlineTicketData.from_station_telecode,
      to_station_telecode: interlineTicketData.to_station_telecode,
      prices,
      dw_flag: extractDWFlags(interlineTicketData.dw_flag ?? ""),
    });
  }
  return result;
}

function parseInterlinesInfo(interlineData: InterlineData[]): InterlineInfo[] {
  const result: InterlineInfo[] = [];
  for (const ticket of interlineData) {
    const interlineTickets = parseInterlinesTicketInfo(ticket.fullList ?? []);
    const lishi = extractLishi(ticket.all_lishi ?? "");
    result.push({
      lishi,
      start_time: ticket.start_time,
      start_date: ticket.train_date,
      middle_date: ticket.middle_date,
      arrive_date: ticket.arrive_date,
      arrive_time: ticket.arrive_time,
      from_station_code: ticket.from_station_code,
      from_station_name: ticket.from_station_name,
      middle_station_code: ticket.middle_station_code,
      middle_station_name: ticket.middle_station_name,
      end_station_code: ticket.end_station_code,
      end_station_name: ticket.end_station_name,
      start_train_code: interlineTickets[0]?.start_train_code ?? "",
      first_train_no: ticket.first_train_no,
      second_train_no: ticket.second_train_no,
      train_count: ticket.train_count,
      ticketList: interlineTickets,
      same_station: ticket.same_station === "0",
      same_train: ticket.same_train === "Y",
      wait_time: ticket.wait_time,
    });
  }
  return result;
}

function parseStationsData(rawData: string): Record<string, StationData> {
  const result: Record<string, StationData> = {};
  const dataArray = rawData.split("|");
  const dataList: string[][] = [];
  for (let i = 0; i < Math.floor(dataArray.length / 10); i += 1) {
    dataList.push(dataArray.slice(i * 10, i * 10 + 10));
  }
  for (const group of dataList) {
    const station: Partial<StationData> = {};
    StationDataKeys.forEach((key, index) => {
      station[key] = group[index];
    });
    if (!station.station_code) {
      continue;
    }
    result[station.station_code] = station as StationData;
  }
  return result;
}

function extractLishi(all_lishi: string): string {
  const match = all_lishi.match(/(?:(\d+)\u5c0f\u65f6)?(\d+?)\u5206\u949f/);
  if (!match) {
    return "00:00";
  }
  if (!match[1]) {
    return `00:${match[2].padStart(2, "0")}`;
  }
  return `${match[1].padStart(2, "0")}:${match[2].padStart(2, "0")}`;
}

function extractPrices(
  yp_info: string,
  seat_discount_info: string,
  ticketData: TicketData | InterlineTicketData
): Price[] {
  const PRICE_STR_LENGTH = 10;
  const DISCOUNT_STR_LENGTH = 5;
  const prices: Price[] = [];
  const discounts: Record<string, number> = {};

  for (let i = 0; i < seat_discount_info.length / DISCOUNT_STR_LENGTH; i += 1) {
    const discountStr = seat_discount_info.slice(
      i * DISCOUNT_STR_LENGTH,
      (i + 1) * DISCOUNT_STR_LENGTH
    );
    discounts[discountStr[0]] = parseInt(discountStr.slice(1), 10);
  }

  for (let i = 0; i < yp_info.length / PRICE_STR_LENGTH; i += 1) {
    const priceStr = yp_info.slice(i * PRICE_STR_LENGTH, (i + 1) * PRICE_STR_LENGTH);
    let seat_type_code: keyof typeof SEAT_TYPES | "H" | "W";
    if (parseInt(priceStr.slice(6, 10), 10) >= 3000) {
      seat_type_code = "W";
    } else if (!Object.prototype.hasOwnProperty.call(SEAT_TYPES, priceStr[0])) {
      seat_type_code = "H";
    } else {
      seat_type_code = priceStr[0] as keyof typeof SEAT_TYPES;
    }
    const seat_type = SEAT_TYPES[seat_type_code] ?? SEAT_TYPES.H;
    const price = parseInt(priceStr.slice(1, 6), 10) / 10;
    const discount = seat_type_code in discounts ? discounts[seat_type_code] : null;
    prices.push({
      seat_name: seat_type.name,
      short: seat_type.short,
      seat_type_code,
      num: (ticketData as Record<string, string>)[`${seat_type.short}_num`] ?? "",
      price,
      discount,
    });
  }
  return prices;
}

function extractDWFlags(dw_flag_str: string): string[] {
  const dwFlagList = dw_flag_str.split("#");
  const result: string[] = [];
  if ("5" === dwFlagList[0]) {
    result.push(DW_FLAGS[0]);
  }
  if (dwFlagList.length > 1 && "1" === dwFlagList[1]) {
    result.push(DW_FLAGS[1]);
  }
  if (dwFlagList.length > 2) {
    if (dwFlagList[2]?.startsWith("Q")) {
      result.push(DW_FLAGS[2]);
    } else if (dwFlagList[2]?.startsWith("R")) {
      result.push(DW_FLAGS[3]);
    }
  }
  if (dwFlagList.length > 5 && "D" === dwFlagList[5]) {
    result.push(DW_FLAGS[4]);
  }
  if (dwFlagList.length > 6 && "z" !== dwFlagList[6]) {
    result.push(DW_FLAGS[5]);
  }
  if (dwFlagList.length > 7 && "z" !== dwFlagList[7]) {
    result.push(DW_FLAGS[6]);
  }
  return result;
}

function checkDate(date: string): boolean {
  const today = getCurrentDate();
  return date >= today;
}

async function make12306Request<T>(
  url: string | URL,
  scheme: URLSearchParams = new URLSearchParams(),
  headers: Record<string, string> = {},
  responseType: "json" | "text" = "json"
): Promise<T | null> {
  try {
    const requestUrl = new URL(url.toString());
    scheme.forEach((value, key) => requestUrl.searchParams.set(key, value));
    const response = await fetch(requestUrl.toString(), {
      headers: { ...DEFAULT_HEADERS, ...headers },
    });
    if (!response.ok) {
      return null;
    }
    const text = await response.text();
    if (responseType === "text") {
      return text as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } catch (error) {
    console.error("Error making 12306 request:", error);
    return null;
  }
}

async function ensureStations(): Promise<void> {
  if (stationsCache) {
    return;
  }
  const directStationJs = await make12306Request<string>(
    `${API_BASE}/otn/resources/js/framework/station_name.js`,
    new URLSearchParams(),
    "text"
  );
  if (directStationJs) {
    try {
      const rawData = extractStationRawData(directStationJs);
      const stationsData = parseStationsData(rawData);
      for (const station of MISSING_STATIONS) {
        if (!stationsData[station.station_code]) {
          stationsData[station.station_code] = station;
        }
      }
      stationsCache = stationsData;
      cityStationsCache = buildCityStations(stationsData);
      cityCodesCache = buildCityCodes(cityStationsCache, stationsData);
      nameStationsCache = buildNameStations(stationsData);
      return;
    } catch (error) {
      console.warn("Direct station_name.js parse failed, falling back.", error);
    }
  }
  const html = await make12306Request<string>(
    WEB_URL,
    new URLSearchParams(),
    {},
    "text"
  );
  if (!html) {
    throw new Error("stations_init_failed");
  }

  const match =
    html.match(/(\/script\/core\/common\/station_name.+?\.js)/) ??
    html.match(
      /(\/otn\/resources\/js\/framework\/station_name\.js\?station_version=[^"]+)/
    );
  if (!match) {
    throw new Error("station_js_not_found");
  }

  const stationNameJs = await make12306Request<string>(
    new URL(match[1], WEB_URL),
    new URLSearchParams(),
    {},
    "text"
  );
  if (!stationNameJs) {
    throw new Error("station_js_request_failed");
  }

  const rawData = extractStationRawData(stationNameJs);
  const stationsData = parseStationsData(rawData);
  for (const station of MISSING_STATIONS) {
    if (!stationsData[station.station_code]) {
      stationsData[station.station_code] = station;
    }
  }

  stationsCache = stationsData;
  cityStationsCache = buildCityStations(stationsData);
  cityCodesCache = buildCityCodes(cityStationsCache, stationsData);
  nameStationsCache = buildNameStations(stationsData);
}

async function ensureLcQueryPath(): Promise<void> {
  if (lcQueryPathCache) {
    return;
  }
  const html = await make12306Request<string>(
    LCQUERY_INIT_URL,
    new URLSearchParams(),
    {},
    "text"
  );
  if (!html) {
    throw new Error("lcquery_init_failed");
  }
  const match = html.match(/ var lc_search_url = '(.+?)'/);
  if (!match) {
    throw new Error("lcquery_path_not_found");
  }
  lcQueryPathCache = match[1];
}

async function resolveStationInput(input: string): Promise<string | null> {
  const normalized = normalizeStationName(input);
  if (!stationsCache || !nameStationsCache || !cityCodesCache) {
    await ensureStations();
  }
  if (stationsCache?.[input]) {
    return stationsCache[input].station_code;
  }
  if (stationsCache?.[normalized]) {
    return stationsCache[normalized].station_code;
  }
  const nameEntry = nameStationsCache?.[normalized];
  if (nameEntry) {
    return nameEntry.station_code;
  }
  const cityEntry = cityCodesCache?.[normalized];
  if (cityEntry) {
    return cityEntry.station_code;
  }
  return null;
}

function normalizeStationName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.endsWith("\u7ad9")) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

function buildCityStations(
  stations: Record<string, StationData>
): Record<string, { station_code: string; station_name: string }[]> {
  const result: Record<string, { station_code: string; station_name: string }[]> =
    {};
  for (const station of Object.values(stations)) {
    const city = station.city;
    if (!result[city]) {
      result[city] = [];
    }
    result[city].push({
      station_code: station.station_code,
      station_name: station.station_name,
    });
  }
  return result;
}

function buildCityCodes(
  cityStations: Record<string, { station_code: string; station_name: string }[]>,
  stations: Record<string, StationData>
): Record<string, { station_code: string; station_name: string }> {
  const result: Record<string, { station_code: string; station_name: string }> =
    {};
  for (const [city, entries] of Object.entries(cityStations)) {
    const direct = entries.find((entry) => entry.station_name === city);
    if (direct) {
      result[city] = direct;
      continue;
    }
    const fallback = entries[0];
    if (fallback && stations[fallback.station_code]) {
      result[city] = {
        station_code: fallback.station_code,
        station_name: fallback.station_name,
      };
    }
  }
  return result;
}

function buildNameStations(
  stations: Record<string, StationData>
): Record<string, { station_code: string; station_name: string }> {
  const result: Record<string, { station_code: string; station_name: string }> =
    {};
  for (const station of Object.values(stations)) {
    result[station.station_name] = {
      station_code: station.station_code,
      station_name: station.station_name,
    };
  }
  return result;
}

function extractStationRawData(stationNameJs: string): string {
  const singleMatch = stationNameJs.match(/station_names\s*=\s*'([^']+)'/);
  if (singleMatch) {
    return singleMatch[1];
  }
  const doubleMatch = stationNameJs.match(/station_names\s*=\s*"([^"]+)"/);
  if (doubleMatch) {
    return doubleMatch[1];
  }
  const fallbackMatch = stationNameJs.match(/station_names\s*=\s*([^;]+);/);
  if (fallbackMatch) {
    const raw = fallbackMatch[1].trim();
    if (
      (raw.startsWith("'") && raw.endsWith("'")) ||
      (raw.startsWith("\"") && raw.endsWith("\""))
    ) {
      return raw.slice(1, -1);
    }
  }
  throw new Error("station_rawdata_not_found");
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const TIME_COMPARETOR = {
  startTime: (a: TicketInfo | InterlineInfo, b: TicketInfo | InterlineInfo) => {
    const [ha, ma] = a.start_time.split(":").map((part) => parseInt(part, 10));
    const [hb, mb] = b.start_time.split(":").map((part) => parseInt(part, 10));
    if (ha !== hb) return ha - hb;
    return ma - mb;
  },
  arriveTime: (a: TicketInfo | InterlineInfo, b: TicketInfo | InterlineInfo) => {
    const [ha, ma] = a.arrive_time.split(":").map((part) => parseInt(part, 10));
    const [hb, mb] = b.arrive_time.split(":").map((part) => parseInt(part, 10));
    if (ha !== hb) return ha - hb;
    return ma - mb;
  },
  duration: (a: TicketInfo | InterlineInfo, b: TicketInfo | InterlineInfo) => {
    const [ha, ma] = a.lishi.split(":").map((part) => parseInt(part, 10));
    const [hb, mb] = b.lishi.split(":").map((part) => parseInt(part, 10));
    if (ha !== hb) return ha - hb;
    return ma - mb;
  },
};
