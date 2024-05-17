import {fileURLToPath, URL} from 'node:url'

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {VitePWA} from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        VitePWA({
            workbox: {
                maximumFileSizeToCacheInBytes: 4000000
            },
            manifest: {
                name: 'Scratchpad',
                short_name: 'Scratchpad',
                description: 'Scratchpad',
                lang: "de",
                id: "/",
                start_url: "/",
                theme_color: '#212529',
                background_color: '#ffffff',
                orientation: "any",
                display: "standalone",
                "icons": [
                    {
                        "src": "pwa-64x64.png",
                        "sizes": "64x64",
                        "type": "image/png"
                    },
                    {
                        "src": "pwa-192x192.png",
                        "sizes": "192x192",
                        "type": "image/png"
                    },
                    {
                        "src": "pwa-512x512.png",
                        "sizes": "512x512",
                        "type": "image/png"
                    },
                    {
                        "src": "maskable-icon-512x512.png",
                        "sizes": "512x512",
                        "type": "image/png",
                        "purpose": "maskable"
                    }
                ]
            },
            devOptions: {
                enabled: true
            },
            registerType: 'autoUpdate',
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    }
})
