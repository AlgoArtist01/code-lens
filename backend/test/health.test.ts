import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("GET /api/health/live", () => {
  it("returns 200 ok", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health/live");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
