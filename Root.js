import React from 'react';
import { AuthProvider } from './context/AuthContext';
import App from './App';

export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
} 