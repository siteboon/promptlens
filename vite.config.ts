import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.VITE_PORT || '3000'),
    strictPort: true,
    hmr: {
      overlay: true,
      clientPort: parseInt(process.env.VITE_PORT || '3000')
    },
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT || '3001'}`,
        changeOrigin: true,
        configure: (proxy, options) => {
          // Add retry logic for initial connection
          proxy.on('error', (err: NodeJS.ErrnoException, req, res) => {
            if (err.code === 'ECONNREFUSED') {
              // Retry the request after a delay
              setTimeout(() => {
                console.log('Retrying proxy request to backend...');
                proxy.web(req, res, options);
              }, 1000);
            }
          });
        }
      }
    }
  }
})
