import { describe, expect, test } from "vitest";
import registerActivityHMR from "../dist/vite.js";

describe("Vite plugin", () => {
	const plugin = registerActivityHMR();
	const transform = plugin.transform as (
		code: string,
		id: string,
	) => { code: string; map: null } | undefined;

	test("Skips non-JS/TS files", () => {
		const result = transform(
			"class MyActivity extends Activity {}",
			"styles.css",
		);
		expect(result).toBeUndefined();
	});

	test("Skips files without Activity class", () => {
		const code = "export class MyService { getData() { return []; } }";
		const result = transform(code, "service.ts");
		expect(result).toBeUndefined();
	});

	test("Injects HMR code into Activity class", () => {
		const code = `
			import { Activity } from "talla-ui";
			export class MyActivity extends Activity {
				static View = MyView;
			}
		`;
		const result = transform(code, "MyActivity.ts");

		expect(result).toBeDefined();
		// Should add import at top
		expect(result?.code).toContain(
			"import { registerActivityHMR as _$registerActivityHMR }",
		);
		expect(result?.code).toContain('@talla-ui/hmr"');
		// Should inject static block
		expect(result?.code).toContain("static {");
		expect(result?.code).toContain("import.meta.hot");
		expect(result?.code).toContain(
			"_$registerActivityHMR(import.meta.hot, MyActivity)",
		);
	});

	test("Handles multiple Activity classes in one file", () => {
		const code = `
			export class FirstActivity extends Activity {}
			export class SecondActivity extends Activity {}
		`;
		const result = transform(code, "activities.tsx");

		// Should have single import at top
		expect(result?.code.match(/import \{ registerActivityHMR/g)?.length).toBe(
			1,
		);
		// Should have two static blocks
		expect(result?.code).toContain(
			"_$registerActivityHMR(import.meta.hot, FirstActivity)",
		);
		expect(result?.code).toContain(
			"_$registerActivityHMR(import.meta.hot, SecondActivity)",
		);
		expect(result?.code.match(/static \{/g)?.length).toBe(2);
	});

	test("Does not match partial class names", () => {
		const code = "export class MyActivityHelper extends BaseHelper {}";
		const result = transform(code, "helper.ts");
		expect(result).toBeUndefined();
	});
});
