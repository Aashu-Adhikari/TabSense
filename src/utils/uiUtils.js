// Color and UI utility functions

export const getColorEmoji = (color) => {
  const emojiMap = {
    'grey': '⚫', 
    'blue': '🔵', 
    'red': '🔴', 
    'yellow': '🟡',
    'green': '🟢', 
    'pink': '🟣', 
    'purple': '🟣', 
    'cyan': '🔵', 
    'orange': '🟠'
  };
  return emojiMap[color] || '⚫';
};

export const getCategoryEmoji = (category) => {
  const emojiMap = {
    'Code & Development': '💻',
    'Documentation': '📚',
    'Social Media': '🐦',
    'Shopping': '🛒',
    'News & Articles': '📰',
    'Video & Entertainment': '🎬',
    'Productivity & Tools': '⚡',
    'Email & Communication': '📧',
    'AI & Machine Learning': '🤖',
    'General Browsing': '🌐'
  };
  
  return emojiMap[category] || '📁';
};

export const generateFallbackFavicon = () => {
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCAxLjVhNi41IDYuNSAwIDEgMCAwIDEzIDYuNSA2LjUgMCAwIDAgMC0xM3pNOC41IDV2My4zTDEwLjggOS43YS41LjUgMCAxIDEtLjcuN0w3LjUgOC4yYTEgMSAwIDAgMS0uNS0uOVY1YTEgMSAwIDAgMSAxLTFoMHAgMSAxIDAgMCAxIDEgMXoiIGZpbGw9IiM2NjY2NjYiLz48L3N2Zz4=';
};

export const truncateUrl = (url, maxLength = 50) => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const path = urlObj.pathname + urlObj.search;
    
    if (path === '/') {
      return domain;
    }
    
    const fullUrl = domain + path;
    return fullUrl.length > maxLength 
      ? fullUrl.substring(0, maxLength) + '...'
      : fullUrl;
  } catch {
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
  }
};
