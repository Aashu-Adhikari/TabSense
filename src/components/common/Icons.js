import React from 'react';

const Icon = ({ children, className = '' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const IconFolder = ({ className }) => (
  <Icon className={className}>
    <path d="M3 7h6l2 2h10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Icon>
);

export const IconChat = ({ className }) => (
  <Icon className={className}>
    <path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
  </Icon>
);

export const IconSettings = ({ className }) => (
  <Icon className={className}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="2" y1="14" x2="6" y2="14" />
    <line x1="10" y1="8" x2="14" y2="8" />
    <line x1="18" y1="16" x2="22" y2="16" />
  </Icon>
);

export const IconRefresh = ({ className }) => (
  <Icon className={className}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.5 9a9 9 0 0 1 14.1-3.4L23 10" />
    <path d="M20.5 15a9 9 0 0 1-14.1 3.4L1 14" />
  </Icon>
);

export const IconChevrons = ({ className }) => (
  <Icon className={className}>
    <polyline points="7 9 12 4 17 9" />
    <polyline points="7 15 12 20 17 15" />
  </Icon>
);

export const IconArrowLeft = ({ className }) => (
  <Icon className={className}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </Icon>
);

export const IconTrash = ({ className }) => (
  <Icon className={className}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </Icon>
);

export const IconFile = ({ className }) => (
  <Icon className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </Icon>
);

export const IconCopy = ({ className }) => (
  <Icon className={className}>
    <rect x="9" y="9" width="11" height="11" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);

export const IconSort = ({ className }) => (
  <Icon className={className}>
    <path d="M11 5h10" />
    <path d="M7 9H21" />
    <path d="M15 13h6" />
    <path d="M3 5v14" />
    <path d="M3 19l-2-2" />
    <path d="M3 19l2-2" />
  </Icon>
);

export const IconHeart = ({ className }) => (
  <Icon className={className}>
    <path d="M20.8 6.8a4.5 4.5 0 0 0-6.4 0L12 9.2l-2.4-2.4a4.5 4.5 0 1 0-6.4 6.4L12 22l8.8-8.8a4.5 4.5 0 0 0 0-6.4z" />
  </Icon>
);

export const IconSidebar = ({ className }) => (
  <Icon className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </Icon>
);

export const IconExternal = ({ className }) => (
  <Icon className={className}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </Icon>
);

export const IconStop = ({ className }) => (
  <Icon className={className}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </Icon>
);

export const IconSend = ({ className }) => (
  <Icon className={className}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </Icon>
);

export const IconUndo = ({ className }) => (
  <Icon className={className}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
  </Icon>
);

export const IconRedo = ({ className }) => (
  <Icon className={className}>
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
  </Icon>
);
