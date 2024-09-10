import { describe, test } from "../../dist/index.js";
// ... from "@talla-ui/test-handler"

describe("Scope not skipped", () => {
	test.skip("But this test is skipped, correct", () => {
		throw Error("Skipped");
	});

	// uncomment this to run ONLY this test
	// (and all other '.only' tests and scopes) --

	// test.only("Single test run", () => {
	// 	1 + 1;
	// });

	// uncomment this to mark these tests as TODO

	// test.todo("My awesome feature", () => {});
	// test.todo("Another test case", () => {});

	test("Break on fail", (t) => {
		// if this test fails, everything stops:
		t.breakOnFail();

		t.log("Sanity check...");
		if (1 > 2) throw Error("What?");
		t.log("Crisis averted");
	});
});

describe.skip("This scope is skipped", (scope) => {
	scope.beforeAll(() => {
		// this will never run
		throw Error("Oops!");
	});

	test.skip("This is skipped too", () => {
		throw Error("Skipped");
	});

	test("This is also skipped", () => {
		throw Error("Skipped");
	});
});
