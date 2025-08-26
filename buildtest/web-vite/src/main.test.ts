import { beforeEach, test } from "vitest";
import { expectOutputAsync, useTestContext, app } from "@talla-ui/test-handler";
import { MainActivity } from "./main";

beforeEach(() => {
	useTestContext();
	app.addActivity(new MainActivity(), true);
});

test("Shows hello world", async () => {
	await expectOutputAsync({ type: "label", text: "Hello, world!" });
});
