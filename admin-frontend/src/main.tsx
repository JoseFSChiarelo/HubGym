import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { AuthProvider } from './modules/auth/AuthContext';

const theme = extendTheme({
  fonts: {
    heading: "'Montserrat', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif"
  },
  colors: {
    brand: {
      50: '#e3f2ff',
      500: '#3b7dd8',
      600: '#2f63ad'
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <HashRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    </ChakraProvider>
  </React.StrictMode>
);
