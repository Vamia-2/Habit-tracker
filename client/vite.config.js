import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const certPath = path.resolve(__dirname, '../localhost-cert.pem')
const keyPath = path.resolve(__dirname, '../localhost-key.pem')
const useSharedCert = fs.existsSync(certPath) && fs.existsSync(keyPath)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: useSharedCert ? {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    } : true,
    host: 'localhost',
    hmr: {
      host: 'localhost'
    },
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_HTTPS === 'true' ? 'https://localhost:5000' : 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: path => path.replace(/^\/api/, '/api')
      }
    }
  }
})
