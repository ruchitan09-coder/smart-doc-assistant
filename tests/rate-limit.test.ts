import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Prisma singleton before importing the module under test, so
// checkRateLimit never touches a real database -- this test is about the
// window/threshold arithmetic, not Postgres itself (that atomicity is
// exercised for real in the manual verification steps in
// improvements-update/IMPROVEMENTS.md, which needs a live DB).
const queryRawMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: (...args: unknown[]) => queryRawMock(...args) },
}));

const { checkRateLimit, enforceRateLimit, RateLimitExceededError } = await import("../src/lib/rate-limit");

beforeEach(() => {
  queryRawMock.mockReset();
});

describe("checkRateLimit", () => {
  it("allows a request under the limit and reports remaining correctly", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 3, windowStart: new Date() }]);

    const result = await checkRateLimit("chat:user-1", 20, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(17);
    expect(result.limit).toBe(20);
  });

  it("blocks a request once the count exceeds the limit", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 21, windowStart: new Date() }]);

    const result = await checkRateLimit("chat:user-1", 20, 60);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("allows a request exactly at the limit (limit itself is not exceeded)", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 20, windowStart: new Date() }]);

    const result = await checkRateLimit("chat:user-1", 20, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("computes a sane retryAfterSeconds when blocked", async () => {
    // Window started 10 seconds ago, window length is 60s -> ~50s left.
    const windowStart = new Date(Date.now() - 10_000);
    queryRawMock.mockResolvedValueOnce([{ count: 25, windowStart }]);

    const result = await checkRateLimit("chat:user-1", 20, 60);

    expect(result.retryAfterSeconds).toBeGreaterThan(45);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(50);
  });
});

describe("enforceRateLimit", () => {
  it("resolves silently when under the limit", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 1, windowStart: new Date() }]);
    await expect(enforceRateLimit("upload:user-1", 10, 3600)).resolves.toMatchObject({ allowed: true });
  });

  it("throws RateLimitExceededError when over the limit", async () => {
    queryRawMock.mockResolvedValueOnce([{ count: 11, windowStart: new Date() }]);
    await expect(enforceRateLimit("upload:user-1", 10, 3600)).rejects.toBeInstanceOf(
      RateLimitExceededError
    );
  });
});
