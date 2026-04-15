import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { initSocket } from '../services/socket';
import './css/OrderManagement.css';

const FALLBACK_IMAGE = 'https://via.placeholder.com/40?text=Aucune+Image';

function OrderManagement() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [currency, setCurrency] = useState('DT');
  const navigate = useNavigate();

  // Helper function to safely parse integers
  const safeParseInt = (value, defaultValue = 0) => {
    if (value == null || value === '' || value === 'NULL') {
      return defaultValue;
    }
    const parsed = typeof value === 'string' ? parseInt(value, 10) : Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // Helper function to safely parse floats
  const safeParseFloat = (value, defaultValue = 0) => {
    if (value == null || value === '' || value === 'NULL') {
      return defaultValue;
    }
    const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const res = await api.getTheme();
        if (res.data?.currency) setCurrency(res.data.currency);
      } catch (err) {
        console.warn('Could not load currency, using default DT', err.message);
      }
    };
    loadCurrency();
  }, []);

  useEffect(() => {
    let socketCleanup = null;

    async function fetchOrders(role) {
      try {
        const query = dateFilter !== 'all' ? `?time_range=${dateFilter}` : '';
        const res = await api.get(`/orders${query}`);
        const ordersArray = Array.isArray(res.data.data) ? res.data.data : [];
        const filteredOrders = role === 'server'
          ? ordersArray.filter(order => !(order.session_id || '').startsWith('staff-'))
          : ordersArray;
        const processedOrders = filteredOrders.map(order => {
          // Process menu items
          const itemIds = Array.isArray(order.item_ids)
            ? order.item_ids
            : (order.item_ids?.split(',') || []).filter(id => id?.trim() && !isNaN(parseInt(id)));
          const itemNames = Array.isArray(order.item_names)
            ? order.item_names
            : order.item_names?.split(',') || [];
          const unitPrices = Array.isArray(order.unit_prices)
            ? order.unit_prices
            : order.unit_prices?.split(',') || [];
          const menuQuantities = Array.isArray(order.menu_quantities)
            ? order.menu_quantities
            : (order.menu_quantities?.split(',') || []).filter(q => q !== 'NULL' && q?.trim());
          const supplementIds = Array.isArray(order.supplement_ids)
            ? order.supplement_ids
            : order.supplement_ids?.split(',') || [];
          const supplementNames = Array.isArray(order.supplement_names)
            ? order.supplement_names
            : order.supplement_names?.split(',') || [];
          const supplementPrices = Array.isArray(order.supplement_prices)
            ? order.supplement_prices
            : order.supplement_prices?.split(',') || [];
          const imageUrls = Array.isArray(order.image_urls)
            ? order.image_urls
            : order.image_urls?.split(',') || [];

          // Process breakfast items
          const breakfastIds = Array.isArray(order.breakfast_ids)
            ? order.breakfast_ids
            : (order.breakfast_ids?.split(',') || []).filter(id => id?.trim() && !isNaN(parseInt(id)));
          const breakfastNames = Array.isArray(order.breakfast_names)
            ? order.breakfast_names
            : order.breakfast_names?.split(',') || [];
          const breakfastQuantities = Array.isArray(order.breakfast_quantities)
            ? order.breakfast_quantities
            : (order.breakfast_quantities?.split(',') || []).filter(q => q !== 'NULL' && q?.trim());
          const breakfastImages = Array.isArray(order.breakfast_images)
            ? order.breakfast_images
            : order.breakfast_images?.split(',') || [];
          const optionIds = Array.isArray(order.breakfast_option_ids)
            ? order.breakfast_option_ids
            : (order.breakfast_option_ids?.split(',') || []).filter(id => id?.trim() && !isNaN(parseInt(id)));
          const optionNames = Array.isArray(order.breakfast_option_names)
            ? order.breakfast_option_names
            : order.breakfast_option_names?.split(',') || [];
          const optionPrices = Array.isArray(order.breakfast_option_prices)
            ? order.breakfast_option_prices
            : order.breakfast_option_prices?.split(',') || [];

          // Group items similar to OrderCard
          const acc = {};
          itemIds.forEach((id, idx) => {
            if (idx >= menuQuantities.length || idx >= itemNames.length || idx >= unitPrices.length) return;
            const supplementId = supplementIds[idx]?.trim() || null;
            const key = `${id.trim()}_${supplementId || 'none'}`;
            const quantity = safeParseInt(menuQuantities[idx], 1);
            const unitPrice = safeParseFloat(unitPrices[idx], 0);
            const supplementPrice = supplementId ? safeParseFloat(supplementPrices[idx], 0) : 0;

            if (!acc[key]) {
              acc[key] = {
                id: safeParseInt(id, 0),
                type: 'menu',
                name: itemNames[idx]?.trim() || 'Article inconnu',
                quantity: 0,
                unitPrice,
                supplementName: supplementId ? supplementNames[idx]?.trim() || 'Supplément inconnu' : null,
                supplementPrice,
                imageUrl: imageUrls[idx]?.trim() || FALLBACK_IMAGE,
                options: [],
              };
            }
            acc[key].quantity = quantity;
          });

          breakfastIds.forEach((id, index) => {
            if (index >= breakfastQuantities.length || index >= breakfastNames.length) return;
            const key = id.trim();
            const quantity = safeParseInt(breakfastQuantities[index], 1);
            const unitPrice = safeParseFloat(unitPrices[index], 0);

            if (!acc[key]) {
              acc[key] = {
                id: safeParseInt(id, 0),
                type: 'breakfast',
                name: breakfastNames[index]?.trim() || 'Petit-déjeuner inconnu',
                quantity: 0,
                unitPrice,
                imageUrl: breakfastImages[index]?.trim() || FALLBACK_IMAGE,
                options: [],
              };
            }
            acc[key].quantity = quantity;

            const optionsPerItem = breakfastIds.length ? Math.floor(optionIds.length / breakfastIds.length) : 0;
            const startIdx = index * optionsPerItem;
            const endIdx = (index + 1) * optionsPerItem;
            const itemOptionNames = optionNames[index] || [];
            const itemOptionPrices = optionPrices[index] || [];

            const names = Array.isArray(itemOptionNames)
              ? itemOptionNames
              : typeof itemOptionNames === 'string' && itemOptionNames
              ? itemOptionNames.split('|').map(name => name?.trim() || 'Option inconnue')
              : [];
            const prices = Array.isArray(itemOptionPrices)
              ? itemOptionPrices.map(price => safeParseFloat(price, 0))
              : typeof itemOptionPrices === 'string' && itemOptionPrices
              ? itemOptionPrices.split('|').map(price => safeParseFloat(price, 0))
              : [];

            for (let i = 0; i < Math.min(names.length, prices.length); i++) {
              acc[key].options.push({
                name: names[i] || 'Option inconnue',
                price: prices[i] || 0,
              });
            }
            acc[key].options = Array.from(new Set(acc[key].options.map(opt => JSON.stringify(opt))), JSON.parse);
          });

          return {
            ...order,
            groupedItems: Object.values(acc).filter(item => item.quantity > 0),
            status: order.status || (order.approved ? 'preparing' : 'pending'),
            total_price: safeParseFloat(order.total_price, 0),
          };
        });
        setOrders(processedOrders);
      } catch (err) {
        console.error('Failed to load orders:', err.response?.data || err.message);
        toast.error(err.response?.data?.error || 'Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    }

    async function init() {
      try {
        const res = await api.get('/check-auth');
        const role = res.data.role;
        if (!['admin', 'server'].includes(role)) {
          toast.error('Staff or admin access required');
          navigate('/login');
          return;
        }
        setUser(res.data);
        await fetchOrders(role);

        socketCleanup = initSocket(
      (order) => {
        if (role === 'server' && (order.session_id || '').startsWith('staff-')) return;
        const itemIds = Array.isArray(order.item_ids)
          ? order.item_ids
          : (order.item_ids?.split(',') || []).filter(id => id?.trim() && !isNaN(parseInt(id)));
        const itemNames = Array.isArray(order.item_names)
          ? order.item_names
          : order.item_names?.split(',') || [];
        const unitPrices = Array.isArray(order.unit_prices)
          ? order.unit_prices
          : order.unit_prices?.split(',') || [];
        const menuQuantities = Array.isArray(order.menu_quantities)
          ? order.menu_quantities
          : (order.menu_quantities?.split(',') || []).filter(q => q !== 'NULL' && q?.trim());
        const supplementIds = Array.isArray(order.supplement_ids)
          ? order.supplement_ids
          : order.supplement_ids?.split(',') || [];
        const supplementNames = Array.isArray(order.supplement_names)
          ? order.supplement_names
          : order.supplement_names?.split(',') || [];
        const supplementPrices = Array.isArray(order.supplement_prices)
          ? order.supplement_prices
          : order.supplement_prices?.split(',') || [];
        const imageUrls = Array.isArray(order.image_urls)
          ? order.image_urls
          : order.image_urls?.split(',') || [];

        const breakfastIds = Array.isArray(order.breakfast_ids)
          ? order.breakfast_ids
          : (order.breakfast_ids?.split(',') || []).filter(id => id?.trim() && !isNaN(parseInt(id)));
        const breakfastNames = Array.isArray(order.breakfast_names)
          ? order.breakfast_names
          : order.breakfast_names?.split(',') || [];
        const breakfastQuantities = Array.isArray(order.breakfast_quantities)
          ? order.breakfast_quantities
          : (order.breakfast_quantities?.split(',') || []).filter(q => q !== 'NULL' && q?.trim());
        const breakfastImages = Array.isArray(order.breakfast_images)
          ? order.breakfast_images
          : order.breakfast_images?.split(',') || [];
        const optionIds = Array.isArray(order.breakfast_option_ids)
          ? order.breakfast_option_ids
          : (order.breakfast_option_ids?.split(',') || []).filter(id => id?.trim() && !isNaN(parseInt(id)));
        const optionNames = Array.isArray(order.breakfast_option_names)
          ? order.breakfast_option_names
          : order.breakfast_option_names?.split(',') || [];
        const optionPrices = Array.isArray(order.breakfast_option_prices)
          ? order.breakfast_option_prices
          : order.breakfast_option_prices?.split(',') || [];

        const acc = {};
        itemIds.forEach((id, idx) => {
          if (idx >= menuQuantities.length || idx >= itemNames.length || idx >= unitPrices.length) return;
          const supplementId = supplementIds[idx]?.trim() || null;
          const key = `${id.trim()}_${supplementId || 'none'}`;
          const quantity = safeParseInt(menuQuantities[idx], 1);
          const unitPrice = safeParseFloat(unitPrices[idx], 0);
          const supplementPrice = supplementId ? safeParseFloat(supplementPrices[idx], 0) : 0;

          if (!acc[key]) {
            acc[key] = {
              id: safeParseInt(id, 0),
              type: 'menu',
              name: itemNames[idx]?.trim() || 'Article inconnu',
              quantity: 0,
              unitPrice,
              supplementName: supplementId ? supplementNames[idx]?.trim() || 'Supplément inconnu' : null,
              supplementPrice,
              imageUrl: imageUrls[idx]?.trim() || FALLBACK_IMAGE,
              options: [],
            };
          }
          acc[key].quantity = quantity;
        });

        breakfastIds.forEach((id, index) => {
          if (index >= breakfastQuantities.length || index >= breakfastNames.length) return;
          const key = id.trim();
          const quantity = safeParseInt(breakfastQuantities[index], 1);
          const unitPrice = safeParseFloat(unitPrices[index], 0);

          if (!acc[key]) {
            acc[key] = {
              id: safeParseInt(id, 0),
              type: 'breakfast',
              name: breakfastNames[index]?.trim() || 'Petit-déjeuner inconnu',
              quantity: 0,
              unitPrice,
              imageUrl: breakfastImages[index]?.trim() || FALLBACK_IMAGE,
              options: [],
            };
          }
          acc[key].quantity = quantity;

          const optionsPerItem = breakfastIds.length ? Math.floor(optionIds.length / breakfastIds.length) : 0;
          const startIdx = index * optionsPerItem;
          const endIdx = (index + 1) * optionsPerItem;
          const itemOptionNames = optionNames[index] || [];
          const itemOptionPrices = optionPrices[index] || [];

          const names = Array.isArray(itemOptionNames)
            ? itemOptionNames
            : typeof itemOptionNames === 'string' && itemOptionNames
            ? itemOptionNames.split('|').map(name => name?.trim() || 'Option inconnue')
            : [];
          const prices = Array.isArray(itemOptionPrices)
            ? itemOptionPrices.map(price => safeParseFloat(price, 0))
            : typeof itemOptionPrices === 'string' && itemOptionPrices
            ? itemOptionPrices.split('|').map(price => safeParseFloat(price, 0))
            : [];

          for (let i = 0; i < Math.min(names.length, prices.length); i++) {
            acc[key].options.push({
              name: names[i] || 'Option inconnue',
              price: prices[i] || 0,
            });
          }
          acc[key].options = Array.from(new Set(acc[key].options.map(opt => JSON.stringify(opt))), JSON.parse);
        });

        const processedOrder = {
          ...order,
          groupedItems: Object.values(acc).filter(item => item.quantity > 0),
          status: order.status || (order.approved ? 'preparing' : 'pending'),
          total_price: safeParseFloat(order.total_price, 0),
        };
        setOrders(prev => [processedOrder, ...prev]);
        toast.success(`New order #${order.id} received`);
      },
      (updatedOrder) => {
        if (role === 'server' && (updatedOrder.orderDetails?.session_id || '').startsWith('staff-')) return;
        setOrders(prev =>
          prev.map(order =>
            order.id === parseInt(updatedOrder.orderId)
              ? {
                  ...order,
                  status: updatedOrder.status || (updatedOrder.approved ? 'preparing' : 'pending'),
                  approved: Number(updatedOrder.orderDetails.approved),
                }
              : order
          )
        );
        toast.info(`Order #${updatedOrder.orderId} updated to ${updatedOrder.status || (updatedOrder.approved ? 'preparing' : 'pending')}`);
      },
      () => {},
      () => {},
      () => {}
    );
      } catch (err) {
        console.error('Auth/init failed:', err.response?.data || err.message);
        toast.error(err.response?.data?.error || 'Please log in');
        navigate('/login');
      }
    }

    init();

    return () => {
      if (typeof socketCleanup === 'function') socketCleanup();
    };
  }, [navigate, dateFilter]);

  const handleStatusUpdate = async (orderId, status) => {
    try {
      const approved = status === 'preparing' || status === 'Approved' ? 1 : 0;
      await api.post(`/orders/${orderId}/approve`, { user_id: user.id, approved });
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status, approved } : order
        )
      );
      toast.success('Order status updated successfully');
    } catch (err) {
      console.error('Failed to update order:', err.response?.data || err.message);
      toast.error(err.response?.data?.error || 'Failed to update order status');
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await api.post(`/orders/${orderId}/cancel`, { restoreStock: true });
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: 'cancelled', approved: 0 } : order
        )
      );
      toast.success('Order cancelled successfully');
      closeOrderDetail();
    } catch (err) {
      console.error('Failed to cancel order:', err.response?.data || err.message);
      toast.error(err.response?.data?.error || 'Failed to cancel order');
    }
  };

  const openOrderDetail = (order) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  const closeOrderDetail = () => {
    setShowOrderDetail(false);
    setTimeout(() => setSelectedOrder(null), 300);
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'preparing':
      case 'Approved':
        return { backgroundColor: '#ecfdf5', color: '#10b981' };
      case 'cancelled':
        return { backgroundColor: '#fef2f2', color: '#ef4444' };
      default:
        return { backgroundColor: '#fffbeb', color: '#f59e0b' };
    }
  };

  return (
    <div className="order-management-container">
      {isLoading ? (
        <div className="order-management-loading">
          <div className="order-management-spinner"></div>
          <h2 className="order-management-loading-title">Loading Orders...</h2>
          <p className="order-management-loading-text">Please wait...</p>
        </div>
      ) : (
        <>
          <div className="order-management-header">
            <h1 className="order-management-title">Order Management</h1>
            <div className="order-management-filter-buttons">
              {['all', 'hour', 'day', 'yesterday', 'week', 'month'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setDateFilter(filter)}
                  className={`order-management-filter-button ${dateFilter === filter ? 'active' : ''}`}
                >
                  {filter === 'all' ? 'All' :
                   filter === 'hour' ? 'Last Hour' :
                   filter === 'day' ? 'Today' :
                   filter === 'yesterday' ? 'Yesterday' :
                   filter === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              ))}
            </div>
            <p className="order-management-stats">
              {orders.length} orders • {orders.filter(o => o.status === 'pending').length} pending
            </p>
          </div>

          {orders.length === 0 ? (
            <div className="order-management-empty-state">
              <p className="order-management-empty-text">No orders available.</p>
            </div>
          ) : (
            <div className="order-management-grid">
              {orders.map((order, index) => {
                const formattedPrice = safeParseFloat(order.total_price, 0).toFixed(2);
                const combinedItems = order.groupedItems.slice(0, 3);
                return (
                  <div
                    key={order.id}
                    onClick={() => openOrderDetail(order)}
                    className="order-management-card"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="order-management-card-header">
                      <div>
                        <h3 className="order-management-order-title">Order #{order.id}</h3>
                        <p className="order-management-order-info">
                          {order.table_number ? `Table ${order.table_number}` : order.order_type} • {order.created_at ? formatTime(order.created_at) : 'N/A'}
                        </p>
                        {order.notes && (
                          <p className="order-management-order-notes">Notes: {order.notes}</p>
                        )}
                      </div>
                      <span className="order-management-status" style={getStatusColor(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>

                    <div className="order-management-items">
                      {combinedItems.map((item, idx) => (
                        <div key={`${item.type}-${item.id}-${idx}`} className="order-management-item">
                          <img
                            src={item.imageUrl || FALLBACK_IMAGE}
                            alt={item.name}
                            className="order-management-item-image"
                            onError={(e) => {
                              console.error(`Failed to load image for ${item.type} item "${item.name}": ${e.target.src}`);
                              e.target.src = FALLBACK_IMAGE;
                            }}
                            loading="lazy"
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              flexShrink: 0,
                              backgroundColor: '#f3f4f6',
                            }}
                          />
                          <div className="order-management-item-details">
                            <span className="order-management-item-name">{item.name}</span>
                            {item.supplementName && (
                              <span className="order-management-item-supplement">+ {item.supplementName}</span>
                            )}
                            {(item.options || []).map((opt, optIdx) => (
                              <span key={optIdx} className="order-management-item-option">+ {opt.name}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                      {combinedItems.length < order.groupedItems.length && (
                        <div className="order-management-more-items">
                          +{order.groupedItems.length - 3} more
                        </div>
                      )}
                    </div>

                    <div className="order-management-footer">
                      <span className="order-management-price">{formattedPrice} {currency}</span>
                      <div className="order-management-arrow">→</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {showOrderDetail && selectedOrder && (
        <div className="order-management-modal">
          <div className="order-management-modal-content">
            <div className="order-management-modal-header">
              <div>
                <h2 className="order-management-modal-title">Order #{selectedOrder?.id}</h2>
                <p className="order-management-modal-info">
                  {selectedOrder?.table_number ? `Table ${selectedOrder.table_number}` : selectedOrder?.order_type}
                  {selectedOrder?.delivery_address && ` • ${selectedOrder.delivery_address}`}
                </p>
                {selectedOrder?.notes && (
                  <p className="order-management-modal-notes">Notes: {selectedOrder.notes}</p>
                )}
                {selectedOrder?.promotion_id && (
                  <p className="order-management-modal-promotion">Promotion ID: {selectedOrder.promotion_id}</p>
                )}
              </div>
              <button className="order-management-close-button" onClick={closeOrderDetail}>
                ×
              </button>
            </div>

            <div className="order-management-modal-body">
              <div className="order-management-items-section">
                <h3 className="order-management-section-title">Items Ordered</h3>
                <div className="order-management-items-list">
                  {(selectedOrder?.groupedItems || []).map((item, index) => (
                    <div key={`${item.type}-${item.id}-${index}`} className="order-management-item-detail">
                      <img
                        src={item.imageUrl || FALLBACK_IMAGE}
                        alt={item.name}
                        className="order-management-item-detail-image"
                        onError={(e) => {
                          console.error(`Failed to load image for ${item.type} item "${item.name}": ${e.target.src}`);
                          e.target.src = FALLBACK_IMAGE;
                        }}
                        loading="lazy"
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '6px',
                          objectFit: 'cover',
                          flexShrink: 0,
                          backgroundColor: '#f3f4f6',
                        }}
                      />
                      <div className="order-management-item-detail-info">
                        <p className="order-management-item-detail-name">{item.name} ({item.type === 'menu' ? 'Menu Item' : 'Breakfast'})</p>
                        <p className="order-management-item-detail-quantity">
                          Quantity: {item.quantity || 0}
                        </p>
                        {item.supplementName && (
                          <p className="order-management-item-detail-supplement">
                            Supplement: {item.supplementName} (+{item.supplementPrice?.toFixed(2) || '0.00'} {currency})
                          </p>
                        )}
                        {(item.options || []).map((opt, optIdx) => (
                          <p key={optIdx} className="order-management-item-detail-options">
                            Option: {opt.name} (+{opt.price?.toFixed(2) || '0.00'} {currency})
                          </p>
                        ))}
                        <p className="order-management-item-detail-price">
                          Unit Price: {item.unitPrice?.toFixed(2) || '0.00'} {currency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-management-status-section">
                <h3 className="order-management-section-title">Update Status</h3>
                <select
                  value={selectedOrder?.status}
                  onChange={(e) => {
                    handleStatusUpdate(selectedOrder.id, e.target.value);
                    setSelectedOrder(prev => ({ ...prev, status: e.target.value }));
                  }}
                  className="order-management-status-select"
                  disabled={selectedOrder?.status === 'cancelled'}
                >
                  <option value="pending">Pending</option>
                  <option value="preparing">Preparing</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {selectedOrder?.status !== 'cancelled' && (
                  <button
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    className="order-management-cancel-button"
                  >
                    Cancel Order
                  </button>
                )}
              </div>

              <div className="order-management-total-section">
                <span className="order-management-total-label">Total Amount</span>
                <span className="order-management-total-amount">
                  {safeParseFloat(selectedOrder?.total_price, 0).toFixed(2)} {currency}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderManagement;

