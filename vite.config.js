import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  console.log('Loaded environment variables:', {
    API_KEY: env.VITE_GOOGLE_SHEETS_API_KEY,
    SHEET_ID: env.VITE_GOOGLE_SHEETS_ID,
    CLIENT_ID: env.VITE_GOOGLE_CLIENT_ID,
    GEMINI_KEY: env.VITE_GEMINI_API_KEY ? 'Set' : 'Not set',
  });

  return {
    root: './src',
    publicDir: '../public',
    build: {
      outDir: '../dist',
    },
    server: {
      port: 3000,
      open: true,
    },
    define: {
      'import.meta.env.VITE_GOOGLE_SHEETS_API_KEY': JSON.stringify(env.VITE_GOOGLE_SHEETS_API_KEY),
      'import.meta.env.VITE_GOOGLE_SHEETS_ID': JSON.stringify(env.VITE_GOOGLE_SHEETS_ID),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
    },
  };
});