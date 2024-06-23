import { describe, test, useTestContext } from "@desk-framework/frame-test";
import { MainActivity } from "./main";

describe("Main", (scope) => {
	let activity: MainActivity;
	scope.beforeEach(() => {
		activity = new MainActivity();
		useTestContext().addActivity(activity, true);
	});

	test("Shows hello world", async (t) => {
		await t.expectOutputAsync(100, { type: "label", text: "Hello, world!" });
	});
});
