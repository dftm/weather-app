import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  OpenWeatherError,
  getCoordsForZip,
  getForecast,
  groupForecastByDay,
  formatDayHeading,
  formatSlotTime,
  isPartialDay,
  describeUpstreamError,
} from "./openweather.js";

const realFetch = globalThis.fetch;
const realKey = process.env.OPENWEATHER_API_KEY;

function mockFetch(status, body = {}) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { status, ok: status >= 200 && status < 300, json: async () => body };
  };
  return calls;
}

beforeEach(() => {
  process.env.OPENWEATHER_API_KEY = "test-key";
});
afterEach(() => {
  globalThis.fetch = realFetch;
  if (realKey === undefined) delete process.env.OPENWEATHER_API_KEY;
  else process.env.OPENWEATHER_API_KEY = realKey;
});

for (const status of [401, 429, 500]) {
  test(`geocode ${status} throws typed error without leaking key`, async () => {
    mockFetch(status);
    await assert.rejects(getCoordsForZip("90210"), (err) => {
      assert.ok(err instanceof OpenWeatherError);
      assert.equal(err.status, status);
      assert.ok(!err.message.includes("test-key"));
      assert.ok(!err.message.includes("http"));
      return true;
    });
  });

  test(`forecast ${status} throws typed error`, async () => {
    mockFetch(status);
    await assert.rejects(getForecast(1, 2), (err) => {
      assert.ok(err instanceof OpenWeatherError);
      assert.equal(err.status, status);
      return true;
    });
  });
}

test("geocode 404 returns null", async () => {
  mockFetch(404);
  assert.equal(await getCoordsForZip("00000"), null);
});

test("missing key throws config error before fetching", async () => {
  delete process.env.OPENWEATHER_API_KEY;
  const calls = mockFetch(200);
  await assert.rejects(getCoordsForZip("90210"), (err) => {
    assert.ok(err instanceof OpenWeatherError);
    assert.equal(err.code, "config");
    return true;
  });
  await assert.rejects(getForecast(1, 2), (err) => err.code === "config");
  assert.equal(calls.length, 0);
});

test("geocode passes timeout signal and 24h revalidate", async () => {
  const calls = mockFetch(200, { lat: 1, lon: 2, name: "X" });
  await getCoordsForZip("90210");
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  assert.deepEqual(calls[0].options.next, { revalidate: 86400 });
});

test("forecast passes timeout signal and 15min revalidate", async () => {
  const calls = mockFetch(200, { list: [], city: { timezone: 0 } });
  await getForecast(1, 2);
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  assert.deepEqual(calls[0].options.next, { revalidate: 900 });
});

for (const name of ["TimeoutError", "AbortError"]) {
  test(`${name} maps to typed timeout error`, async () => {
    globalThis.fetch = async () => {
      const e = new Error("aborted");
      e.name = name;
      throw e;
    };
    await assert.rejects(getForecast(1, 2), (err) => {
      assert.ok(err instanceof OpenWeatherError);
      assert.equal(err.code, "timeout");
      return true;
    });
  });
}

// ---- grouping and time formatting (pure helpers, no fetch) ----
const H = 3600;
// 2026-01-15T00:00:00Z
const T0 = Date.UTC(2026, 0, 15) / 1000;
const slot = (dt) => ({ dt });

test("groupForecastByDay: negative offset moves early-UTC slots to the previous day", () => {
  // UTC 03:00 on Jan 15 at UTC-8 is Jan 14 19:00
  const days = groupForecastByDay([slot(T0 + 3 * H), slot(T0 + 9 * H)], -8 * H);
  assert.deepEqual(days.map((d) => d.date), ["2026-01-14", "2026-01-15"]);
});

test("groupForecastByDay: positive offset crossing midnight moves late-UTC slots forward", () => {
  // UTC 22:00 Jan 15 at UTC+5:30 is Jan 16 03:30
  const days = groupForecastByDay([slot(T0 + 18 * H), slot(T0 + 22 * H)], 19800);
  assert.deepEqual(days.map((d) => d.date), ["2026-01-15", "2026-01-16"]);
  assert.equal(days[1].entries.length, 1);
});

test("groupForecastByDay: 40 slots starting mid-day yield 6 buckets, first and last partial", () => {
  const list = Array.from({ length: 40 }, (_, i) => slot(T0 + 15 * H + i * 3 * H));
  const days = groupForecastByDay(list, 0);
  assert.equal(days.length, 6);
  assert.equal(days.reduce((n, d) => n + d.entries.length, 0), 40);
  assert.equal(isPartialDay(days[0].entries), true);
  assert.equal(isPartialDay(days[1].entries), false);
  assert.equal(isPartialDay(days[5].entries), true);
});

test("formatSlotTime: negative and positive offsets", () => {
  assert.equal(formatSlotTime(T0 + 3 * H, -8 * H), "7:00 PM");
  assert.equal(formatSlotTime(T0 + 22 * H, 19800), "3:30 AM");
  assert.equal(formatSlotTime(T0, 0), "12:00 AM");
});

test("formatDayHeading", () => {
  assert.equal(formatDayHeading("2026-01-14"), "Wednesday, Jan 14");
  assert.equal(formatDayHeading("2026-01-16"), "Friday, Jan 16");
});

test("isPartialDay boundary: 7 slots partial, 8 slots full", () => {
  assert.equal(isPartialDay(Array(7).fill({})), true);
  assert.equal(isPartialDay(Array(8).fill({})), false);
});

test("rejected fetch maps to network error without leaking key or URL", async () => {
  globalThis.fetch = async (url) => {
    throw new TypeError(`fetch failed for ${url}`);
  };
  await assert.rejects(getForecast(1, 2), (err) => {
    assert.ok(err instanceof OpenWeatherError);
    assert.equal(err.code, "network");
    assert.ok(!err.message.includes("test-key"));
    assert.equal(err.cause, undefined);
    return true;
  });
});

function mockBody(readJson) {
  globalThis.fetch = async () => ({ status: 200, ok: true, json: readJson });
}

test("malformed JSON body maps to bad_response", async () => {
  mockBody(async () => {
    throw new SyntaxError("Unexpected token");
  });
  await assert.rejects(getForecast(1, 2), (err) => err.code === "bad_response");
  await assert.rejects(getCoordsForZip("90210"), (err) => err.code === "bad_response");
});

test("body read timeout maps to timeout error", async () => {
  mockBody(async () => {
    const e = new Error("t");
    e.name = "TimeoutError";
    throw e;
  });
  await assert.rejects(getForecast(1, 2), (err) => {
    assert.ok(err instanceof OpenWeatherError);
    return err.code === "timeout";
  });
});

test("200 with missing city/list or coords maps to bad_response", async () => {
  for (const body of [{}, { list: [] }, { city: { timezone: 0 } }, null]) {
    mockBody(async () => body);
    await assert.rejects(getForecast(1, 2), (err) => err.code === "bad_response");
  }
  mockBody(async () => ({ name: "X" }));
  await assert.rejects(getCoordsForZip("90210"), (err) => err.code === "bad_response");
});

test("describeUpstreamError: 429 is service busy, others unavailable", () => {
  assert.equal(describeUpstreamError({ status: 429 }).title, "Service busy");
  for (const e of [{ status: 401 }, { status: 500 }, { code: "config" }, { code: "timeout" }]) {
    assert.equal(describeUpstreamError(e).title, "Forecast unavailable");
  }
});
