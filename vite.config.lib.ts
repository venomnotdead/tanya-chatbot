import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.tsx', 'src/**/*.stories.tsx', 'src/main.tsx', 'src/App.tsx']
    })
  ],
  build: {
    outDir: 'dist',
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'TanyaChatbot',
      fileName: (format) => `tanya-chatbot.${format}.js`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: [
        'react', 
        'react-dom', 
        'react/jsx-runtime',
        'react-redux',
        'react-router-dom',
        '@reduxjs/toolkit',
        '@apollo/client',
        'graphql',
        'axios',
        'crypto-js',
        'buffer',
        '@iconify/react',
        '@radix-ui/react-popover',
        'react-toastify',
        'clsx',
        'tailwind-merge',
        '@tailwindcss/typography',
        'tailwindcss-animate'
      ],
      output: {
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          'react-redux': 'ReactRedux',
          'react-router-dom': 'ReactRouterDOM',
          '@reduxjs/toolkit': 'RTK',
          '@apollo/client': 'ApolloClient'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'tanya-chatbot.css';
          }
          return assetInfo.name;
        }
      }
    },
    cssCodeSplit: false,
    sourcemap: true,
    emptyOutDir: true
  }
});