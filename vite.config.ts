
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // This loads variables from .env files (local development).
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Injects process.env variables into the code during build.
      // CRITICAL FIX: Prioritize `process.env` (System/Vercel variables) over `env` (.env file variables).
      // This ensures that keys set in the Vercel Dashboard are correctly picked up.
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY),
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(process.env.DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY),
      'process.env.TONGYI_API_KEY': JSON.stringify(process.env.TONGYI_API_KEY || env.TONGYI_API_KEY)
    }
  }
})
