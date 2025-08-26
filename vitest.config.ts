import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		coverage: {
			include: [
				"packages/util/dist/**/*.js",
				"packages/core/dist/**/*.js",
				"packages/test-handler/dist/**/*.js",
			],
		},
		root: import.meta.dirname,
		projects: ["packages/util", "packages/core", "packages/test-handler"],
	},
});
