# 12306 Backend

This folder adds a full backend for 12306 train data and exposes REST endpoints for the frontend.

## Quick start

## Environment

Copy `server/.env.example` to `server/.env` and set `BRAVE_SEARCH_API_KEY`.

```bash
npm install
npm run dev
```

The server listens on `http://localhost:8787` by default (override with `PORT`).


### Dev helper (conda)
- For development/testing only: `powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1`

## Endpoints

### Health
- `GET /api/12306/health`

### Date (Shanghai)
- `GET /api/12306/date`

### Stations
- `GET /api/12306/stations`
- `GET /api/12306/stations/city?name=北京`
- `GET /api/12306/stations/cities?names=北京|上海`
- `GET /api/12306/stations/by-names?names=北京南|上海虹桥`
- `GET /api/12306/stations/telecode/BJP`

### Tickets (direct)
- `GET /api/12306/tickets?date=2026-02-01&from=北京&to=上海`
- Optional query: `trainFilterFlags`, `earliestStartTime`, `latestStartTime`, `sortFlag`, `sortReverse`, `limitedNum`, `format=text|csv`

### Interline (transfer)
- `GET /api/12306/interline?date=2026-02-01&from=成都&to=深圳`
- Optional query: `middleStation`, `showWZ`, `trainFilterFlags`, `earliestStartTime`, `latestStartTime`, `sortFlag`, `sortReverse`, `limitedNum`, `format=text`

### Train route stations
- `GET /api/12306/route?trainCode=G1033&date=2026-02-01`
- Optional query: `format=text`


### Web search (Brave)
- Requires env var: BRAVE_SEARCH_API_KEY
- `GET /api/search?q=beijing%20travel&count=5&country=CN&freshness=month&search_lang=zh-CN`
