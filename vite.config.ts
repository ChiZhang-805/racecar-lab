import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Three.js is intentionally kept as one cacheable core chunk (about 180 kB gzip).
    // The limit is expressed in uncompressed kB and prevents a false-positive warning.
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor'
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return 'three-core'
          if (id.includes('@react-three/fiber')) return 'r3f-vendor'
          if (id.includes('@react-three/drei') || id.includes('three-stdlib') || id.includes('camera-controls') || id.includes('meshline') || id.includes('maath')) return 'three-extras'
          if (id.includes('katex')) return 'math-vendor'
          if (id.includes('lucide-react')) return 'icons-vendor'
          return undefined
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 4173,
  },
})
