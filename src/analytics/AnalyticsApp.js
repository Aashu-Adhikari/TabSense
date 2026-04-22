import React, { useState, useEffect } from 'react';
import AnalyticsView from '../components/AnalyticsView';
import { useGroups } from '../hooks/useGroups';
import '../popup/base.css'; // Just to get some variables if needed
import '../styles/components/analytics.css';

function AnalyticsApp() {
  const { groups, ungroupedTabs, loading, fetchGroupsAndTabs } = useGroups();

  useEffect(() => {
    // Initial fetch
    fetchGroupsAndTabs();
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <img src="icons/icon48.png" alt="TabSense" style={{ width: '32px', height: '32px' }} />
        <h1 style={{ margin: 0, fontSize: '24px' }}>TabSense Analytics</h1>
      </header>
      <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {loading && (groups.length === 0 && ungroupedTabs.length === 0) ? (
          <div>Loading analytics data...</div>
        ) : (
          <AnalyticsView groups={groups} ungroupedTabs={ungroupedTabs} isPopup={false} onRefreshTabs={fetchGroupsAndTabs} />
        )}
      </main>
    </div>
  );
}

export default AnalyticsApp;
