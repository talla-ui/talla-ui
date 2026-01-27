/**
 * Vite plugin for automatic hot module replacement of Tälla UI activities
 *
 * This plugin automatically injects HMR registration code into classes that extend Activity.
 * With this plugin, there's no need for any HMR boilerplate in activity classes.
 *
 * @example
 * // vite.config.ts
 * import registerActivityHMR from "@talla-ui/hmr/vite";
 * import { defineConfig } from "vite";
 *
 * export default defineConfig({
 *   plugins: [registerActivityHMR()],
 * });
 */
export default function registerActivityHMR() {
	return {
		name: "talla-hmr",
		apply: "serve" as const,
		transform(code: string, id: string) {
			if (!id.match(/\.(ts|js|tsx|jsx)$/)) return;
			if (!code.includes("extends Activity")) return;

			// insert the static class code automatically
			const pattern = /class\s+(\w+)\s+extends\s+Activity\s*\{/g;
			let hasMatch = false;
			const result = code.replace(pattern, (match: string, name: string) => {
				hasMatch = true;
				return `${match}\n  static { if (import.meta.hot) { import.meta.hot.accept(); _$registerActivityHMR(import.meta.hot, ${name}); } }`;
			});

			if (hasMatch) {
				const importStatement =
					'import { registerActivityHMR as _$registerActivityHMR } from "@talla-ui/hmr";\n';
				const finalCode = importStatement + result;
				return { code: finalCode, map: null };
			}
		},
	};
}
