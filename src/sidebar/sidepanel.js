import React from 'react';
import ReactDOM from 'react-dom/client';
import SidebarApp from './SidebarApp';
import './sidebar-base.css';
import './sidebar-chat.css';
import './sidebar-settings.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SidebarApp />
  </React.StrictMode>
);