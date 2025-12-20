// Search-related message handlers

export function handleSearchAllTabs(request, sendResponse) {
  const { searchTerm } = request;
  
  chrome.tabs.query({}, (allTabs) => {
    if (!searchTerm.trim()) {
      sendResponse({ 
        success: true, 
        searchResults: [],
        groupedResults: [],
        ungroupedResults: []
      });
      return true;
    }

    const term = searchTerm.toLowerCase();
    const allResults = [];
    const groupedResults = [];
    const ungroupedResults = [];

    allTabs.forEach(tab => {
      const matches = tab.title.toLowerCase().includes(term) || 
                     tab.url.toLowerCase().includes(term);
      
      if (matches) {
        const tabData = {
          id: tab.id,
          title: tab.title,
          url: tab.url,
          favIconUrl: tab.favIconUrl,
          windowId: tab.windowId,
          groupId: tab.groupId,
          isGrouped: tab.groupId !== -1
        };
        
        allResults.push(tabData);
        
        if (tab.groupId !== -1) {
          groupedResults.push(tabData);
        } else {
          ungroupedResults.push(tabData);
        }
      }
    });

    sendResponse({ 
      success: true, 
      searchResults: allResults,
      groupedResults: groupedResults,
      ungroupedResults: ungroupedResults,
      searchTerm: searchTerm
    });
  });
  return true;
}
