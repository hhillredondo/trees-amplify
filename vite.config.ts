import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const amplifyOutputsPath = path.resolve(__dirname, 'amplify_outputs.json')
const amplifyOutputsStubPath = path.resolve(__dirname, 'amplify_outputs.stub.json')

/** GitHub Actions / fresh clones: real file is gitignored and only exists after sandbox / Amplify deploy. */
const useAmplifyOutputsStub =
  fs.existsSync(amplifyOutputsStubPath) && !fs.existsSync(amplifyOutputsPath)

function amplifyOutputsStubPlugin(): Plugin {
  return {
    name: 'amplify-outputs-stub',
    resolveId(id) {
      if (!useAmplifyOutputsStub) return null
      const norm = id.replaceAll('\\', '/')
      if (norm.endsWith('/amplify_outputs.json') || norm === 'amplify_outputs.json') {
        return amplifyOutputsStubPath
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [
    amplifyOutputsStubPlugin(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
