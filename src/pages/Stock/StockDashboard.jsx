import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { toast } from 'react-toastify';
import Chart from 'chart.js/auto';
import './css/StockDashboard.css';

const StockDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    ingredients: [],
    lowStock: [],
    transactions: [],
    associations: { menuItems: [], breakfasts: [], supplements: [], breakfastOptions: [] },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const chartRefs = useRef({
    usageChart: null,
    topUsedChart: null,
    refillChart: null,
  });

  // Function to get user_id from JWT
  const getUserIdFromToken = () => {
    const token = localStorage.getItem('jwt_token');
    if (!token || token === 'null' || token === 'undefined' || !token.trim()) {
      console.error('No valid JWT token found');
      return null;
    }
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      return decoded.id;
    } catch (error) {
      console.error('Error decoding JWT:', error.message);
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('sessionId');
      localStorage.removeItem('deviceId');
      return null;
    }
  };

  // Validate token before making requests
  const validateToken = () => {
    const token = localStorage.getItem('jwt_token');
    if (!token || token === 'null' || token === 'undefined' || !token.trim()) {
      setError('No valid authentication token found. Please log in again.');
      toast.error('Please log in again.');
      window.location.href = '/login';
      return false;
    }
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < currentTime) {
        setError('Authentication token has expired. Please log in again.');
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('deviceId');
        window.location.href = '/login';
        return false;
      }
      return true;
    } catch (error) {
      setError('Invalid authentication token. Please log in again.');
      toast.error('Invalid token. Please log in again.');
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('sessionId');
      localStorage.removeItem('deviceId');
      window.location.href = '/login';
      return false;
    }
  };

  // Function to create charts with proper timing
  const createCharts = () => {
    // Add a small delay to ensure DOM is fully rendered
    setTimeout(() => {
      // Helper function to get last 7 days
      const getLast7Days = () => {
        const dates = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }
        return dates;
      };

      // Helper function to aggregate transactions by date and ingredient
      const aggregateTransactions = (transactions, type, ingredients) => {
        const dataByIngredient = {};
        ingredients.forEach(ing => {
          dataByIngredient[ing.name] = { id: ing.id, data: {} };
        });

        transactions.forEach(tx => {
          if (tx.transaction_type === type) {
            const date = new Date(tx.created_at).toISOString().split('T')[0];
            if (dataByIngredient[tx.name]) {
              dataByIngredient[tx.name].data[date] = (dataByIngredient[tx.name].data[date] || 0) + Math.abs(tx.quantity);
            }
          }
        });

        return dataByIngredient;
      };

      // Ingredient Usage Over Time (Line Chart)
      const usageCanvas = document.getElementById('usageChart');
      if (usageCanvas) {
        const usageCtx = usageCanvas.getContext('2d');
        if (usageCtx) {
          if (chartRefs.current.usageChart) {
            chartRefs.current.usageChart.destroy();
          }

          const last7Days = getLast7Days();
          const usageData = aggregateTransactions(dashboardData.transactions, 'deduction', dashboardData.ingredients.slice(0, 3));

          const datasets = Object.keys(usageData).map((name, index) => {
            const colors = ['#1e40af', '#15803d', '#b91c1c'];
            return {
              label: name,
              data: last7Days.map(date => usageData[name].data[date] || 0),
              borderColor: colors[index % colors.length],
              backgroundColor: colors[index % colors.length] + '33', // Add transparency
              fill: true,
              tension: 0.4,
            };
          });

          chartRefs.current.usageChart = new Chart(usageCtx, {
            type: 'line',
            data: {
              labels: last7Days,
              datasets,
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                intersect: false,
              },
              scales: {
                x: { 
                  grid: { display: false },
                  ticks: { maxRotation: 45 }
                },
                y: { 
                  beginAtZero: true, 
                  title: { display: true, text: 'Quantity Used (kg)' }
                },
              },
              plugins: { 
                legend: { position: 'top' },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                }
              },
            },
          });
        }
      }

      // Top Used Ingredients (Bar Chart)
      const topUsedCanvas = document.getElementById('topUsedChart');
      if (topUsedCanvas) {
        const topUsedCtx = topUsedCanvas.getContext('2d');
        if (topUsedCtx) {
          if (chartRefs.current.topUsedChart) {
            chartRefs.current.topUsedChart.destroy();
          }

          const usageByIngredient = {};
          dashboardData.transactions.forEach(tx => {
            if (tx.transaction_type === 'deduction') {
              usageByIngredient[tx.name] = (usageByIngredient[tx.name] || 0) + Math.abs(tx.quantity);
            }
          });

          const sortedIngredients = Object.entries(usageByIngredient)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

          chartRefs.current.topUsedChart = new Chart(topUsedCtx, {
            type: 'bar',
            data: {
              labels: sortedIngredients.map(([name]) => name),
              datasets: [{
                label: 'Usage This Week (kg)',
                data: sortedIngredients.map(([_, qty]) => qty),
                backgroundColor: ['#1e40af', '#15803d', '#b91c1c', '#d97706', '#7c3aed'],
                borderColor: ['#1e40af', '#15803d', '#b91c1c', '#d97706', '#7c3aed'],
                borderWidth: 1,
              }],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, title: { display: true, text: 'Quantity (kg)' } },
              },
              plugins: { legend: { display: false } },
            },
          });
        }
      }

      // Stock Refill History (Stacked Bar Chart)
      const refillCanvas = document.getElementById('refillChart');
      if (refillCanvas) {
        const refillCtx = refillCanvas.getContext('2d');
        if (refillCtx) {
          if (chartRefs.current.refillChart) {
            chartRefs.current.refillChart.destroy();
          }

          const refillData = aggregateTransactions(dashboardData.transactions, 'addition', dashboardData.ingredients.slice(0, 3));
          const uniqueDates = [...new Set(dashboardData.transactions
            .filter(tx => tx.transaction_type === 'addition')
            .map(tx => new Date(tx.created_at).toISOString().split('T')[0]))
          ].sort().slice(-3); // Last 3 unique dates

          const datasets = Object.keys(refillData).map((name, index) => {
            const colors = ['#1e40af', '#15803d', '#b91c1c'];
            return {
              label: name,
              data: uniqueDates.map(date => refillData[name].data[date] || 0),
              backgroundColor: colors[index % colors.length],
            };
          });

          chartRefs.current.refillChart = new Chart(refillCtx, {
            type: 'bar',
            data: {
              labels: uniqueDates,
              datasets,
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { 
                  stacked: true, 
                  grid: { display: false },
                  ticks: { maxRotation: 45 }
                },
                y: { 
                  stacked: true, 
                  beginAtZero: true, 
                  title: { display: true, text: 'Quantity (kg)' } 
                },
              },
              plugins: { legend: { position: 'top' } },
            },
          });
        }
      }
    }, 100); // 100ms delay to ensure DOM is ready
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!validateToken()) return;

      setIsLoading(true);
      setError(null);
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      try {
        const user_id = getUserIdFromToken();
        if (!user_id) {
          throw new Error('User ID not found. Please log in again.');
        }

        const res = await api.getStockDashboard({ user_id }, { signal });
        setDashboardData(res.data);
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted due to component unmount');
          return;
        }
        console.error('Error fetching stock dashboard:', error.response?.data || error.message);
        if (error.response?.status === 403) {
          setError('Admin access required. Please log in with an admin account.');
          toast.error('Admin access required. Please log in with an admin account.');
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('sessionId');
          localStorage.removeItem('deviceId');
          window.location.href = '/login';
        } else {
          setError(error.response?.data?.error || 'Failed to fetch stock dashboard');
          toast.error(error.response?.data?.error || 'Failed to fetch stock dashboard');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Create charts after data is loaded and component is mounted
  useEffect(() => {
    if (!isLoading && dashboardData) {
      createCharts();
    }

    return () => {
      // Clean up charts on unmount
      Object.values(chartRefs.current).forEach(chart => {
        if (chart) {
          chart.destroy();
        }
      });
    };
  }, [isLoading, dashboardData]);

  // Handle window resize to redraw charts
  useEffect(() => {
    const handleResize = () => {
      if (!isLoading && dashboardData) {
        // Redraw charts after a small delay
        setTimeout(() => {
          Object.values(chartRefs.current).forEach(chart => {
            if (chart) {
              chart.resize();
            }
          });
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoading, dashboardData]);

  if (error) {
    return (
      <div className="dashboard-container">
        <p className="error-message">{error}</p>
        <button className="action-button" onClick={() => window.location.href = '/login'}>
          Go to Login
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <p className="loading-message">Loading...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Stock Dashboard</h1>
        <button className="action-button" onClick={() => window.location.href = '/admin/stock/add'}>
          Manage Inventory
        </button>
      </div>
      <div className="dashboard-grid">
        {/* Analytics Charts */}
        <div className="dashboard-card chart-card">
          <h2 className="card-title">Ingredient Usage Over Time</h2>
          <div className="chart-container">
            <canvas id="usageChart" width="400" height="300"></canvas>
          </div>
        </div>

        <div className="dashboard-card chart-card">
          <h2 className="card-title">Top Used Ingredients</h2>
          <div className="chart-container">
            <canvas id="topUsedChart" width="400" height="300"></canvas>
          </div>
        </div>

        <div className="dashboard-card chart-card">
          <h2 className="card-title">Stock Refill History</h2>
          <div className="chart-container">
            <canvas id="refillChart" width="400" height="300"></canvas>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="dashboard-card low-stock-card">
          <h2 className="card-title">
            <span className="warning-icon">⚠</span> Low Stock Alerts
          </h2>
          <div className="low-stock-wrapper">
            {dashboardData.lowStock.length === 0 ? (
              <p className="no-data">No low stock items</p>
            ) : (
              <ul className="low-stock-list">
                {dashboardData.lowStock.slice(0, 5).map((item, index) => (
                  <li key={`low-stock-${item.id}-${index}`} className="low-stock-item">
                    <span className="item-name">{item.name}</span>: {item.quantity_in_stock} {item.unit} (Threshold: {item.low_stock_threshold})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* All Ingredients */}
        <div className="dashboard-card ingredients-table-card">
          <h2 className="card-title">All Ingredients</h2>
          <div className="table-wrapper ingredients-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Threshold</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.ingredients.slice(0, 5).map((item, index) => (
                  <tr key={`ingredient-${item.id}-${index}`} className={index % 2 === 0 ? 'even-row' : ''}>
                    <td>{item.name}</td>
                    <td>{item.quantity_in_stock}</td>
                    <td>{item.unit}</td>
                    <td>{item.low_stock_threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="dashboard-card transactions-table-card">
          <h2 className="card-title">Recent Transactions</h2>
          <div className="table-wrapper transactions-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Quantity</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.transactions.slice(0, 5).map((tx, index) => (
                  <tr key={`transaction-${tx.id}-${index}`} className={index % 2 === 0 ? 'even-row' : ''}>
                    <td>{tx.name}</td>
                    <td>{tx.quantity}</td>
                    <td className={tx.transaction_type === 'addition' ? 'add-type' : 'remove-type'}>
                      {tx.transaction_type}
                    </td>
                    <td>{tx.reason || '-'}</td>
                    <td>{new Date(tx.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ingredient Associations */}
        <div className="dashboard-card associations-card">
          <h2 className="card-title">Ingredient Associations</h2>
          <div className="associations-content associations-wrapper">
            <div className="association-section">
              <h3 className="section-title">Menu Items</h3>
              <ul className="association-list">
                {dashboardData.associations.menuItems.slice(0, 5).map((assoc, index) => (
                  <li key={`menu-item-${assoc.id}-${index}`}>
                    {assoc.name}: {assoc.quantity} {assoc.unit} of {assoc.ingredient_name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="association-section">
              <h3 className="section-title">Breakfasts</h3>
              <ul className="association-list">
                {dashboardData.associations.breakfasts.slice(0, 5).map((assoc, index) => (
                  <li key={`breakfast-${assoc.id}-${index}`}>
                    {assoc.name}: {assoc.quantity} {assoc.unit} of {assoc.ingredient_name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="association-section">
              <h3 className="section-title">Supplements</h3>
              <ul className="association-list">
                {dashboardData.associations.supplements.slice(0, 5).map((assoc, index) => (
                  <li key={`supplement-${assoc.id}-${index}`}>
                    {assoc.name}: {assoc.quantity} {assoc.unit} of {assoc.ingredient_name}
                  </li>
                ))}
              </ul>
            </div>
            <div className="association-section">
              <h3 className="section-title">Breakfast Options</h3>
              <ul className="association-list">
                {dashboardData.associations.breakfastOptions.slice(0, 5).map((assoc, index) => (
                  <li key={`breakfast-option-${assoc.id}-${index}`}>
                    {assoc.option_name}: {assoc.quantity} {assoc.unit} of {assoc.ingredient_name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockDashboard;
