import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/tokens.css';
import './styles/themes.css';

// TwitterSL v2 entry. Theme boot matches ocdemo behavior (storage key ocdemo-theme).
const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
