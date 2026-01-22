import { useState, useEffect, useRef, useMemo } from 'react';
import {
  AccessTime,
  TableRestaurant,
  LocationOn,
  Receipt,
  Check,
  ExpandMore,
  Restaurant,
  LocalShipping,
  Note,
  Cancel,
} from '@mui/icons-material';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';

const FALLBACK_IMAGE = 'https://via.placeholder.com/40?text=No+Image';

const safeParseFloat = (value, defaultValue = 0) => {
  if (value == null || value === '' || value === 'NULL') {
    return defaultValue;
  }
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeParseInt = (value, defaultValue = 0) => {
  if (value == null || value === '' || value === 'NULL') {
    return defaultValue;
  }
  const parsed = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

const getOrderStatus = (approved, status) => {
  if (status === 'cancelled') {
    return {
      color: '#ef4444',
      bgColor: '#fef2f2',
      icon: Cancel,
      label: 'Annulée',
      urgency: 'high',
    };
  }
  if (approved) {
    return {
      color: '#10b981',
      bgColor: '#ecfdf5',
      icon: Check,
      label: 'Approuvée',
      urgency: 'none',
    };
  }
  return {
    color: '#f59e0b',
    bgColor: '#fffbeb',
    icon: AccessTime,
    label: 'En attente',
    urgency: 'high',
  };
};

const getOrderTypeDisplay = (orderType, tableNumber) => {
  switch (orderType) {
    case 'local':
      return {
        text: `Table ${tableNumber || 'N/A'}`,
        icon: TableRestaurant,
        color: 'var(--primary-color)',
      };
    case 'delivery':
      return {
        text: 'Livraison',
        icon: LocalShipping,
        color: '#f59e0b',
      };
    case 'imported':
      return {
        text: 'À emporter',
        icon: Restaurant,
        color: '#10b981',
      };
    default:
      return {
        text: 'Inconnu',
        icon: Restaurant,
        color: '#6b7280',
      };
  }
};

function OrderCard({
  order,
  onApproveOrder,
  onCancelOrder,
  timeAgo,
  isExpanded: initialExpanded = false,
}) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isApproving, setIsApproving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [isOrderApproved, setIsOrderApproved] = useState(false);
  const [currency, setCurrency] = useState('$');
  const cardRef = useRef(null);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const themeResponse = await api.getTheme();
        if (themeResponse.data && themeResponse.data.currency) {
          setCurrency(themeResponse.data.currency);
        }
      } catch (error) {
        console.error('Error fetching theme for currency:', error);
      }
    };
    fetchTheme();
  }, []);

  const groupedItems = useMemo(() => {
    const acc = {};

    const itemIds = Array.isArray(order.item_ids) ? order.item_ids : (order.item_ids?.split(',') || []).filter(id => id?.trim() && !isNaN(parseInt(id)));
    const itemNames = Array.isArray(order.item_names) ? order.item_names : order.item_names?.split(',') || [];
    const unitPrices = Array.isArray(order.unit_prices) ? order.unit_prices : order.unit_prices?.split(',') || [];
    const menuQuantities = Array.isArray(order.menu_quantities) ? order.menu_quantities : (order.menu_quantities?.split(',') || []).filter(q => q !== 'NULL' && q?.trim());
    const supplementIds = Array.isArray(order.supplement_ids) ? order.supplement_ids : order.supplement_ids?.split(',') || [];
    const supplementNames = Array.isArray(order.supplement_names) ? order.supplement_names : order.supplement_names?.split(',') || [];
    const supplementPrices = Array.isArray(order.supplement_prices) ? order.supplement_prices : order.supplement_prices?.split(',') || [];
    const imageUrls = Array.isArray(order.image_urls) ? order.image_urls : order.image_urls?.split(',') || [];

    itemIds.forEach((id, idx) => {
      if (idx >= menuQuantities.length || idx >= itemNames.length || idx >= unitPrices.length) return;

      const supplementId = supplementIds[idx]?.trim() || null;
      const key = `${id.trim()}_${supplementId || 'none'}`;
      const quantity = safeParseInt(menuQuantities[idx], 1);
      const unitPrice = safeParseFloat(unitPrices[idx], 0);
      const supplementPrice = supplementId ? safeParseFloat(supplementPrices[idx], 0) : 0;
      const basePrice = unitPrice - supplementPrice;

      if (!acc[key]) {
        acc[key] = {
          id: safeParseInt(id, 0),
          type: 'menu',
          name: itemNames[idx]?.trim() || 'Article inconnu',
          quantity: 0,
          basePrice,
          unitPrice,
          supplementName: supplementId ? supplementNames[idx]?.trim() || 'Supplément inconnu' : null,
          supplementPrice,
          imageUrl: idx < imageUrls.length ? imageUrls[idx]?.trim() || null : null,
          options: [],
        };
      }
      acc[key].quantity = quantity;
    });

    const breakfastIds = Array.isArray(order.breakfast_ids) ? order.breakfast_ids : (order.breakfast_ids?.split(',') || []).filter(id => id?.trim() && !isNaN(parseInt(id)));
    const breakfastNames = Array.isArray(order.breakfast_names) ? order.breakfast_names : order.breakfast_names?.split(',') || [];
    const breakfastQuantities = Array.isArray(order.breakfast_quantities) ? order.breakfast_quantities : (order.breakfast_quantities?.split(',') || []).filter(q => q !== 'NULL' && q?.trim());
    const breakfastImages = Array.isArray(order.breakfast_images) ? order.breakfast_images : order.breakfast_images?.split(',') || [];
    const optionIds = Array.isArray(order.breakfast_option_ids) ? order.breakfast_option_ids : (order.breakfast_option_ids?.split(',') || []).filter(id => id?.trim() && !isNaN(parseInt(id)));
    const optionNames = Array.isArray(order.breakfast_option_names) ? order.breakfast_option_names : order.breakfast_option_names?.split(',') || [];
    const optionPrices = Array.isArray(order.breakfast_option_prices) ? order.breakfast_option_prices : order.breakfast_option_prices?.split(',') || [];

    breakfastIds.forEach((id, index) => {
      if (index >= breakfastQuantities.length || index >= breakfastNames.length) return;

      const key = `breakfast_${id.trim()}`;
      const quantity = safeParseInt(breakfastQuantities[index], 1);
      const imageUrl = index < breakfastImages.length ? breakfastImages[index]?.trim() || null : null;

      const options = [];
      const optionsPerItem = breakfastIds.length ? Math.floor(optionIds.length / breakfastIds.length) : 0;
      const startIdx = index * optionsPerItem;
      const endIdx = (index + 1) * optionsPerItem;

      let totalOptionPrice = 0;
      for (let i = startIdx; i < endIdx && i < optionIds.length; i++) {
        if (optionIds[i]) {
          const optionPrice = safeParseFloat(optionPrices[i], 0);
          totalOptionPrice += optionPrice;
          let optionName = 'Option inconnue';
          if (i < optionNames.length) {
            const name = optionNames[i];
            if (typeof name === 'string') {
              optionName = name.trim() || 'Option inconnue';
            } else if (Array.isArray(name)) {
              optionName = name.join(', ').trim() || 'Option inconnue';
            }
          }
          options.push({
            name: optionName,
            price: optionPrice,
          });
        }
      }

      const breakfastUnitPrice = unitPrices.length > itemIds.length ? safeParseFloat(unitPrices[itemIds.length + index], 0) : 0;
      const basePrice = breakfastUnitPrice - totalOptionPrice;

      if (!acc[key]) {
        acc[key] = {
          id: safeParseInt(id, 0),
          type: 'breakfast',
          name: breakfastNames[index]?.trim() || 'Petit-déjeuner inconnu',
          quantity: 0,
          basePrice,
          unitPrice: breakfastUnitPrice,
          imageUrl,
          options,
          supplementName: null,
          supplementPrice: 0,
        };
      }
      acc[key].quantity = quantity;
    });

    return Object.values(acc).filter(item => item.quantity > 0);
  }, [order]);

  const statusConfig = getOrderStatus(order.approved, order.status);
  const orderTypeConfig = getOrderTypeDisplay(order.order_type, order.table_number);
  const IconComponent = statusConfig.icon;
  const OrderTypeIcon = orderTypeConfig.icon;

  const handleApproveOrder = async () => {
    setIsApproving(true);
    try {
      await onApproveOrder?.(order.id);
      toast.success('Commande approuvée avec succès');
    } catch (error) {
      console.error('Error approving order:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Échec de l\'approbation de la commande');
    } finally {
      setIsApproving(false);
    }
  };

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    try {
      const response = await api.getOrder(order.id);
      const orderData = response.data;
      if (orderData.approved) {
        setCancelOrderId(order.id);
        setIsOrderApproved(true);
        setShowCancelPopup(true);
      } else {
        await onCancelOrder?.(order.id, { restoreStock: false });
        toast.success('Commande annulée avec succès');
      }
    } catch (error) {
      console.error('Error checking order status:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Échec de la vérification du statut de la commande');
    } finally {
      setIsCancelling(false);
    }
  };

  const confirmCancelOrder = async (restoreStock) => {
    setIsCancelling(true);
    try {
      await onCancelOrder?.(cancelOrderId, { restoreStock });
      toast.success(`Commande ${restoreStock ? 'annulée avec restauration du stock' : 'annulée sans restauration du stock'}`);
      setShowCancelPopup(false);
      setCancelOrderId(null);
      setIsOrderApproved(false);
    } catch (error) {
      console.error('Error cancelling order:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Échec de l\'annulation de la commande');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleExpandToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const orderTotal = safeParseFloat(order.total_price, 0);

  return (
    <div 
      ref={cardRef} 
      style={{
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: `1px solid ${statusConfig.color}40`,
        boxShadow: statusConfig.urgency === 'high' 
          ? `0 2px 8px ${statusConfig.color}25` 
          : '0 2px 8px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
      }}
      role="region" 
      aria-label={`Commande ${order.id}`}
    >
      {/* Status Bar */}
      <div 
        style={{
          height: '4px',
          background: `linear-gradient(90deg, ${statusConfig.color} 0%, ${statusConfig.color}80 100%)`,
          width: '100%',
        }}
      />

      {/* Header */}
      <div 
        style={{
          padding: '20px',
          backgroundColor: statusConfig.bgColor,
          borderBottom: `1px solid ${statusConfig.color}20`,
        }}
      >
        <div 
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <h3 
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0,
              lineHeight: '1.2',
              letterSpacing: '-0.3px',
            }}
          >
            Commande #{order.id}
          </h3>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: `linear-gradient(135deg, ${statusConfig.color} 0%, ${statusConfig.color}dd 100%)`,
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: `0 2px 6px ${statusConfig.color}40`,
            }}
            role="status"
          >
            <IconComponent sx={{ fontSize: 14 }} />
            {statusConfig.label}
          </div>
        </div>

        <div 
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '6px 10px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: '500',
              color: orderTypeConfig.color,
              border: `1px solid ${orderTypeConfig.color}30`,
              letterSpacing: '-0.05px',
            }}
          >
            <OrderTypeIcon sx={{ fontSize: 14 }} />
            <span>{orderTypeConfig.text}</span>
          </div>

          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '6px 10px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: '500',
              color: '#6b7280',
              border: '1px solid #e5e7eb',
              letterSpacing: '-0.05px',
            }}
          >
            <AccessTime sx={{ fontSize: 14 }} />
            <span>{timeAgo}</span>
          </div>

          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: '6px 10px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: '600',
              marginLeft: 'auto',
              letterSpacing: '-0.05px',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
            }}
          >
            <span>{orderTotal.toFixed(2)} {currency}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '20px' }}>
        {order.delivery_address && (
          <div 
            style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
            role="alert"
          >
            <LocationOn sx={{ fontSize: 16, color: '#f59e0b', flexShrink: 0, marginTop: '1px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div 
                style={{
                  fontWeight: '600',
                  color: '#92400e',
                  fontSize: '13px',
                  marginBottom: '4px',
                  letterSpacing: '-0.08px',
                }}
              >
                Adresse de livraison
              </div>
              <div 
                style={{
                  fontSize: '12px',
                  color: '#92400e',
                  lineHeight: '1.4',
                  wordBreak: 'break-word',
                }}
              >
                {order.delivery_address}
              </div>
            </div>
          </div>
        )}

        {order.notes && (
          <div 
            style={{
              backgroundColor: '#e6f3ff',
              border: '1px solid #3b82f6',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
            role="alert"
          >
            <Note sx={{ fontSize: 16, color: '#3b82f6', flexShrink: 0, marginTop: '1px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div 
                style={{
                  fontWeight: '600',
                  color: '#1e40af',
                  fontSize: '13px',
                  marginBottom: '4px',
                  letterSpacing: '-0.08px',
                }}
              >
                Instructions spéciales
              </div>
              <div 
                style={{
                  fontSize: '12px',
                  color: '#1e40af',
                  lineHeight: '1.4',
                  wordBreak: 'break-word',
                }}
              >
                {order.notes}
              </div>
            </div>
          </div>
        )}

        <button
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: 'transparent',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: isExpanded ? '16px' : '0',
            transition: 'all 0.2s ease',
            WebkitTapHighlightColor: 'transparent',
            letterSpacing: '-0.1px',
          }}
          onClick={handleExpandToggle}
          aria-expanded={isExpanded}
          aria-controls={`order-details-${order.id}`}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Receipt sx={{ fontSize: 16 }} />
          <span>{isExpanded ? 'Masquer les détails' : `Articles (${groupedItems.length})`}</span>
          <ExpandMore
            sx={{
              fontSize: 16,
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </button>

        {isExpanded && (
          <div id={`order-details-${order.id}`}>
            <div style={{ marginBottom: '16px' }}>
              {groupedItems.length > 0 ? (
                groupedItems.map((item, index) => {
                  const imageUrl = item.imageUrl || FALLBACK_IMAGE;
                  const totalItemPrice = item.unitPrice * item.quantity;

                  return (
                    <div
                      key={`${item.type}-${item.id}-${index}`}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        padding: '12px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '10px',
                        marginBottom: '8px',
                        gap: '12px',
                        border: '0.5px solid rgba(0, 0, 0, 0.06)',
                      }}
                      role="listitem"
                    >
                      <img
                        src={imageUrl}
                        alt={item.name}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          flexShrink: 0,
                          backgroundColor: '#f3f4f6',
                          border: '0.5px solid rgba(0, 0, 0, 0.04)',
                        }}
                        onError={(e) => {
                          console.error('Error loading order item image:', imageUrl);
                          e.target.src = FALLBACK_IMAGE;
                        }}
                        loading="lazy"
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div 
                          style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#1f2937',
                            marginBottom: '4px',
                            lineHeight: '1.3',
                            wordBreak: 'break-word',
                            letterSpacing: '-0.1px',
                          }}
                        >
                          {item.name}
                        </div>
                        <div style={{ marginBottom: '4px' }}>
                          <div 
                            style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              lineHeight: '1.3',
                            }}
                          >
                            {item.basePrice.toFixed(2)} {currency}
                          </div>
                          {item.type === 'menu' && item.supplementName && item.supplementPrice > 0 && (
                            <div 
                              style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                lineHeight: '1.3',
                              }}
                            >
                              + {item.supplementName}: {item.supplementPrice.toFixed(2)} {currency}
                            </div>
                          )}
                          {item.type === 'breakfast' && item.options && item.options.length > 0 && (
                            <div>
                              {item.options.map((opt, optIdx) => (
                                <div 
                                  key={optIdx}
                                  style={{
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    lineHeight: '1.3',
                                  }}
                                >
                                  + {opt.name}: {opt.price.toFixed(2)} {currency}
                                </div>
                              ))}
                            </div>
                          )}
                          <div 
                            style={{
                              fontSize: '13px',
                              color: '#1f2937',
                              fontWeight: '600',
                              marginTop: '2px',
                              letterSpacing: '-0.1px',
                            }}
                          >
                            {item.unitPrice.toFixed(2)} {currency} × {item.quantity} = {totalItemPrice.toFixed(2)} {currency}
                          </div>
                        </div>
                      </div>
                      <div 
                        style={{
                          background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
                          color: '#ffffff',
                          padding: '6px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          minWidth: '32px',
                          textAlign: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
                        }}
                      >
                        {item.quantity}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div 
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '14px',
                  }}
                >
                  Aucun article à afficher
                </div>
              )}
            </div>

            <div 
              style={{
                borderTop: '1px solid #e5e7eb',
                paddingTop: '16px',
                marginBottom: '16px',
              }}
            >
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#1f2937',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '10px',
                  letterSpacing: '-0.2px',
                }}
              >
                <span>Total</span>
                <span 
                  style={{ 
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontSize: '18px',
                  }}
                >
                  {orderTotal.toFixed(2)} {currency}
                </span>
              </div>
            </div>

            <div 
              style={{
                display: 'flex',
                gap: '12px',
                flexDirection: window.innerWidth < 400 ? 'column' : 'row',
              }}
            >
              <button
                style={{
                  flex: 1,
                  padding: '16px 20px',
                  background: order.approved && order.status !== 'cancelled' 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (order.approved && order.status !== 'cancelled') || isApproving ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: (order.approved && order.status !== 'cancelled') || isApproving ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                  minHeight: '52px',
                  letterSpacing: '-0.2px',
                  boxShadow: (order.approved && order.status !== 'cancelled') || isApproving 
                    ? 'none' 
                    : '0 2px 8px rgba(16, 185, 129, 0.3)',
                }}
                onClick={handleApproveOrder}
                disabled={isApproving || (order.approved && order.status !== 'cancelled')}
                aria-label="Approuver la commande"
                onMouseOver={(e) => {
                  if (!isApproving && (!order.approved || order.status === 'cancelled')) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = (order.approved && order.status !== 'cancelled') || isApproving 
                    ? 'none' 
                    : '0 2px 8px rgba(16, 185, 129, 0.3)';
                }}
              >
                <Check sx={{ fontSize: 16 }} />
                {isApproving ? 'Approbation...' : order.approved && order.status !== 'cancelled' ? 'Approuvée' : 'Approuver'}
              </button>
              
              <button
                style={{
                  flex: 1,
                  padding: '16px 20px',
                  background: order.status === 'cancelled' 
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: order.status === 'cancelled' || isCancelling ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: order.status === 'cancelled' || isCancelling ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                  minHeight: '52px',
                  letterSpacing: '-0.2px',
                  boxShadow: order.status === 'cancelled' || isCancelling 
                    ? 'none' 
                    : '0 2px 8px rgba(239, 68, 68, 0.3)',
                }}
                onClick={handleCancelOrder}
                disabled={isCancelling || order.status === 'cancelled'}
                aria-label="Annuler la commande"
                onMouseOver={(e) => {
                  if (!isCancelling && order.status !== 'cancelled') {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = order.status === 'cancelled' || isCancelling 
                    ? 'none' 
                    : '0 2px 8px rgba(239, 68, 68, 0.3)';
                }}
              >
                <Cancel sx={{ fontSize: 16 }} />
                {isCancelling ? 'Annulation...' : order.status === 'cancelled' ? 'Annulée' : 'Annuler'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showCancelPopup && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          role="dialog" 
          aria-labelledby="cancel-popup-title"
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
              maxWidth: '400px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <h2 
              id="cancel-popup-title"
              style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '16px',
                color: '#1f2937',
                textAlign: 'center',
                letterSpacing: '-0.3px',
              }}
            >
              Annuler la commande
            </h2>
            <p 
              style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '24px',
                lineHeight: '1.5',
                textAlign: 'center',
                letterSpacing: '-0.1px',
              }}
            >
              Cette commande a été approuvée. Voulez-vous restaurer le stock pour la commande annulée ?
            </p>
            <div 
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <button
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
                  color: 'white',
                  transition: 'all 0.2s ease',
                  minHeight: '44px',
                  letterSpacing: '-0.1px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
                onClick={() => confirmCancelOrder(true)}
                disabled={isCancelling}
                aria-label="Annuler et restaurer le stock"
                onMouseOver={(e) => {
                  if (!isCancelling) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                }}
              >
                Annuler et restaurer le stock
              </button>
              
              <button
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  transition: 'all 0.2s ease',
                  minHeight: '44px',
                  letterSpacing: '-0.1px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
                onClick={() => confirmCancelOrder(false)}
                disabled={isCancelling}
                aria-label="Annuler sans restaurer le stock"
                onMouseOver={(e) => {
                  if (!isCancelling) {
                    e.currentTarget.style.backgroundColor = '#4b5563';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#6b7280';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                }}
              >
                Annuler sans restaurer le stock
              </button>
              
              <button
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#374151',
                  transition: 'all 0.2s ease',
                  minHeight: '44px',
                  letterSpacing: '-0.1px',
                }}
                onClick={() => {
                  setShowCancelPopup(false);
                  setCancelOrderId(null);
                  setIsOrderApproved(false);
                }}
                disabled={isCancelling}
                aria-label="Fermer"
                onMouseOver={(e) => {
                  if (!isCancelling) {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

OrderCard.propTypes = {
  order: PropTypes.shape({
    id: PropTypes.number.isRequired,
    total_price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    order_type: PropTypes.string,
    table_number: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    delivery_address: PropTypes.string,
    notes: PropTypes.string,
    status: PropTypes.string,
    approved: PropTypes.oneOfType([PropTypes.number, PropTypes.bool]),
    item_ids: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string]))]),
    item_names: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    unit_prices: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string]))]),
    menu_quantities: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string]))]),
    supplement_ids: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string]))]),
    supplement_names: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    supplement_prices: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string]))]),
    image_urls: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    breakfast_ids: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string]))]),
    breakfast_names: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    breakfast_quantities: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string]))]),
    breakfast_images: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    breakfast_option_ids: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string]))]),
    breakfast_option_names: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string),
      ])),
    ]),
    breakfast_option_prices: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string])),
      ])),
    ]),
  }).isRequired,
  onApproveOrder: PropTypes.func,
  onCancelOrder: PropTypes.func,
  timeAgo: PropTypes.string.isRequired,
  isExpanded: PropTypes.bool,
};

export default OrderCard;
