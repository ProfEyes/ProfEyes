import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "localhost",
    port: 8091,
    cors: true,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'max-age=31536000, immutable',
    },
    hmr: {
      overlay: true,
      timeout: 30000,
    },
    watch: {
      usePolling: false,
      interval: 1000,
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query'
    ],
    exclude: [
      // Excluindo os chunks que estão causando problemas na otimização
      'chunk-IYFCVA3S',
      'chunk-LUZMXLRO',
      'chunk-PQFV53ZG',
      'chunk-ICA7ZJMY',
      'chunk-MX6Z5XVE',
      'chunk-NR5',
      'chunk-TM2',
      'chunk-E3I',
      'chunk-ZPU',
      'chunk-EWW',
      'chunk-PAV',
      'chunk-3WC'
    ],
    force: true
  },
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    },
    manifest: true,
  },
}));
