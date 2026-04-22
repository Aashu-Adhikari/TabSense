// src/utils/analyticsHelpers.js

export const DISTRACTING_DOMAINS = [
  'twitter.com', 'x.com', 'reddit.com', 'instagram.com', 
  'facebook.com', 'tiktok.com', 'netflix.com', 'hulu.com',
  'youtube.com', 'twitch.tv'
];

export function calculateFocusScore(timeData) {
  if (!timeData || !timeData.domains || Object.keys(timeData.domains).length === 0) return { score: 100, productiveTime: 0, distractedTime: 0 };
  
  let totalTime = timeData.total || 0;
  if (totalTime === 0) return { score: 100, productiveTime: 0, distractedTime: 0 };

  let distractedTime = 0;
  for (const [domain, time] of Object.entries(timeData.domains)) {
    if (DISTRACTING_DOMAINS.some(d => domain.includes(d))) {
      distractedTime += time;
    }
  }

  let productiveTime = totalTime - distractedTime;
  if (productiveTime < 0) productiveTime = 0;

  const score = Math.round((productiveTime / totalTime) * 100);
  return { score, productiveTime, distractedTime };
}

export function estimateMemoryUsage(tabs) {
  // Rough heuristic:
  // Video/Streaming: ~150MB
  // Heavy Web Apps (Docs, Mail, Figma): ~100MB
  // Standard Sites: ~50MB
  let totalMB = 0;
  
  tabs.forEach(tab => {
    if (!tab || !tab.url) {
      totalMB += 30; // Suspended/empty tab
      return;
    }
    
    const url = tab.url.toLowerCase();
    if (url.includes('youtube.com') || url.includes('netflix.com') || url.includes('twitch.tv')) {
      totalMB += 150;
    } else if (url.includes('docs.google.com') || url.includes('mail.google.com') || url.includes('figma.com') || url.includes('github.com')) {
      totalMB += 100;
    } else {
      totalMB += 50;
    }
  });

  if (totalMB > 1024) {
    return `${(totalMB / 1024).toFixed(1)} GB`;
  }
  return `${totalMB} MB`;
}

export function getStaleTabs(tabs) {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  return tabs.filter(tab => {
    if (!tab.lastAccessed) return false;
    return (now - tab.lastAccessed) > ONE_DAY_MS;
  }).sort((a, b) => a.lastAccessed - b.lastAccessed); // Oldest first
}
