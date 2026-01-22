import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CoffeeIcon from '@mui/icons-material/Coffee';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import NotesIcon from '@mui/icons-material/Notes';
import { v4 as uuidv4 } from 'uuid';
import React from 'react';
import './css/CartModal.css';

const CartItem = React.memo(({ item, itemSupplements, breakfastOptions, supplementSelections, handleQuantityChange, handleSupplementChange, currency }) => {
  const imageSrc = useMemo(() => {
    let src = '/placeholder.jpg';
    if (item.image_url && item.image_url !== '/Uploads/undefined' && item.image_url !== 'null') {
      src = item.image_url;
    }
    return src;
  }, [item.image_url]);

  const displayPrice = parseFloat(item.sale_price || item.unit_price || item.regular_price) || 0;
  const supplementPrice = parseFloat(supplementSelections[item.cartItemId]?.additional_price || item.supplement_price || 0) || 0;
  const breakfastOptionPrices = item.option_ids?.reduce((sum, optionId) => {
    const option = breakfastOptions.find(o => o.id === optionId);
    return sum + (parseFloat(option?.additional_price) || 0);
  }, 0) || 0;

  const totalItemPrice = (displayPrice + supplementPrice + breakfastOptionPrices) * (item.quantity || 1);

  return (
    <li className="cart-modal-item">
      <div className="cart-modal-item-header">
        <div className="cart-modal-item-image">
          <img
            src={imageSrc}
            srcSet={`${imageSrc}?w=56 1x, ${imageSrc}?w=112 2x`}
            alt={item.name || 'Article'}
            className="cart-modal-item-img"
            loading="lazy"
            decoding="async"
            onError={(e) => { e.target.src = '/placeholder.jpg'; }}
          />
        </div>
        <div className="cart-modal-item-details">
          <h4 className="cart-modal-item-name">{item.name || 'Article sans nom'}</h4>
          <div className="cart-modal-item-price">
            {(displayPrice + breakfastOptionPrices + supplementPrice).toFixed(2)} {currency} × {item.quantity || 1} = {totalItemPrice.toFixed(2)} {currency}
            {supplementPrice > 0 && (
              <span className="cart-modal-supplement-price">+ {supplementPrice.toFixed(2)} {currency} supplément</span>
            )}
            {breakfastOptionPrices > 0 && (
              <span className="cart-modal-supplement-price">+ {breakfastOptionPrices.toFixed(2)} {currency} options</span>
            )}
          </div>
          {item.breakfast_id && item.option_ids && (
            <div className="cart-modal-breakfast-options">
              {breakfastOptions
                .filter(option => item.option_ids.includes(option.id))
                .map(option => (
                  <span key={option.id} className="cart-modal-option-detail">
                    {option.option_name} (+{parseFloat(option.additional_price || 0).toFixed(2)} {currency})
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      {!item.breakfast_id && itemSupplements?.length > 0 && (
        <select
          onChange={(e) => handleSupplementChange(item.cartItemId, e.target.value)}
          value={supplementSelections[item.cartItemId]?.supplement_id || item.supplement_id || '0'}
          className="cart-modal-supplement-select"
        >
          <option value="0">Aucun supplément</option>
          {itemSupplements.map((s) => (
            <option key={s.supplement_id} value={s.supplement_id}>
              {s.name} (+{parseFloat(s.additional_price || 0).toFixed(2)} {currency})
            </option>
          ))}
        </select>
      )}

      <div className="cart-modal-quantity-controls">
        <div className="cart-modal-quantity-buttons">
          <button
            onClick={() => handleQuantityChange(item.cartItemId, item.quantity - 1)}
            disabled={item.quantity <= 1}
            className="cart-modal-quantity-button"
            aria-label="Diminuer la quantité"
          >
            <RemoveIcon fontSize="small" />
          </button>
          <span className="cart-modal-quantity-number">{item.quantity || 1}</span>
          <button
            onClick={() => handleQuantityChange(item.cartItemId, item.quantity + 1)}
            className="cart-modal-quantity-button"
            aria-label="Augmenter la quantité"
          >
            <AddIcon fontSize="small" />
          </button>
        </div>
        <button
          onClick={() => handleQuantityChange(item.cartItemId, 0)}
          className="cart-modal-delete-button"
          aria-label="Supprimer l'article"
        >
          <DeleteIcon fontSize="small" />
        </button>
      </div>
    </li>
  );
});

function CartModal({
  isOpen,
  onClose,
  cart = [],
  updateQuantity,
  orderType,
  setOrderType,
  deliveryAddress,
  setDeliveryAddress,
  clearCart,
  sessionId,
  socket
}) {
  const [tables, setTables] = useState([]);
  const [tableId, setTableId] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [supplementSelections, setSupplementSelections] = useState({});
  const [itemSupplements, setItemSupplements] = useState({});
  const [breakfastOptions, setBreakfastOptions] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState('$');
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const touchStartY = useRef(null);
  const lastTouchY = useRef(null);
  const touchStartTime = useRef(null);
  const submissionLockRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const themeResponse = await api.getTheme();
        if (themeResponse.data && themeResponse.data.currency) {
          setCurrency(themeResponse.data.currency);
        }
      } catch (error) {
        console.error('CartModal - Error fetching theme for currency:', error);
      }
    };
    fetchTheme();
  }, []);

  useEffect(() => {
    if (!isOpen || orderType !== 'local') {
      setTableId('');
      setTableSearch('');
      return;
    }

    api.getTables()
      .then((res) => setTables(res.data?.filter(table => table.id && table.table_number && table.status !== 'reserved') || []))
      .catch((error) => {
        console.error('Échec du chargement des tables:', error);
        toast.error('Échec du chargement des tables');
        setTables([]);
      });
  }, [isOpen, orderType]);

  useEffect(() => {
    if (!isOpen || !cart.length) {
      setItemSupplements({});
      setSupplementSelections({});
      setBreakfastOptions({});
      setNotes('');
      return;
    }

    const fetchSupplementsAndOptions = async () => {
      const supplementsData = {};
      const optionsData = {};
      const uniqueItemIds = [...new Set(cart.map((item) => item.item_id || item.breakfast_id))];
      
      for (const itemId of uniqueItemIds) {
        if (!itemId || isNaN(itemId)) continue;
        try {
          const itemType = cart.find(i => i.item_id === itemId || i.breakfast_id === itemId)?.breakfast_id ? 'breakfast' : 'menu';
          if (itemType === 'menu') {
            const res = await api.getSupplementsByMenuItem(itemId);
            supplementsData[itemId] = res.data?.filter(s => s.supplement_id && s.name) || [];
          } else if (itemType === 'breakfast') {
            const res = await api.getBreakfastOptions(itemId);
            optionsData[itemId] = res.data?.filter(o => o.id && o.option_name && o.group_id) || [];
          }
        } catch (error) {
          console.error(`Échec du chargement des données pour l'article ${itemId}:`, error);
          supplementsData[itemId] = [];
          optionsData[itemId] = [];
        }
      }
      setItemSupplements(supplementsData);
      setBreakfastOptions(optionsData);
    };

    fetchSupplementsAndOptions();
  }, [cart, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let localSessionId = localStorage.getItem('sessionId');
    if (!localSessionId) {
      localSessionId = uuidv4();
      localStorage.setItem('sessionId', localSessionId);
    }
  }, [isOpen]);

  const aggregatedCart = useMemo(() => {
    const acc = {};
    cart.forEach((item) => {
      if (!item.cartItemId || (!item.item_id && !item.breakfast_id)) return;
      const key = item.breakfast_id
        ? `${item.breakfast_id}_${item.option_ids?.sort().join('-') || 'no-options'}`
        : `${item.item_id}_${item.supplement_id || 'no-supplement'}_${item.cartItemId}`;
      if (!acc[key]) {
        acc[key] = { ...item, quantity: 0 };
      }
      acc[key].quantity += item.quantity || 1;
    });
    return Object.values(acc).filter(item => item.quantity > 0);
  }, [cart]);

  const calculateTotal = useMemo(() => {
    return (aggregatedCart || [])
      .reduce((sum, item) => {
        const basePrice = parseFloat(item.sale_price || item.unit_price || item.regular_price) || 0;
        if (basePrice < 0) return sum;
        const supplementPrice = parseFloat(supplementSelections[item.cartItemId]?.additional_price || item.supplement_price || 0) || 0;
        const breakfastOptionPrices = item.option_ids?.reduce((sum, optionId) => {
          const option = (breakfastOptions[item.breakfast_id] || []).find(o => o.id === optionId);
          return sum + (parseFloat(option?.additional_price) || 0);
        }, 0) || 0;
        const unitTotal = basePrice + supplementPrice + breakfastOptionPrices;
        return sum + (unitTotal * (item.quantity || 1));
      }, 0)
      .toFixed(2);
  }, [aggregatedCart, supplementSelections, breakfastOptions]);

  const total = calculateTotal;
  const itemCount = useMemo(() => (cart || []).reduce((sum, item) => sum + (item.quantity || 0), 0), [cart]);

  const filteredTables = useMemo(() => {
    if (!tableSearch.trim()) return tables;
    return tables.filter((table) =>
      table.table_number.toString().toLowerCase().includes(tableSearch.toLowerCase())
    );
  }, [tables, tableSearch]);

  const handleQuantityChange = useCallback((cartItemId, newQuantity) => {
    const item = cart.find((i) => i.cartItemId === cartItemId);
    if (!item) return;

    if (newQuantity === 0) {
      updateQuantity(cartItemId, 0);
      setSupplementSelections((prev) => {
        const newSelections = { ...prev };
        delete newSelections[cartItemId];
        return newSelections;
      });
    } else if (newQuantity > 0) {
      updateQuantity(cartItemId, newQuantity);
    }
  }, [cart, updateQuantity]);

  const handleSupplementChange = useCallback((cartItemId, supplementId) => {
    const parsedSupplementId = supplementId === '0' ? null : parseInt(supplementId);
    const item = cart.find((i) => i.cartItemId === cartItemId);
    if (!item || item.breakfast_id) return;

    const supplement = parsedSupplementId
      ? (itemSupplements[item.item_id] || []).find((s) => s.supplement_id === parsedSupplementId)
      : null;

    setSupplementSelections((prev) => ({
      ...prev,
      [cartItemId]: supplement,
    }));

    updateQuantity(cartItemId, item.quantity, {
      supplement_id: parsedSupplementId,
      supplement_name: supplement?.name || null,
      supplement_price: parseFloat(supplement?.additional_price || 0),
    });
  }, [cart, itemSupplements, updateQuantity]);

  const validateOrder = useCallback(() => {
    if (!cart?.length) return 'Le panier est vide';
    if (orderType === 'local' && !tableId) return 'Veuillez sélectionner une table';
    if (orderType === 'delivery' && !deliveryAddress?.trim()) return 'Veuillez entrer une adresse de livraison';

    for (const item of cart) {
      const id = item.item_id || item.breakfast_id;
      if (!id || isNaN(id) || id <= 0) return `ID d'article invalide: ${id}`;
      if (!item.quantity || item.quantity <= 0) return `Quantité invalide pour ${item.name || 'article'}`;
      const basePrice = parseFloat(item.sale_price || item.unit_price || item.regular_price) || 0;
      if (basePrice <= 0) return `Prix invalide pour ${item.name || 'article'}`;
    }
    return null;
  }, [cart, orderType, tableId, deliveryAddress]);

  const handlePlaceOrder = useCallback(async () => {
    if (submissionLockRef.current || isSubmitting) return;

    const lockId = uuidv4();
    submissionLockRef.current = lockId;
    setIsSubmitting(true);

    try {
      const validationError = validateOrder();
      if (validationError) throw new Error(validationError);

      let localSessionId = localStorage.getItem('sessionId');
      if (!localSessionId) {
        localSessionId = uuidv4();
        localStorage.setItem('sessionId', localSessionId);
      }

      const orderItems = aggregatedCart.map((item) => {
        let unitPrice = parseFloat(item.sale_price || item.unit_price || item.regular_price) || 0;
        if (unitPrice <= 0) throw new Error(`Prix invalide pour ${item.name || 'article'}`);

        if (item.breakfast_id && item.option_ids) {
          const options = breakfastOptions[item.breakfast_id] || [];
          const optionPrices = item.option_ids.reduce((sum, optionId) => {
            const option = options.find(o => o.id === optionId);
            return sum + (parseFloat(option?.additional_price) || 0);
          }, 0);
          unitPrice += optionPrices;
        }

        const supplement = item.breakfast_id ? null : (supplementSelections[item.cartItemId] || {
          supplement_id: item.supplement_id || null,
          name: item.supplement_name || null,
          additional_price: parseFloat(item.supplement_price || 0),
        });

        if (supplement && !item.breakfast_id) {
          unitPrice += parseFloat(supplement.additional_price || 0);
        }

        return {
          ...(item.breakfast_id ? { breakfast_id: parseInt(item.breakfast_id) } : { item_id: parseInt(item.item_id) }),
          quantity: parseInt(item.quantity || 1),
          unit_price: parseFloat(unitPrice.toFixed(2)),
          ...(supplement && !item.breakfast_id ? { supplement_id: parseInt(supplement.supplement_id) } : {}),
          ...(supplement && !item.breakfast_id ? { supplement_name: supplement.name } : {}),
          ...(supplement && !item.breakfast_id ? { supplement_price: parseFloat(supplement.additional_price) } : {}),
          ...(item.breakfast_id && item.option_ids ? { option_ids: item.option_ids } : {}),
        };
      });

      const orderData = {
        breakfastItems: orderItems.filter(item => item.breakfast_id),
        items: orderItems.filter(item => item.item_id),
        total_price: parseFloat(total),
        order_type: orderType,
        table_id: orderType === 'local' ? parseInt(tableId) : null,
        delivery_address: orderType === 'delivery' ? deliveryAddress.trim() : null,
        session_id: sessionId,
        notes: notes.trim() || null,
      };

      const response = await api.submitOrder(orderData, {
        headers: { 'X-Session-Id': sessionId },
      });
      if (!response.data?.orderId) throw new Error('Échec de la création de la commande');

      socket.emit('newOrder', {
        id: response.data.orderId,
        ...orderData,
        created_at: new Date().toISOString(),
        approved: 0,
        status: 'reçue',
      });

      clearCart();
      setSupplementSelections({});
      setTableId('');
      setTableSearch('');
      setDeliveryAddress('');
      setNotes('');
      toast.success('Commande passée avec succès !');

      navigate(`/order-waiting/${response.data.orderId}`, { state: { sessionId } });
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Échec de la commande';
      toast.error(message);
    } finally {
      submissionLockRef.current = null;
      setIsSubmitting(false);
    }
  }, [orderType, tableId, deliveryAddress, aggregatedCart, supplementSelections, total, clearCart, navigate, validateOrder, breakfastOptions, sessionId, socket, notes]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setSupplementSelections({});
      setTableId('');
      setTableSearch('');
      setNotes('');
      setDragOffset(0);
      setIsDragging(false);
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  const handleTouchStart = useCallback((e) => {
    const content = contentRef.current;
    if (!content) return;

    // Only initiate drag from handle area
    const target = e.target;
    const isHandleArea = target.closest('.cart-modal-handle-wrapper') || target.closest('.cart-modal-header');
    
    if (!isHandleArea || content.scrollTop > 10) {
      touchStartY.current = null;
      return;
    }

    touchStartY.current = e.touches[0].clientY;
    lastTouchY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    setIsDragging(false);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartY.current) return;

    const touchY = e.touches[0].clientY;
    const deltaY = touchY - touchStartY.current;
    const content = contentRef.current;

    // Only allow downward dragging
    if (deltaY < 0) return;

    // Check if content is scrolled
    if (content && content.scrollTop > 0) {
      touchStartY.current = null;
      return;
    }

    // Start visual drag feedback earlier for better responsiveness
    if (deltaY > 2 && !isDragging) {
      setIsDragging(true);
    }

    if (deltaY > 0) {
      const maxDrag = 300;
      // Less damping for faster response
      const damping = 0.85;
      const adjustedDelta = Math.min(deltaY * damping, maxDrag);
      
      setDragOffset(adjustedDelta);
      lastTouchY.current = touchY;
      
      // Prevent page scroll
      if (deltaY > 10) {
        e.preventDefault();
      }
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartY.current) return;

    // Lower threshold for faster closing (80px instead of 120px)
    const threshold = 80;
    
    // Calculate velocity for flick gesture
    const touchDuration = Date.now() - touchStartTime.current;
    const velocity = dragOffset / touchDuration;

    // Close if dragged past threshold OR if fast flick detected
    if (dragOffset > threshold || velocity > 0.5) {
      handleClose();
    } else {
      // Quick spring-back
      setDragOffset(0);
      setIsDragging(false);
    }
    
    touchStartY.current = null;
    lastTouchY.current = null;
    touchStartTime.current = null;
  }, [dragOffset, handleClose]);

  useEffect(() => {
    const modal = modalRef.current;
    if (modal && isOpen) {
      modal.addEventListener('touchstart', handleTouchStart, { passive: true });
      modal.addEventListener('touchmove', handleTouchMove, { passive: false });
      modal.addEventListener('touchend', handleTouchEnd, { passive: true });
      return () => {
        modal.removeEventListener('touchstart', handleTouchStart);
        modal.removeEventListener('touchmove', handleTouchMove);
        modal.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isOpen, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (!isOpen && !isClosing) return null;

  // Faster progress calculation (threshold 80px)
  const dragProgress = Math.min((dragOffset / 80) * 100, 100);
  const overlayOpacity = Math.max(1 - (dragOffset / 250), 0.3);

  return (
    <div 
      className={`cart-modal-overlay ${isClosing ? 'closing' : ''}`} 
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      style={{ opacity: overlayOpacity }}
    >
      <div
        ref={modalRef}
        className={`cart-modal ${isClosing ? 'closing' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{ 
          transform: `translate3d(0, ${dragOffset}px, 0)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        {/* Fast visual feedback indicator */}
        <div 
          className="cart-modal-drag-indicator"
          style={{ transform: `scaleX(${dragProgress / 100})` }}
        />

        {/* Touch-optimized handle */}
        <div className="cart-modal-handle-wrapper">
          <div className="cart-modal-handle" />
        </div>
        
        <div className="cart-modal-header">
          <button
            onClick={handleClose}
            className="cart-modal-close-button"
            aria-label="Fermer le panier"
          >
            <CloseIcon fontSize="small" />
          </button>
          <h3 className="cart-modal-title">Votre panier</h3>
          <div className="cart-modal-badge">{itemCount} {itemCount === 1 ? 'article' : 'articles'}</div>
        </div>

        <div ref={contentRef} className="cart-modal-content">
          {cart.length === 0 ? (
            <div className="cart-modal-empty-cart">
              <CoffeeIcon className="cart-modal-empty-cart-icon" />
              <p className="cart-modal-empty-cart-text">Votre panier est vide</p>
              <p className="cart-modal-empty-cart-subtext">Ajoutez quelques articles délicieux !</p>
            </div>
          ) : (
            <>
              <ul className="cart-modal-cart-list">
                {aggregatedCart.map((item) => (
                  <CartItem
                    key={item.cartItemId}
                    item={item}
                    itemSupplements={item.breakfast_id ? [] : (itemSupplements[item.item_id] || [])}
                    breakfastOptions={item.breakfast_id ? (breakfastOptions[item.breakfast_id] || []) : []}
                    supplementSelections={supplementSelections}
                    handleQuantityChange={handleQuantityChange}
                    handleSupplementChange={handleSupplementChange}
                    currency={currency}
                  />
                ))}
              </ul>

              <div className="cart-modal-summary">
                <div className="cart-modal-total-price">Total: {total} {currency}</div>

                <div className="cart-modal-form-group">
                  <label className="cart-modal-label">
                    <ShoppingBagIcon style={{ fontSize: '14px' }} />
                    Type de commande
                  </label>
                  <select
                    onChange={(e) => setOrderType(e.target.value)}
                    value={orderType}
                    className="cart-modal-select"
                  >
                    <option value="local">Sur place</option>
                    <option value="delivery">Livraison</option>
                    <option value="imported">À emporter</option>
                  </select>
                </div>

                {orderType === 'local' && (
                  <>
                    <div className="cart-modal-form-group">
                      <label className="cart-modal-label">
                        <SearchIcon style={{ fontSize: '14px' }} />
                        Rechercher une table
                      </label>
                      <div className="cart-modal-table-search-container">
                        <SearchIcon className="cart-modal-table-search-icon" />
                        <input
                          type="text"
                          value={tableSearch}
                          onChange={(e) => setTableSearch(e.target.value)}
                          placeholder="Numéro de table..."
                          className="cart-modal-table-search-input"
                        />
                      </div>
                    </div>
                    <div className="cart-modal-form-group">
                      <label className="cart-modal-label">
                        <RestaurantIcon style={{ fontSize: '14px' }} />
                        Sélectionner une table
                      </label>
                      <div className="cart-modal-table-list-container">
                        {filteredTables.length > 0 ? (
                          <ul className="cart-modal-table-list">
                            {filteredTables.map((t) => (
                              <li
                                key={t.id}
                                className={`cart-modal-table-item ${tableId === t.id ? 'cart-modal-table-item-selected' : ''}`}
                                onClick={() => setTableId(t.id)}
                              >
                                Table {t.table_number}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="cart-modal-table-list-empty">Aucune table trouvée</div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {orderType === 'delivery' && (
                  <div className="cart-modal-form-group">
                    <label className="cart-modal-label">
                      <LocalShippingIcon style={{ fontSize: '14px' }} />
                      Adresse de livraison
                    </label>
                    <input
                      value={deliveryAddress || ''}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Entrez votre adresse"
                      className="cart-modal-input"
                    />
                  </div>
                )}

                <div className="cart-modal-form-group">
                  <label className="cart-modal-label">
                    <NotesIcon style={{ fontSize: '14px' }} />
                    Instructions spéciales
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Sans Sucre, Bien cuit..."
                    className="cart-modal-textarea"
                    rows="3"
                  />
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting || (orderType === 'local' && !tableId) || (orderType === 'delivery' && !deliveryAddress)}
                  className="cart-modal-place-order-button"
                >
                  {isSubmitting ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <div className="cart-modal-spinner"></div>
                      En cours...
                    </div>
                  ) : (
                    `Commander · ${total} ${currency}`
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CartModal;
