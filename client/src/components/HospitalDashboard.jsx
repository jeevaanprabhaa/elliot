import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowUp,
  FiClock,
  FiInfo,
  FiRefreshCw,
  FiShield,
  FiTrendingUp,
} from "react-icons/fi";

const API_URL = `${import.meta.env.VITE_API_URL || ""}`;
const riskOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const formatComponent = (component) =>
  component === "platelets" ? "Platelets" : "Whole blood";

function RiskBadge({ risk }) {
  return <span className={`elliot-risk elliot-risk-${risk.toLowerCase()}`}>{risk}</span>;
}

function ForecastChart({ item }) {
  const width = 520;
  const height = 190;
  const padding = { top: 16, right: 18, bottom: 28, left: 34 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const forecastHours = item.forecast[item.forecast.length - 1]?.hours || 72;
  const maxValue = Math.max(
    ...item.forecast.map((point) => Math.max(point.stock, point.demand)),
    item.currentStock,
    1,
  );
  const pointAt = (point, key) => {
    const x = padding.left + (point.hours / forecastHours) * innerWidth;
    const y = padding.top + innerHeight - (point[key] / maxValue) * innerHeight;
    return `${x},${y}`;
  };
  const stockPoints = item.forecast.map((point) => pointAt(point, "stock")).join(" ");
  const demandPoints = item.forecast.map((point) => pointAt(point, "demand")).join(" ");

  return (
    <div className="elliot-chart-wrap">
      <div className="elliot-chart-heading">
        <span>72-hour stock outlook</span>
        <span className="elliot-chart-legend">
          <i className="elliot-legend-stock" /> Stock
          <i className="elliot-legend-demand" /> Demand
        </span>
      </div>
      <svg
        className="elliot-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${item.bloodGroup} ${formatComponent(item.componentType)} forecast`}
      >
        {[0, 1, 2, 3].map((line) => {
          const y = padding.top + (innerHeight / 3) * line;
          return <line key={line} x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="elliot-grid-line" />;
        })}
        <polyline points={demandPoints} className="elliot-demand-line" />
        <polyline points={stockPoints} className="elliot-stock-line" />
        {item.forecast.map((point) => (
          <g key={`${point.hours}-${point.stock}`}>
            <circle cx={padding.left + (point.hours / forecastHours) * innerWidth} cy={padding.top + innerHeight - (point.stock / maxValue) * innerHeight} r="3.5" className="elliot-stock-dot" />
          </g>
        ))}
        <text x={padding.left} y={height - 7}>Now</text>
        <text x={width / 2 - 9} y={height - 7}>{forecastHours / 2}h</text>
        <text x={width - padding.right - 21} y={height - 7}>{forecastHours}h</text>
      </svg>
    </div>
  );
}

function HospitalDashboard() {
  const [prediction, setPrediction] = useState(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [filter, setFilter] = useState("all");
  const [horizon, setHorizon] = useState(72);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPrediction = async (requestedHorizon = horizon) => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API_URL}/api/elliot/shortage-prediction`, {
        params: { horizon: requestedHorizon },
      });
      setPrediction(response.data);
      setSelectedKey((current) => current || `${response.data.items[0]?.bloodGroup}:${response.data.items[0]?.componentType}`);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || requestError.message || "Unable to load Elliott prediction");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction(72);
  }, []);

  const selectHorizon = (nextHorizon) => {
    setHorizon(nextHorizon);
    fetchPrediction(nextHorizon);
  };

  const visibleItems = useMemo(() => {
    if (!prediction) return [];
    return prediction.items
      .filter((item) => filter === "all" || item.componentType === filter)
      .sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk] || b.shortageProbability - a.shortageProbability);
  }, [prediction, filter]);

  const selectedItem = prediction?.items.find(
    (item) => `${item.bloodGroup}:${item.componentType}` === selectedKey,
  ) || visibleItems[0];

  if (loading) {
    return (
      <div className="elliot-shell">
        <div className="elliot-loading"><FiRefreshCw className="animate-spin" /> Loading prototype prediction…</div>
      </div>
    );
  }

  if (error || !prediction) {
    return (
      <div className="elliot-shell">
        <div className="elliot-error">
          <FiAlertTriangle />
          <span>{error || "Prediction unavailable"}</span>
          <button onClick={fetchPrediction}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <main className="elliot-shell">
      <div className="elliot-container">
        <div className="elliot-header">
          <div>
            <div className="elliot-kicker"><FiActivity /> Hospital operations</div>
            <h1>AI Shortage Prediction</h1>
            <p>
              See blood and platelet availability risks before they become
              emergencies.
            </p>
          </div>
          <div className="elliot-header-actions">
            <span className="elliot-prototype-pill"><FiInfo /> {prediction.label}</span>
            <button className="elliot-refresh" onClick={fetchPrediction}><FiRefreshCw /> Refresh</button>
          </div>
        </div>

        <div className="elliot-demo-note">
          <FiShield />
          <div>
            <strong>Prototype intelligence layer</strong>
            <span>
              This demonstration combines a demo inventory baseline, simulated
              usage history, scheduled demand, seasonal heuristics, and live open
              requests. It is not a clinical decision system.
            </span>
          </div>
        </div>

        <div className="elliot-summary-grid">
          <div className="elliot-summary-card">
            <span className="elliot-summary-icon elliot-summary-icon-stock"><FiActivity /></span>
            <span><small>Signals tracked</small><strong>{prediction.summary.trackedSignals}</strong></span>
          </div>
          <div className="elliot-summary-card">
            <span className="elliot-summary-icon elliot-summary-icon-risk"><FiAlertTriangle /></span>
            <span><small>At-risk signals</small><strong>{prediction.summary.atRiskSignals}</strong></span>
          </div>
          <div className="elliot-summary-card">
            <span className="elliot-summary-icon elliot-summary-icon-critical"><FiTrendingUp /></span>
            <span><small>Critical shortages</small><strong>{prediction.summary.criticalCount}</strong></span>
          </div>
          <div className="elliot-summary-card">
            <span className="elliot-summary-icon elliot-summary-icon-live"><FiClock /></span>
            <span><small>Forecast window</small><strong>{prediction.horizonHours} hours</strong></span>
          </div>
        </div>

        <div className="elliot-content-grid">
          <section className="elliot-panel">
            <div className="elliot-panel-heading">
              <div>
                <span className="elliot-panel-kicker">Availability risk matrix</span>
                <h2>What needs attention?</h2>
              </div>
              <div className="elliot-controls">
                <div className="elliot-horizon">
                  {[24, 48, 72].map((option) => (
                    <button
                      key={option}
                      className={horizon === option ? "is-active" : ""}
                      onClick={() => selectHorizon(option)}
                    >
                      {option}h
                    </button>
                  ))}
                </div>
                <div className="elliot-filter">
                  {["all", "whole_blood", "platelets"].map((option) => (
                  <button
                    key={option}
                    className={filter === option ? "is-active" : ""}
                    onClick={() => setFilter(option)}
                  >
                    {option === "all" ? "All" : formatComponent(option)}
                  </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="elliot-risk-list">
              {visibleItems.map((item) => {
                const key = `${item.bloodGroup}:${item.componentType}`;
                return (
                  <button
                    className={`elliot-risk-row ${selectedKey === key ? "is-selected" : ""}`}
                    key={key}
                    onClick={() => setSelectedKey(key)}
                  >
                    <span className="elliot-blood-group">{item.bloodGroup}</span>
                    <span className="elliot-row-type">{formatComponent(item.componentType)}</span>
                    <span className="elliot-row-stock"><strong>{item.usableStock}</strong><small>usable / {item.currentStock} total</small></span>
                    <span className="elliot-row-demand"><strong>{item.predictedDemand}</strong><small>predicted demand</small></span>
                    <span className="elliot-row-prob"><strong>{item.shortageProbability}%</strong><small>probability</small></span>
                    <RiskBadge risk={item.risk} />
                    <FiArrowUp className="elliot-row-trend" />
                  </button>
                );
              })}
            </div>
          </section>

          {selectedItem && (
            <section className="elliot-panel elliot-detail-panel">
              <div className="elliot-detail-heading">
                <div>
                  <span className="elliot-panel-kicker">Selected forecast</span>
                  <h2>{selectedItem.bloodGroup} <small>{formatComponent(selectedItem.componentType)}</small></h2>
                </div>
                <RiskBadge risk={selectedItem.risk} />
              </div>
              <div className="elliot-detail-metrics">
                <div><small>Current stock</small><strong>{selectedItem.currentStock} <em>units</em></strong></div>
                <div><small>Predicted demand</small><strong>{selectedItem.predictedDemand} <em>units</em></strong></div>
                <div><small>Shortage probability</small><strong>{selectedItem.shortageProbability}%</strong></div>
                <div><small>Predicted shortage</small><strong className={selectedItem.predictedShortageTime ? "is-danger" : "is-safe"}>{selectedItem.predictedShortageTime || "Not within 72h"}</strong></div>
              </div>
              <ForecastChart item={selectedItem} />
              <div className="elliot-explain">
                <h3><FiInfo /> Why is this predicted?</h3>
                <ul>
                  {selectedItem.explainableFactors.map((factor) => <li key={factor}>{factor}</li>)}
                </ul>
              </div>
            </section>
          )}
        </div>

        <section className="elliot-data-sources">
          <div>
            <span className="elliot-panel-kicker">Model inputs</span>
            <h2>What Elliott is considering</h2>
          </div>
          <div className="elliot-source-grid">
            {Object.entries(prediction.dataSources).map(([name, source]) => (
              <div key={name}><strong>{name.replace(/([A-Z])/g, " $1")}</strong><span>{source}</span></div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default HospitalDashboard;