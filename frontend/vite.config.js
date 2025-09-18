import path from "node:path"
import vue from "@vitejs/plugin-vue"
import frappeui from "frappe-ui/vite"
import { defineConfig } from "vite"

// https://vitejs.dev/config/
export default defineConfig({
	devServer: {
            client: {
              webSocketURL: 'auto://0.0.0.0:0/ws',
            },
          },
	plugins: [
		frappeui({
			frappeProxy: true,
			jinjaBootData: true,
			lucideIcons: true,
			buildConfig: {
				indexHtmlPath: "../tahp/www/frontend.html",
				emptyOutDir: true,
				sourcemap: true,
			},
		}),
		vue(),
	],
	build: {
		chunkSizeWarningLimit: 1500,
		outDir: "../tahp/public/frontend",
		emptyOutDir: true,
		target: "es2015",
		sourcemap: true,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
			"tailwind.config.js": path.resolve(__dirname, "tailwind.config.js"),
		},
	},
	optimizeDeps: {
		include: ["feather-icons", "showdown", "highlight.js/lib/core", "interactjs"],
	},
	server: {
		allowedHosts: true,
		hot: true,
		watch: {
			usePolling: true,       // enables polling
			interval: 100,        
			ignored: [
				'!/src/',        // don't ignore src (keep polling it)
				'!/public/',     // don't ignore public
				'/node_modules/' // always ignore node_modules
			], // check for changes every 1s (default: 100ms)
		},
	},

})
