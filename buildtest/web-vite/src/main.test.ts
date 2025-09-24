import { app, expectOutputAsync, useTestContext } from "@talla-ui/test-handler";
import { beforeEach, test } from "vitest";
import { MainActivity } from "./main";

beforeEach(() => {
	useTestContext();
	app.addActivity(new MainActivity(), true);
});

test("Shows hello world", async () => {
	await expectOutputAsync({ type: "text", text: "Hello, world!" });
});
