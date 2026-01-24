// Test that uses Chrome API to verify group positioning

// This test must be run in a Chrome extension environment

function testGroupPositioning() {
  // 1. First, create some test tabs
  chrome.tabs.create({ url: 'https://www.google.com', active: false }, (tab1) => {
    chrome.tabs.create({ url: 'https://docs.google.com', active: false }, (tab2) => {
      chrome.tabs.create({ url: 'https://github.com', active: false }, (tab3) => {
        chrome.tabs.create({ url: 'https://openrouter.ai', active: false }, (tab4) => {
          // 2. Group the tabs
          chrome.tabs.query({}, (allTabs) => {
            console.log('All tabs:', allTabs.map(t => t.title));
            
            // Group by domain
            chrome.runtime.sendMessage({ action: "GROUP_BY_DOMAIN" }, (response) => {
              console.log('Grouping response:', response);
              
              // 3. Verify groups are sorted alphabetically
              chrome.tabGroups.query({}, (groups) => {
                console.log('Groups after grouping:', groups.map(g => `${g.title} (${g.id})`));
                
                // Sort groups by name after emoji
                const sortedGroups = [...groups].sort((a, b) => {
                  const aName = a.title.replace(/^[\p{Emoji}]+ /u, '');
                  const bName = b.title.replace(/^[\p{Emoji}]+ /u, '');
                  return aName.localeCompare(bName);
                });
                
                console.log('Groups sorted alphabetically:', sortedGroups.map(g => `${g.title} (${g.id})`));
                
                // 4. Verify the position of each group in the tab strip
                chrome.tabs.query({}, (allTabsAfterGrouping) => {
                  console.log('Tabs after grouping:', allTabsAfterGrouping.map(t => `${t.title} (Group: ${t.groupId})`));
                  
                  // Check if the group order in the tab strip matches the sorted order
                  const groupIdsInOrder = [];
                  allTabsAfterGrouping.forEach(tab => {
                    if (tab.groupId !== -1 && !groupIdsInOrder.includes(tab.groupId)) {
                      groupIdsInOrder.push(tab.groupId);
                    }
                  });
                  
                  const sortedGroupIds = sortedGroups.map(g => g.id);
                  
                  console.log('Group order in tab strip:', groupIdsInOrder);
                  console.log('Expected group order:', sortedGroupIds);
                  
                  if (JSON.stringify(groupIdsInOrder) === JSON.stringify(sortedGroupIds)) {
                    console.log('✅ Groups are in alphabetical order in the tab strip');
                  } else {
                    console.log('❌ Groups are not in alphabetical order in the tab strip');
                  }
                  
                  // 5. Cleanup
                  allTabsAfterGrouping.forEach(tab => {
                    chrome.tabs.remove(tab.id);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

// Run the test
testGroupPositioning();
