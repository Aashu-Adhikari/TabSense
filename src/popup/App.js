// Main Popup React Component - WITH SEARCH
import React, { useState, useEffect } from 'react';
import './popup.css';

function App() {
  // State to hold our list of ALL tabs
  const [allTabs, setAllTabs] = useState([]);
  // State to hold the currently filtered list for display
  const [filteredTabs, setFilteredTabs] = useState([]);
  // State for the search input
  const [searchTerm, setSearchTerm] = useState('');
  // State to track loading status
  const [loading, setLoading] = useState(true);

  // Fetch tabs when the component loads
  useEffect(() => {
    const fetchTabs = () => {
      chrome.runtime.sendMessage({ action: "GET_ALL_TABS" }, (response) => {
        if (response && response.success) {
          setAllTabs(response.tabs);
          setFilteredTabs(response.tabs); // Initially, show all tabs
        } else {
          console.error("Failed to fetch tabs:", response);
        }
        setLoading(false);
      });
    };
    fetchTabs();
  }, []);

  // Filter tabs whenever the search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      // If search is empty, show all tabs
      setFilteredTabs(allTabs);
      return;
    }

    const lowercasedTerm = searchTerm.toLowerCase();
    const filtered = allTabs.filter(tab => {
      return (
        tab.title.toLowerCase().includes(lowercasedTerm) ||
        tab.url.toLowerCase().includes(lowercasedTerm)
      );
    });
    setFilteredTabs(filtered);
  }, [searchTerm, allTabs]); // Re-run when searchTerm or allTabs changes

  const handleRefresh = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ action: "GET_ALL_TABS" }, (response) => {
      if (response && response.success) {
        setAllTabs(response.tabs);
        // Re-apply the current search filter to the new data
        const lowercasedTerm = searchTerm.toLowerCase();
        const filtered = response.tabs.filter(tab => {
          return (
            tab.title.toLowerCase().includes(lowercasedTerm) ||
            tab.url.toLowerCase().includes(lowercasedTerm)
          );
        });
        setFilteredTabs(filtered);
      }
      setLoading(false);
    });
  };

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>🪄 TabSynth</h1>
        <p className="subtitle">Your Tab Assistant</p>
      </header>

      <main className="popup-main">
        {/* --- NEW SEARCH BAR --- */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Search tabs by title or URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {/* --- END NEW SEARCH BAR --- */}

        {loading ? (
          <div className="loading-state">Loading your tabs...</div>
        ) : (
          <>
            <div className="tabs-header">
              <h2>
                Open Tabs 
                {/* Show filtered count vs total */}
                <span className="tab-count">
                  ({filteredTabs.length}{searchTerm && ` of ${allTabs.length}`})
                </span>
              </h2>
            </div>
            <div className="tabs-list">
              {filteredTabs.length > 0 ? (
                filteredTabs.map((tab) => (
                  <div key={tab.id} className="tab-item">
                    <img 
                      src={tab.favIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCAxLjVhNi41IDYuNSAwIDEgMCAwIDEzIDYuNSA2LjUgMCAwIDAgMC0xM3pNOC41IDV2My4zTDEwLjggOS43YS41LjUgMCAxIDEtLjcuN0w3LjUgOC4yYTEgMSAwIDAgMS0uNS0uOVY1YTEgMSAwIDAgMSAxLTFoMGEgMSAxIDAgMCAxIDEgMXoiIGZpbGw9IiM2NjY2NjYiLz48L3N2Zz4='} 
                      alt="Favicon" 
                      className="tab-favicon" 
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <div className="tab-info">
                      <div className="tab-title">{tab.title}</div>
                      <div className="tab-url">{tab.url}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  {searchTerm 
                    ? `No tabs found for "${searchTerm}"` 
                    : "No tabs found."}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="popup-footer">
        <button 
          className="primary-btn"
          onClick={handleRefresh}
        >
          Refresh Tabs
        </button>
      </footer>
    </div>
  );
}

export default App;