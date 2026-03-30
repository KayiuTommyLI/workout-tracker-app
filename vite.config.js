import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    root: './src',
    publicDir: '../public',
    build: {
      outDir: '../dist',
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
    define: {
      'import.meta.env.VITE_GOOGLE_SHEETS_API_KEY': JSON.stringify(env.VITE_GOOGLE_SHEETS_API_KEY),
      'import.meta.env.VITE_GOOGLE_SHEETS_ID': JSON.stringify(env.VITE_GOOGLE_SHEETS_ID),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID),
    },
  };
});