import React from 'react';
import { truncateUrl } from '../utils/uiUtils';

const SearchResultsView = ({ 
  searchResults, 
  searchLoading, 
  searchTerm,
  onClearSearch,
  onAddToGroup,
  groups,
  onOpenTab 
}) => {
  if (!searchResults || searchLoading) {
    return searchLoading ? (
      <div className="loading-state">🔍 Searching...</div>
    ) : null;
  }

  const { searchResults: allResults, groupedResults, ungroupedResults } = searchResults;

  const highlightText = (text) => {
    if (!searchTerm.trim()) return text;
    
    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <span key={index} className="search-highlight">{part}</span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="search-results-container">
      <div className="search-header">
        <h3>
          🔍 Search Results
          <span className="search-count">
            {allResults.length} match{allResults.length !== 1 ? 'es' : ''}
          </span>
        </h3>
        <button 
          className="clear-search-btn"
          onClick={onClearSearch}
        >
          Clear Search
        </button>
      </div>

      {groupedResults.length > 0 && (
        <div className="search-section">
          <div className="search-section-header">
            <h4>📁 In Groups</h4>
            <span className="search-section-count">{groupedResults.length}</span>
          </div>
          <div className="search-tabs-list">
            {groupedResults.map(tab => {
              const group = groups.find(g => g.tabs.some(gt => gt.id === tab.id));
              return (
                <div 
                  key={tab.id} 
                  className="search-tab-item clickable-tab"
                  onClick={() => onOpenTab(tab.id, tab.windowId)}
                  title="Click to open tab"
                >
                  <img 
                    src={tab.favIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCAxLjVhNi41IDYuNSAwIDEgMCAwIDEzIDYuNSA2LjUgMCAwIDAgMC0xM3pNOC41IDV2My4zTDEwLjggOS43YS41LjUgMCAxIDEtLjcuN0w3LjUgOC4yYTEgMSAwIDAgMS0uNS0uOVY1YTEgMSAwIDAgMSAxLTFoMHAgMSAxIDAgMCAxIDEgMXoiIGZpbGw9IiM2NjY2NjYiLz48L3N2Zz4='} 
                    alt="Favicon" 
                    className="search-tab-favicon" 
                  />
                  <div className="search-tab-info">
                    <div className="search-tab-title">
                      {highlightText(tab.title)}
                    </div>
                    <div className="search-tab-meta">
                      {group && (
                        <span className="search-tab-group">
                          {group.title}
                        </span>
                      )}
                      <span className="search-tab-url" title={tab.url}>
                        {truncateUrl(tab.url)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ungroupedResults.length > 0 && (
        <div className="search-section">
          <div className="search-section-header">
            <h4>🔓 Ungrouped</h4>
            <span className="search-section-count">{ungroupedResults.length}</span>
          </div>
          <div className="search-tabs-list">
            {ungroupedResults.map(tab => (
              <div 
                key={tab.id} 
                className="search-tab-item clickable-tab"
                onClick={() => onOpenTab(tab.id, tab.windowId)}
                title="Click to open tab"
              >
                <img 
                  src={tab.favIconUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCAxLjVhNi41IDYuNSAwIDEgMCAwIDEzIDYuNSA2LjUgMCAwIDAgMC0xM3pNOC41IDV2My4zTDEwLjggOS43YS41LjUgMCAxIDEtLjcuN0w3LjUgOC4yYTEgMSAwIDAgMS0uNS0uOVY1YTEgMSAwIDAgMSAxLTFoMHAgMSAxIDAgMCAxIDEgMXoiIGZpbGw9IiM2NjY2NjYiLz48L3N2Zz4='} 
                  alt="Favicon" 
                  className="search-tab-favicon" 
                />
                <div className="search-tab-info">
                  <div className="search-tab-title">
                    {highlightText(tab.title)}
                  </div>
                  <div className="search-tab-meta">
                    <span className="search-tab-url" title={tab.url}>
                      {truncateUrl(tab.url)}
                    </span>
                  </div>
                </div>
                {groups.length > 0 && (
                  <select 
                    className="search-group-select"
                    onChange={(e) => {
                      if (e.target.value) {
                        onAddToGroup(tab.id, parseInt(e.target.value));
                        e.target.value = "";
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">Add to group...</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.title} ({group.tabs.length})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {allResults.length === 0 && (
        <div className="no-results">
          No tabs found for "{searchTerm}"
        </div>
      )}
    </div>
  );
};

export default SearchResultsView;
