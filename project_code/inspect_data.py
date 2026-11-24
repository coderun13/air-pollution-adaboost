import hashlib
import json
import os
import time
from collections import Counter, defaultdict
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("DATA_GOV_API_KEY") or "579b464db66ec23bdd000001a9d62e58ef4d409f4b285b72c11ab1d2"
RESOURCE_ID = "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
URL = f"https://api.data.gov.in/resource/{RESOURCE_ID}"

RAW_DIR = os.path.join("data", "raw")
RAW_FILE = os.path.join(RAW_DIR, "wb_aqi_raw.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AirWatchAI/1.0",
    "Accept": "application/json",
}

MISSING_TOKENS = {"", "na", "n/a", "null", "none", "nan", "-"}


def is_missing(val):
    if val is None:
        return True
    if isinstance(val, str) and val.strip().lower() in MISSING_TOKENS:
        return True
    return False


def api_get(params, retries=3):
    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(URL, params=params, headers=HEADERS, timeout=(10, 45))
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            print(f"  [Attempt {attempt}/{retries}] Error: {e}")
            if attempt < retries:
                time.sleep(attempt * 3)
    return None


def fetch_all_state_records(state="West Bengal", page_size=50):
    all_records = []
    offset = 0
    reported_total = None

    print(f"Fetching all records for state='{state}' (page_size={page_size})...")
    while True:
        params = {
            "api-key": API_KEY,
            "format": "json",
            "filters[state]": state,
            "limit": page_size,
            "offset": offset,
        }
        start = time.time()
        payload = api_get(params)
        elapsed = round(time.time() - start, 2)

        if not payload:
            print(f"  Stopped at offset={offset} due to request failure.")
            break

        if reported_total is None:
            reported_total = payload.get("total")

        batch = payload.get("records", [])
        print(f"  offset={offset:3d} | got={len(batch):2d} | total={payload.get('total')} | {elapsed}s")

        if not batch:
            break

        all_records.extend(batch)

        if len(batch) < page_size:
            break
        if isinstance(reported_total, int) and reported_total > 0 and len(all_records) >= reported_total:
            break

        offset += page_size

    return all_records, reported_total


def save_raw(state, reported_total, records):
    os.makedirs(RAW_DIR, exist_ok=True)
    raw_payload = {
        "resource_id": RESOURCE_ID,
        "state_filter": state,
        "reported_total": reported_total,
        "fetched_count": len(records),
        "records": records,
    }
    with open(RAW_FILE, "w", encoding="utf-8") as f:
        json.dump(raw_payload, f, indent=2, ensure_ascii=False)
    print(f"\nSaved raw records -> {RAW_FILE} ({len(records)} records)")


def verify_filters(records):
    print("\n--- Filter Verification ---")
    pm25_resp = api_get({
        "api-key": API_KEY,
        "format": "json",
        "filters[state]": "West Bengal",
        "filters[pollutant_id]": "PM2.5",
        "limit": 200,
    })
    api_pm25 = len((pm25_resp or {}).get("records", []))
    local_pm25 = sum(1 for r in records if str(r.get("pollutant_id", "")).strip().upper() == "PM2.5")
    print(f"PM2.5 count -> API filter: {api_pm25} | Local WB scan: {local_pm25}")

    sample_cities = sorted({str(r.get("city", "")).strip() for r in records if not is_missing(r.get("city"))})
    if sample_cities:
        c = sample_cities[0]
        city_resp = api_get({
            "api-key": API_KEY,
            "format": "json",
            "filters[state]": "West Bengal",
            "filters[city]": c,
            "limit": 200,
        })
        api_city_recs = (city_resp or {}).get("records", [])
        local_city_cnt = sum(1 for r in records if str(r.get("city", "")).strip().lower() == c.lower())
        print(f"City '{c}' -> API filter: {len(api_city_recs)} | Local WB scan: {local_city_cnt}")


def inspect_records(records):
    print("\n--- Data Profile ---")
    print("Total fetched:", len(records))
    if not records:
        return

    keys = sorted({k for r in records for k in r.keys()})
    print("Fields:", keys)

    pollutants = Counter(
        "MISSING" if is_missing(r.get("pollutant_id")) else str(r.get("pollutant_id")).strip()
        for r in records
    )
    print("\nPollutants:")
    for k, v in pollutants.most_common():
        print(f"  {k:10s}: {v}")

    stations_per_city = defaultdict(set)
    city_rows = Counter()
    for r in records:
        c = "MISSING" if is_missing(r.get("city")) else str(r.get("city")).strip()
        s = "MISSING" if is_missing(r.get("station")) else str(r.get("station")).strip()
        city_rows[c] += 1
        stations_per_city[c].add(s)

    print(f"\nCities ({len(city_rows)}) & Stations ({sum(len(v) for v in stations_per_city.values())}):")
    for c, cnt in city_rows.most_common():
        st = sorted(stations_per_city[c])
        print(f"  {c:18s}: {cnt:3d} rows | {len(st)} stations -> {st}")

    missing_per_col = Counter()
    for r in records:
        for k in keys:
            if is_missing(r.get(k)):
                missing_per_col[k] += 1
    print("\nMissing / 'NA' values:")
    for k in keys:
        m = missing_per_col[k]
        print(f"  {k:15s}: {m:3d}/{len(records)} ({m / len(records) * 100:.1f}%)")

    exact_hashes = Counter()
    logical_keys = Counter()
    for r in records:
        h = hashlib.md5(json.dumps(r, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()
        exact_hashes[h] += 1
        lk = (
            str(r.get("station", "")).strip(),
            str(r.get("pollutant_id", "")).strip(),
            str(r.get("last_update", "")).strip(),
        )
        logical_keys[lk] += 1

    print("\nDuplicates:")
    print("  Exact duplicates  :", sum(v - 1 for v in exact_hashes.values() if v > 1))
    print("  Logical duplicates:", sum(v - 1 for v in logical_keys.values() if v > 1))

    timestamps = Counter(
        str(r.get("last_update")).strip() for r in records if not is_missing(r.get("last_update"))
    )
    print("\nTimestamps (last_update):")
    for ts, cnt in timestamps.most_common(10):
        print(f"  {ts:22s}: {cnt} rows")

    print("\nUnits: Not included as a field in API records; CPCB AQI standard is µg/m³ for PM2.5, PM10, NO2, NH3, SO2, OZONE and mg/m³ for CO.")


if __name__ == "__main__":
    wb_records, total = fetch_all_state_records(state="West Bengal", page_size=50)
    save_raw("West Bengal", total, wb_records)
    verify_filters(wb_records)
    inspect_records(wb_records)