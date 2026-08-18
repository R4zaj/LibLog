import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isElectron = process.env.ELECTRON === 'true';

  return {
    // Relative asset paths. Electron loads the built index.html over file://,
    // where a leading "/" resolves to the filesystem root and nothing loads.
    base: './',
    plugins: [
      react(),
      ...(isElectron ? [
        electron([
          {
            // Main-Process entry file of the Electron App.
            entry: 'electron/main.js',
            vite: {
              build: {
                outDir: 'dist-electron',
                rollupOptions: {
                  external: ['electron']
                }
              }
            }
          }
        ]),
        renderer(),
      ] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
