export const PATREON_URL = 'https://patreon.com/Ashura141?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink';

export const openPatreon = () => {
  if (typeof chrome !== 'undefined' && chrome?.tabs?.create) {
    chrome.tabs.create({ url: PATREON_URL });
    return;
  }

  window.open(PATREON_URL, '_blank', 'noopener,noreferrer');
};
