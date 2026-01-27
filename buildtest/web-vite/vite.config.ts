import registerActivityHMR from "@talla-ui/hmr/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [registerActivityHMR()],
});
