import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import MissingConfigScreen from './components/MissingConfigScreen';
import { isSupabaseConfigured } from './services/supabaseClient';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isSupabaseConfigured ? <App /> : <MissingConfigScreen />}
  </React.StrictMode>
);
