// Default emoji and name settings for popular websites
// These will be used when no custom settings are defined by the user

export const DEFAULT_DOMAIN_SETTINGS = {
  // Social Media & Communication
  'facebook.com': { emoji: '👥', name: 'Facebook' },
  'twitter.com': { emoji: '🐦', name: 'Twitter' },
  'x.com': { emoji: '🐦', name: 'X' },
  'instagram.com': { emoji: '📸', name: 'Instagram' },
  'linkedin.com': { emoji: '💼', name: 'LinkedIn' },
  'tiktok.com': { emoji: '🎵', name: 'TikTok' },
  'snapchat.com': { emoji: '👻', name: 'Snapchat' },
  'discord.com': { emoji: '🎮', name: 'Discord' },
  'slack.com': { emoji: '💬', name: 'Slack' },
  'telegram.org': { emoji: '✈️', name: 'Telegram' },
  'whatsapp.com': { emoji: '💬', name: 'WhatsApp' },
  'reddit.com': { emoji: '🟠', name: 'Reddit' },
  'pinterest.com': { emoji: '📌', name: 'Pinterest' },
  'tumblr.com': { emoji: '🎨', name: 'Tumblr' },

  // Search Engines & Tech
  'google.com': { emoji: '🔍', name: 'Google' },
  'bing.com': { emoji: '🔍', name: 'Bing' },
  'duckduckgo.com': { emoji: '🦆', name: 'DuckDuckGo' },
  'yahoo.com': { emoji: '🦌', name: 'Yahoo' },
  'github.com': { emoji: '💻', name: 'GitHub' },
  'stackoverflow.com': { emoji: '❓', name: 'Stack Overflow' },
  'gitlab.com': { emoji: '🚀', name: 'GitLab' },
  'bitbucket.org': { emoji: '🐑', name: 'Bitbucket' },

  // Video & Streaming
  'youtube.com': { emoji: '📺', name: 'YouTube' },
  'vimeo.com': { emoji: '🎥', name: 'Vimeo' },
  'twitch.tv': { emoji: '🎮', name: 'Twitch' },
  'netflix.com': { emoji: '🍿', name: 'Netflix' },
  'hulu.com': { emoji: '📺', name: 'Hulu' },
  'disneyplus.com': { emoji: '🏰', name: 'Disney+' },
  'primevideo.com': { emoji: '📦', name: 'Prime Video' },
  'hbomax.com': { emoji: '🎬', name: 'HBO Max' },

  // News & Media
  'news.google.com': { emoji: '📰', name: 'Google News' },
  'bbc.com': { emoji: '🇬🇧', name: 'BBC' },
  'cnn.com': { emoji: '🌍', name: 'CNN' },
  'nytimes.com': { emoji: '🗽', name: 'NY Times' },
  'washingtonpost.com': { emoji: '📄', name: 'Washington Post' },
  'reuters.com': { emoji: '📰', name: 'Reuters' },
  'theguardian.com': { emoji: '🛡️', name: 'The Guardian' },

  // Shopping & Commerce
  'amazon.com': { emoji: '📦', name: 'Amazon' },
  'ebay.com': { emoji: '🏷️', name: 'eBay' },
  'etsy.com': { emoji: '🛍️', name: 'Etsy' },
  'aliexpress.com': { emoji: '🚚', name: 'AliExpress' },
  'walmart.com': { emoji: '🏪', name: 'Walmart' },
  'target.com': { emoji: '🎯', name: 'Target' },
  'bestbuy.com': { emoji: '📱', name: 'Best Buy' },

  // Productivity & Work
  'gmail.com': { emoji: '📧', name: 'Gmail' },
  'outlook.com': { emoji: '📧', name: 'Outlook' },
  'drive.google.com': { emoji: '📁', name: 'Google Drive' },
  'docs.google.com': { emoji: '📄', name: 'Google Docs' },
  'sheets.google.com': { emoji: '📊', name: 'Google Sheets' },
  'slides.google.com': { emoji: '📽️', name: 'Google Slides' },
  'notion.so': { emoji: '📝', name: 'Notion' },
  'trello.com': { emoji: '📋', name: 'Trello' },
  'asana.com': { emoji: '✅', name: 'Asana' },
  'monday.com': { emoji: '📅', name: 'Monday.com' },
  'zoom.us': { emoji: '📹', name: 'Zoom' },
  'meet.google.com': { emoji: '📹', name: 'Google Meet' },
  'teams.microsoft.com': { emoji: '👥', name: 'Microsoft Teams' },

  // Education & Learning
  'coursera.org': { emoji: '🎓', name: 'Coursera' },
  'udemy.com': { emoji: '📚', name: 'Udemy' },
  'edx.org': { emoji: '🎓', name: 'edX' },
  'khanacademy.org': { emoji: '🎓', name: 'Khan Academy' },
  'wikipedia.org': { emoji: '📖', name: 'Wikipedia' },

  // Entertainment & Gaming
  'spotify.com': { emoji: '🎵', name: 'Spotify' },
  'soundcloud.com': { emoji: '🎧', name: 'SoundCloud' },
  'pandora.com': { emoji: '🎼', name: 'Pandora' },
  'steam.com': { emoji: '🎮', name: 'Steam' },
  'epicgames.com': { emoji: '🎮', name: 'Epic Games' },
  'roblox.com': { emoji: '🎮', name: 'Roblox' },

  // Travel & Maps
  'maps.google.com': { emoji: '🗺️', name: 'Google Maps' },
  'booking.com': { emoji: '🏨', name: 'Booking.com' },
  'airbnb.com': { emoji: '🏠', name: 'Airbnb' },
  'tripadvisor.com': { emoji: '✈️', name: 'TripAdvisor' },

  // Finance & Banking
  'paypal.com': { emoji: '💳', name: 'PayPal' },
  'stripe.com': { emoji: '💳', name: 'Stripe' },
  'coinbase.com': { emoji: '₿', name: 'Coinbase' },
  'binance.com': { emoji: '📈', name: 'Binance' },

  // Health & Fitness
  'webmd.com': { emoji: '🏥', name: 'WebMD' },
  'mayoclinic.org': { emoji: '🏥', name: 'Mayo Clinic' },
  'fitbit.com': { emoji: '🏃', name: 'Fitbit' },
  'myfitnesspal.com': { emoji: '🍎', name: 'MyFitnessPal' },

  // Food & Recipes
  'allrecipes.com': { emoji: '🍳', name: 'AllRecipes' },
  'foodnetwork.com': { emoji: '🍽️', name: 'Food Network' },
  'yelp.com': { emoji: '⭐', name: 'Yelp' },
  'doordash.com': { emoji: '🚚', name: 'DoorDash' },
  'ubereats.com': { emoji: '🍕', name: 'Uber Eats' },

  // Other Popular Sites
  'imdb.com': { emoji: '🎬', name: 'IMDb' },
  'rottentomatoes.com': { emoji: '🍅', name: 'Rotten Tomatoes' },
  'craigslist.org': { emoji: '📜', name: 'Craigslist' },
  'dropbox.com': { emoji: '📦', name: 'Dropbox' },
  'medium.com': { emoji: '✍️', name: 'Medium' },
  'quora.com': { emoji: '❓', name: 'Quora' },
  'flickr.com': { emoji: '📷', name: 'Flickr' },
  'imgur.com': { emoji: '🖼️', name: 'Imgur' }
};

/**
 * Get default settings for a domain
 * @param {string} domain - The domain to get defaults for
 * @returns {Object|null} Default settings or null if no defaults exist
 */
export const getDefaultDomainSettings = (domain) => {
  return DEFAULT_DOMAIN_SETTINGS[domain] || null;
};

/**
 * Check if a domain has default settings
 * @param {string} domain - The domain to check
 * @returns {boolean} True if domain has defaults
 */
export const hasDefaultSettings = (domain) => {
  return domain in DEFAULT_DOMAIN_SETTINGS;
};