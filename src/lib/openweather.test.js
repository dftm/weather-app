import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { OpenWeatherError, getCoordsForZip, getForecast } from "./openweather.js";

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
  const calls = mockFetch(200, { list: [] });
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
