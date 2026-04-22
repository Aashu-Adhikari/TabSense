import React from 'react';
import '../../styles/components/barchart.css';

function BarChart({ data = [], height = 150 }) {
  // data should be array of { label, value, tooltip }
  
  if (data.length === 0) {
    return <div className="barchart-empty">No historical data</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value), 1); // Avoid div by 0

  return (
    <div className="barchart-container" style={{ height: `${height}px` }}>
      <div className="barchart-bars">
        {data.map((item, idx) => {
          const heightPct = Math.max((item.value / maxValue) * 100, 2); // At least 2% height for visibility
          
          return (
            <div key={idx} className="barchart-bar-wrapper" title={item.tooltip || `${item.value}`}>
              <div 
                className="barchart-bar" 
                style={{ height: `${heightPct}%` }}
              ></div>
              <div className="barchart-label">{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BarChart;
