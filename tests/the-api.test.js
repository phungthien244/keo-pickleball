import { test, expect, beforeAll } from "vitest";
import { onRequestGet } from "../functions/api/the/[[path]].js";

const store = new Map();
beforeAll(() => {
  globalThis.caches = { default: { match: async () => null, put: async () => {} } };
  globalThis.fetch = async url => {
    const m = String(url).match(/documents\/(clubs\/[^?]+)/);
    const d = m && store.get(decodeURIComponent(m[1]));
    return d ? new Response(JSON.stringify({ fields: { img: { stringValue: d } } })) : new Response("{}", { status: 404 });
  };
});
const call = async path => onRequestGet({ request: new Request("https://pikeco.app" + path), waitUntil() {} });

test("ảnh thẻ: trả JPEG đã lưu, chưa có thì về ảnh chung, đường dẫn lạ bị chặn", async () => {
  store.set("clubs/aep/the/vdv_p1", "data:image/jpeg;base64," + Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64"));
  const r = await call("/api/the/aep/vdv_p1.jpg?v=abc");
  expect(r.status).toBe(200);
  expect(r.headers.get("content-type")).toBe("image/jpeg");
  expect(r.headers.get("cache-control")).toContain("2592000");
  expect([...new Uint8Array(await r.arrayBuffer())]).toEqual([0xff, 0xd8, 0xff, 0xd9]);
  const miss = await call("/api/the/aep/vdv_p2.jpg");
  expect(miss.status).toBe(302);
  expect(miss.headers.get("location")).toBe("https://pikeco.app/og.png?v=2");
  expect((await call("/api/the/aep/..%2Fx.jpg")).status).toBe(302);
  expect((await call("/api/the/AEP/vdv_p1.jpg")).status).toBe(302);
});
