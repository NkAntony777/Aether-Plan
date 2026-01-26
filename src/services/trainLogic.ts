// Train service logic backed by the local 12306 backend

export interface TicketInfo {
  train_no: string;
  start_train_code: string;
  start_date: string;
  start_time: string;
  arrive_date: string;
  arrive_time: string;
  lishi: string;
  from_station: string;
  to_station: string;
  from_station_telecode: string;
  to_station_telecode: string;
  prices: Price[];
  dw_flag: string[];
}

export interface Price {
  seat_name: string;
  seat_type_code: string;
  num: string;
  price: number;
  discount?: number | null;
}

export interface StationData {
  station_id: string;
  station_name: string;
  station_code: string;
  station_pinyin: string;
  station_short: string;
  station_index: string;
  code: string;
  city: string;
  r1: string;
  r2: string;
}

const API_BASE = import.meta.env.VITE_TRAIN_API_BASE || "/api/12306";

let cachedStations: Record<string, StationData> | null = null;
let cachedStationNames: Record<string, StationData> | null = null;

export async function getStations(): Promise<Record<string, StationData>> {
  if (cachedStations) return cachedStations;

  try {
    const res = await fetch(`${API_BASE}/stations`);
    if (!res.ok) {
      return {};
    }
    const data = (await res.json()) as { stations?: Record<string, StationData> };
    const stations = data.stations ?? {};
    cachedStations = stations;
    cachedStationNames = Object.values(stations).reduce<Record<string, StationData>>(
      (acc, station) => {
        acc[station.station_name] = station;
        return acc;
      },
      {}
    );
    return stations;
  } catch (e) {
    console.error("Failed to fetch stations", e);
    return {};
  }
}

export async function getStationCode(name: string): Promise<string | null> {
  if (!cachedStationNames) await getStations();
  return cachedStationNames?.[name]?.station_code || null;
}

export async function getStationName(code: string): Promise<string | null> {
  if (!cachedStations) await getStations();
  return cachedStations?.[code]?.station_name || null;
}

export async function searchTickets(
  fromStationName: string,
  toStationName: string,
  date: string
): Promise<TicketInfo[]> {
  if (!fromStationName || !toStationName || !date) {
    throw new Error("Missing required parameters");
  }

  const url = new URL(`${API_BASE}/tickets`, window.location.origin);
  url.searchParams.set("from", fromStationName);
  url.searchParams.set("to", toStationName);
  url.searchParams.set("date", date);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Ticket search failed");
  }
  const data = (await res.json()) as { tickets?: TicketInfo[] };
  return data.tickets ?? [];
}
