import React from 'react';
import { createRoot } from 'react-dom/client';
import AnalyticsApp from './AnalyticsApp';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <AnalyticsApp />
  </React.StrictMode>
);
