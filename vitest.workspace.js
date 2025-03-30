import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
	{
		test: {
			name: "util",
			root: "./packages/util",
			include: ["**/*.test.{ts,tsx}"],
		},
	},
	{
		test: {
			name: "core",
			root: "./packages/core",
			include: ["**/*.test.{ts,tsx}"],
		},
	},
	{
		test: {
			name: "test-handler",
			root: "./packages/test-handler",
			include: ["**/*.test.{ts,tsx}"],
		},
	},
]);
