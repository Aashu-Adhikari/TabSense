// Test the sorting of groups by name after emoji

function testSorting() {
  const testGroups = [
    { suggestedName: '🌍 Google' },
    { suggestedName: '📚 Docs' },
    { suggestedName: '🤖 OpenRouter' },
    { suggestedName: '💻 GitHub' },
    { suggestedName: '📧 Gmail' },
    { suggestedName: '🛒 Amazon' }
  ];

  console.log('=== Testing Group Sorting ===');
  console.log('Original order:');
  testGroups.forEach(group => {
    console.log(`- ${group.suggestedName}`);
  });

  // Sort using the same method as in groupingAlgorithms.js
  const sortedGroups = [...testGroups].sort((a, b) => {
    const aName = a.suggestedName.replace(/^[\p{Emoji}]+ /u, '');
    const bName = b.suggestedName.replace(/^[\p{Emoji}]+ /u, '');
    return aName.localeCompare(bName);
  });

  console.log('\nSorted order (by name after emoji):');
  sortedGroups.forEach(group => {
    console.log(`- ${group.suggestedName}`);
  });

  // Expected sorted order by name after emoji
  const expectedOrder = ['Amazon', 'Docs', 'Gmail', 'GitHub', 'Google', 'OpenRouter'];

  const actualOrder = sortedGroups.map(group => 
    group.suggestedName.replace(/^[\p{Emoji}]+ /u, '')
  );

  console.log('\n=== Verification ===');
  console.log('Expected:', expectedOrder);
  console.log('Actual:', actualOrder);

  if (JSON.stringify(expectedOrder) === JSON.stringify(actualOrder)) {
    console.log('\n✅ Sorting works correctly');
  } else {
    console.log('\n❌ Sorting is incorrect');
  }
}

testSorting();
