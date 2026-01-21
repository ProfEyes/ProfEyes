import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  root: process.cwd(),
  base: "/",
  publicDir: "public",
  define: {
    global: 'globalThis',
  },
  server: {
    host: "127.0.0.1", // Alterado de "0.0.0.0" para "127.0.0.1"
    port: 8090, // Alterado de 3000 para 8090
    strictPort: false, // Permitir fallback para outra porta se 8090 estiver ocupada
    cors: true,
    open: false,
    fs: {
      strict: false
    },
    watch: {
      usePolling: false,
      interval: 1000,
      ignored: [
        '**/public/images/**/*.html',
        '**/email_template.html',
        '**/node_modules/**',
        '**/.git/**'
      ]
    },
  },
  preview: {
    port: 8090, // Alterado de 3000 para 8090
    host: "127.0.0.1", // Alterado de "0.0.0.0" para "127.0.0.1"
    strictPort: false
  },
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(__dirname, "./node_modules/react/jsx-runtime"),
      "react-tiny-popover": path.resolve(__dirname, "./node_modules/react-tiny-popover"),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react-tiny-popover'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'react-tiny-popover'
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
      'chunk-3WC',
      'chunk-ZMLY2J2T'
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
