import { beforeEach, test } from "vitest";
import { expectOutputAsync, useTestContext } from "@talla-ui/test-handler";
import { MainActivity } from "./main";

let activity: MainActivity;
beforeEach(() => {
	activity = new MainActivity();
	useTestContext().addActivity(activity, true);
});

test("Shows hello world", async (t) => {
	await expectOutputAsync({ type: "label", text: "Hello, world!" });
});
