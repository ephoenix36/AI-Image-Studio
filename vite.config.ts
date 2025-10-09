import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 8005,
      host: '0.0.0.0',
      strictPort: false
    },
    preview: {
      port: 8005
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // Vertex AI configuration
      'process.env.GOOGLE_GENAI_USE_VERTEXAI': JSON.stringify(env.GOOGLE_GENAI_USE_VERTEXAI),
      'process.env.GOOGLE_CLOUD_PROJECT': JSON.stringify(env.GOOGLE_CLOUD_PROJECT),
      'process.env.GOOGLE_CLOUD_LOCATION': JSON.stringify(env.GOOGLE_CLOUD_LOCATION)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.')
      }
    }
  };
});
