import React, { useState, useEffect } from 'react';
import '../styles/components/analytics.css';
import { IconMaximize, IconRefresh } from './common/Icons';
import BarChart from './charts/BarChart';
import { calculateFocusScore, estimateMemoryUsage, getStaleTabs } from '../utils/analyticsHelpers';

function formatTime(ms) {
  if (!ms || ms < 1000) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function AnalyticsView({ groups = [], ungroupedTabs = [], isPopup = false, onRefreshTabs = null }) {
  const [timeData, setTimeData] = useState({ today: { domains: {}, tabs: {}, total: 0 }, history: [] });
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ action: "GET_TIME_ANALYTICS" }, (response) => {
      if (response && response.success) {
        setTimeData(response.data || { today: { domains: {}, tabs: {}, total: 0 }, history: [] });
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const totalTabs = ungroupedTabs.length + groups.reduce((acc, g) => acc + (g.tabs ? g.tabs.length : 0), 0);
  const groupedCount = groups.reduce((acc, g) => acc + (g.tabs ? g.tabs.length : 0), 0);
  const ungroupedCount = ungroupedTabs.length;
  
  const groupedPercentage = totalTabs > 0 ? Math.round((groupedCount / totalTabs) * 100) : 0;
  
  let clutterScore = "Zen Master";
  let clutterColor = "var(--success-color, #10b981)";
  if (totalTabs > 10) { clutterScore = "Busy Explorer"; clutterColor = "var(--warning-color, #f59e0b)"; }
  if (totalTabs > 30) { clutterScore = "Tab Hoarder"; clutterColor = "var(--danger-color, #ef4444)"; }

  // Collect all raw tab objects for helper functions
  const allTabs = [...ungroupedTabs, ...groups.flatMap(g => g.tabs || [])];

  const memoryEstimate = estimateMemoryUsage(allTabs);
  const staleTabs = getStaleTabs(allTabs);
  const { score: focusScore, productiveTime, distractedTime } = calculateFocusScore(timeData.today);

  // Sort domains by time
  const topDomains = Object.entries(timeData.today.domains || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Sort specific tabs by time
  const topTabs = Object.values(timeData.today.tabs || {})
    .sort((a, b) => b.time - a.time)
    .slice(0, 5);

  // Prepare chart data (reverse to chronological order)
  const chartData = [...(timeData.history || [])].reverse().map(d => {
    const day = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' });
    return {
      label: day,
      value: d.total,
      tooltip: `${d.date}: ${formatTime(d.total)}`
    };
  });

  const handleEnlarge = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('analytics.html') });
  };

  const handleCloseStaleTabs = () => {
    if (staleTabs.length === 0) return;
    if (window.confirm(`Are you sure you want to close ${staleTabs.length} stale tabs?`)) {
      const tabIds = staleTabs.map(t => t.id);
      chrome.tabs.remove(tabIds, () => {
        fetchAnalytics();
        if (onRefreshTabs) onRefreshTabs();
      });
    }
  };

  return (
    <div className={`analytics-container ${isPopup ? 'is-popup' : ''}`}>
      <div className="analytics-header">
        <h2 className="analytics-title">Dashboard</h2>
        <div className="analytics-actions">
          <button className="analytics-btn" onClick={fetchAnalytics} title="Refresh Data">
            <IconRefresh className="analytics-icon" />
          </button>
          <button className="analytics-btn" onClick={handleEnlarge} title="Open Full Screen">
            <IconMaximize className="analytics-icon" />
          </button>
        </div>
      </div>

      <div className="analytics-content">
        <div className="analytics-row">
          <div className="analytics-card flex-1">
            <div className="analytics-card-title">Browser Health</div>
            <div className="analytics-metric" style={{ color: clutterColor }}>{clutterScore}</div>
            <div className="analytics-sub">Total Open Tabs: {totalTabs}</div>
          </div>
          <div className="analytics-card flex-1">
            <div className="analytics-card-title">Active Time (Today)</div>
            <div className="analytics-metric">{formatTime(timeData.today.total)}</div>
            <div className="analytics-sub">Focus Score: {focusScore}/100</div>
          </div>
        </div>

        <div className="analytics-row">
          <div className="analytics-card flex-1">
            <div className="analytics-card-title">Est. Memory Usage</div>
            <div className="analytics-metric">{memoryEstimate}</div>
          </div>
          <div className="analytics-card flex-1">
            <div className="analytics-card-title">Focus Breakdown</div>
            <div className="analytics-sub">Productive: {formatTime(productiveTime)}</div>
            <div className="analytics-sub">Distracting: {formatTime(distractedTime)}</div>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-title">Historical Trends (Last 7 Days)</div>
          <BarChart data={chartData} height={120} />
        </div>

        <div className="analytics-card">
          <div className="analytics-card-title">Organization Status</div>
          <div className="analytics-progress-container">
            <div className="analytics-progress-bar" style={{ width: `${groupedPercentage}%` }}></div>
          </div>
          <div className="analytics-progress-labels">
            <span>{groupedPercentage}% Grouped ({groupedCount})</span>
            <span>{100 - groupedPercentage}% Floating ({ungroupedCount})</span>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-title">Top Domains by Time</div>
          {topDomains.length > 0 ? (
            <ul className="analytics-list">
              {topDomains.map(([domain, time]) => (
                <li key={domain} className="analytics-list-item">
                  <span className="analytics-list-name">{domain}</span>
                  <span className="analytics-list-value">{formatTime(time)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="analytics-empty">Not enough data yet.</div>
          )}
        </div>

        <div className="analytics-card">
          <div className="analytics-card-title">Top Tabs by Time</div>
          {topTabs.length > 0 ? (
            <ul className="analytics-list">
              {topTabs.map((tab, idx) => (
                <li key={idx} className="analytics-list-item">
                  <img src={tab.favIconUrl || 'icons/icon16.png'} className="analytics-favicon" alt="" />
                  <span className="analytics-list-name truncate" title={tab.title}>{tab.title}</span>
                  <span className="analytics-list-value">{formatTime(tab.time)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="analytics-empty">Not enough data yet.</div>
          )}
        </div>

        {staleTabs.length > 0 && (
          <div className="analytics-card" style={{ borderColor: 'var(--warning-color, #f59e0b)' }}>
            <div className="analytics-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>The Graveyard (Stale Tabs &gt; 24h)</span>
              <button 
                className="analytics-btn" 
                onClick={handleCloseStaleTabs}
                style={{ 
                  color: '#fff', 
                  backgroundColor: 'var(--danger-color, #ef4444)', 
                  padding: '4px 8px', 
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '4px'
                }}
              >
                Clear All
              </button>
            </div>
            <ul className="analytics-list">
              {staleTabs.slice(0, 5).map((tab, idx) => {
                const daysOld = Math.floor((Date.now() - tab.lastAccessed) / (24 * 60 * 60 * 1000));
                return (
                  <li key={idx} className="analytics-list-item">
                    <img src={tab.favIconUrl || 'icons/icon16.png'} className="analytics-favicon" alt="" />
                    <span className="analytics-list-name truncate" title={tab.title}>{tab.title}</span>
                    <span className="analytics-list-value" style={{ color: 'var(--warning-color, #f59e0b)' }}>
                      {daysOld}d ago
                    </span>
                  </li>
                );
              })}
            </ul>
            {staleTabs.length > 5 && (
              <div className="analytics-sub" style={{ textAlign: 'center', marginTop: '8px' }}>
                + {staleTabs.length - 5} more stale tabs
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsView;
