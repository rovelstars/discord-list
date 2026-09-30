import { describe, expect, it } from "vitest";
import { isTransientError } from "$lib/db";

function statusError(status: number): Error {
	return Object.assign(new Error(`request failed with status ${status}`), { status });
}

describe("isTransientError", () => {
	it("treats 429 and 5xx statuses as transient", () => {
		expect(isTransientError(statusError(429))).toBe(true);
		expect(isTransientError(statusError(500))).toBe(true);
		expect(isTransientError(statusError(502))).toBe(true);
		expect(isTransientError(statusError(503))).toBe(true);
	});

	it("treats ordinary 4xx statuses as non-transient", () => {
		expect(isTransientError(statusError(400))).toBe(false);
		expect(isTransientError(statusError(404))).toBe(false);
	});

	it("treats HttpServerError name as transient even without a status", () => {
		const err = new Error("server error");
		err.name = "HttpServerError";
		expect(isTransientError(err)).toBe(true);
	});

	it("walks the cause chain (Drizzle wraps failures with cause)", () => {
		const cause = statusError(503);
		const wrapped = new Error("Failed query: SELECT 1", { cause });
		expect(isTransientError(wrapped)).toBe(true);

		const benign = new Error("Failed query: syntax error", {
			cause: new Error("syntax error near SELECT")
		});
		expect(isTransientError(benign)).toBe(false);
	});

	it("terminates on cyclic cause chains", () => {
		const err: Error & { cause?: unknown } = new Error("some random failure");
		err.cause = err;
		expect(isTransientError(err)).toBe(false);
	});

	it("matches legacy hrana/fetch masking substrings", () => {
		expect(isTransientError(new Error("resp.body.cancel is not a function"))).toBe(true);
		expect(isTransientError(new Error("cancel is not a function"))).toBe(true);
		expect(isTransientError(new Error("hrana client error"))).toBe(true);
		expect(isTransientError(new Error("socket hang up"))).toBe(true);
		expect(isTransientError(new Error("Service Unavailable"))).toBe(true);
	});

	it("treats constraint violations as non-transient", () => {
		expect(isTransientError(new Error("UNIQUE constraint failed: Users.id"))).toBe(false);
	});
});
