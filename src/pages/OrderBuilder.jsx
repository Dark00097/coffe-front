import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import {
  UtensilsCrossed,
  Coffee,
  Table2,
  ShoppingCart,
  Users,
  Minus,
  Plus,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import './css/OrderBuilder.css';

function OrderBuilder({ user }) {
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [breakfasts, setBreakfasts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [supplements, setSupplements] = useState({});
  const [breakfastOptions, setBreakfastOptions] = useState({});
  const [breakfastOptionGroups, setBreakfastOptionGroups] = useState({});
  const [reusableGroups, setReusableGroups] = useState([]);
  const [tables, setTables] = useState([]);
  const [orderType, setOrderType] = useState('local');
  const [tableId, setTableId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currency, setCurrency] = useState('$');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('menu');
  const [selectedItemSheet, setSelectedItemSheet] = useState(null);
  const [sheetQty, setSheetQty] = useState(1);
  const [sheetSupplements, setSheetSupplements] = useState([]); // Multiple supplements
  const [sheetOptions, setSheetOptions] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [recent, setRecent] = useState([]);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [loadingSupplements, setLoadingSupplements] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [itemsRes, breakfastsRes, reusableRes, themeRes, tablesRes, catRes] = await Promise.all([
          api.get('/menu-items'),
          api.get('/breakfasts'),
          api.getReusableOptionGroups(),
          api.getTheme(),
          api.getTables(),
          api.get('/categories'),
        ]);
        setMenuItems(itemsRes.data || []);
        setBreakfasts(breakfastsRes.data || []);
        setReusableGroups(reusableRes.data || []);
        setTables(tablesRes.data || []);
        setCategories([{ id: 'all', name: 'All Items' }, ...((catRes.data || []))]);
        if (themeRes.data?.currency) setCurrency(themeRes.data.currency);
      } catch (err) {
        console.error('Failed to load order builder data', err.response?.data || err.message);
        toast.error('Failed to load items for order creation');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const savedFav = JSON.parse(localStorage.getItem('fav-items') || '[]');
    const savedRecent = JSON.parse(localStorage.getItem('recent-items') || '[]');
    setFavorites(savedFav);
    setRecent(savedRecent);
  }, []);

  const handleLoadSupplements = async (menuItemId) => {
    if (!menuItemId || supplements[menuItemId]) return;
    setLoadingSupplements(true);
    try {
      const res = await api.getSupplementsByMenuItem(menuItemId);
      setSupplements((prev) => ({ ...prev, [menuItemId]: res.data || [] }));
    } catch (err) {
      console.error('Failed to fetch supplements', err.response?.data || err.message);
    } finally {
      setLoadingSupplements(false);
    }
  };

  const handleLoadBreakfastOptions = async (breakfastId) => {
    if (!breakfastId) return;
    if (breakfastOptions[breakfastId] && breakfastOptionGroups[breakfastId]) return;
    setLoadingOptions(true);
    try {
      const [optionsRes, groupsRes] = await Promise.all([
        breakfastOptions[breakfastId] ? Promise.resolve({ data: breakfastOptions[breakfastId] }) : api.getBreakfastOptions(breakfastId),
        breakfastOptionGroups[breakfastId] ? Promise.resolve({ data: breakfastOptionGroups[breakfastId] }) : api.getBreakfastOptionGroups(breakfastId),
      ]);
      setBreakfastOptions((prev) => ({ ...prev, [breakfastId]: optionsRes.data || [] }));
      setBreakfastOptionGroups((prev) => ({ ...prev, [breakfastId]: groupsRes.data || [] }));
    } catch (err) {
      console.error('Failed to fetch breakfast options', err.response?.data || err.message);
    } finally {
      setLoadingOptions(false);
    }
  };

  const persistRecent = useCallback((item) => {
    const current = JSON.parse(localStorage.getItem('recent-items') || '[]');
    const next = [item, ...current.filter((i) => i.id !== item.id)].slice(0, 10);
    localStorage.setItem('recent-items', JSON.stringify(next));
    setRecent(next);
  }, []);

  const toggleFavorite = (key) => {
    const updated = favorites.includes(key)
      ? favorites.filter((f) => f !== key)
      : [...favorites, key];
    setFavorites(updated);
    localStorage.setItem('fav-items', JSON.stringify(updated));
  };

  // Check if item has supplements/options
  const itemHasSupplements = (itemId) => {
    return supplements[itemId]?.length > 0;
  };

  const breakfastHasOptions = (breakfastId) => {
    const opts = breakfastOptions[breakfastId] || [];
    const hasReusable = reusableGroups.some(g => g.options?.length > 0);
    return opts.length > 0 || hasReusable;
  };

  const addMenuItem = (itemId, quantity, supplementIds = []) => {
    const item = menuItems.find((m) => m.id === parseInt(itemId, 10));
    if (!item) return;
    
    const selectedSupplements = (supplements[item.id] || [])
      .filter((s) => supplementIds.includes(s.supplement_id));
    
    const basePrice = item.sale_price !== null && item.sale_price !== undefined 
      ? parseFloat(item.sale_price) 
      : parseFloat(item.regular_price || 0);
    
    const supplementsPrice = selectedSupplements.reduce(
      (sum, s) => sum + parseFloat(s.additional_price || 0), 0
    );
    
    const unitPrice = basePrice + supplementsPrice;
    
    const line = {
      type: 'menu',
      name: item.name,
      item_id: item.id,
      quantity,
      unit_price: unitPrice,
      base_price: basePrice,
      image_url: item.image_url,
      supplements: selectedSupplements,
      supplement_ids: supplementIds,
    };
    
    setCart((prev) => [...prev, line]);
    persistRecent({ id: `menu-${item.id}`, name: item.name });
    toast.success(`Added ${item.name} to order`);
  };

  const addBreakfastItem = (breakfastId, quantity, optionIds = []) => {
    const breakfast = breakfasts.find((b) => b.id === parseInt(breakfastId, 10));
    if (!breakfast) return;
    
    const selectedOptionIds = optionIds.map((id) => parseInt(id, 10)).filter(Boolean);
    
    // Get options from breakfast-specific options
    const bfOptions = (breakfastOptions[breakfast.id] || [])
      .filter((o) => selectedOptionIds.includes(o.id));
    
    // Get options from reusable groups
    const reusableOpts = reusableGroups
      .flatMap((g) => g.options || [])
      .filter((o) => selectedOptionIds.includes(o.id));
    
    const allSelectedOptions = [...bfOptions, ...reusableOpts];
    
    const optionPrice = allSelectedOptions.reduce(
      (sum, opt) => sum + parseFloat(opt.additional_price || 0), 0
    );
    
    const basePrice = parseFloat(breakfast.price || 0);
    const unitPrice = basePrice + optionPrice;
    
    const line = {
      type: 'breakfast',
      name: breakfast.name,
      breakfast_id: breakfast.id,
      quantity,
      unit_price: unitPrice,
      base_price: basePrice,
      image_url: breakfast.image_url,
      option_ids: selectedOptionIds,
      options: allSelectedOptions,
    };
    
    setCart((prev) => [...prev, line]);
    persistRecent({ id: `breakfast-${breakfast.id}`, name: breakfast.name });
    toast.success(`Added ${breakfast.name} to order`);
  };

  const openSheetForItem = async (item, type) => {
    setSelectedItemSheet({ type, id: item.id, item });
    setSheetQty(1);
    setSheetSupplements([]);
    setSheetOptions([]);
    
    if (type === 'menu') {
      await handleLoadSupplements(item.id);
    }
    if (type === 'breakfast') {
      await handleLoadBreakfastOptions(item.id);
    }
  };

  const quickAddItem = async (item, type) => {
    if (type === 'menu') {
      // Check if item has supplements - if so, open sheet
      if (!supplements[item.id]) {
        await handleLoadSupplements(item.id);
      }
      
      if (supplements[item.id]?.length > 0) {
        openSheetForItem(item, 'menu');
      } else {
        addMenuItem(item.id, 1, []);
      }
    } else {
      // Check if breakfast has options - if so, open sheet
      if (!breakfastOptions[item.id]) {
        await handleLoadBreakfastOptions(item.id);
      }
      
      const hasOptions = (breakfastOptions[item.id] || []).length > 0 || 
        reusableGroups.some(g => g.options?.length > 0);
      
      if (hasOptions) {
        openSheetForItem(item, 'breakfast');
      } else {
        addBreakfastItem(item.id, 1, []);
      }
    }
  };

  const toggleSheetSupplement = (supplementId) => {
    setSheetSupplements(prev => 
      prev.includes(supplementId)
        ? prev.filter(id => id !== supplementId)
        : [...prev, supplementId]
    );
  };

  const toggleSheetOption = (optionId) => {
    setSheetOptions(prev =>
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const calculateSheetTotal = () => {
    if (!selectedItemSheet) return 0;
    
    const { type, id } = selectedItemSheet;
    
    if (type === 'menu') {
      const item = menuItems.find(m => m.id === id);
      if (!item) return 0;
      
      const basePrice = parseFloat(item.sale_price ?? item.regular_price ?? 0);
      const supplementsPrice = (supplements[id] || [])
        .filter(s => sheetSupplements.includes(s.supplement_id))
        .reduce((sum, s) => sum + parseFloat(s.additional_price || 0), 0);
      
      return (basePrice + supplementsPrice) * sheetQty;
    } else {
      const breakfast = breakfasts.find(b => b.id === id);
      if (!breakfast) return 0;
      
      const basePrice = parseFloat(breakfast.price || 0);
      const bfOptions = (breakfastOptions[id] || [])
        .filter(o => sheetOptions.includes(o.id));
      const reusableOpts = reusableGroups
        .flatMap(g => g.options || [])
        .filter(o => sheetOptions.includes(o.id));
      
      const optionsPrice = [...bfOptions, ...reusableOpts]
        .reduce((sum, o) => sum + parseFloat(o.additional_price || 0), 0);
      
      return (basePrice + optionsPrice) * sheetQty;
    }
  };

  const validateBreakfastRequiredOptions = (breakfastId, selectedIds) => {
    const selected = new Set(selectedIds);
    const missing = [];

    const optionList = breakfastOptions[breakfastId] || [];
    const optionGroups = breakfastOptionGroups[breakfastId] || [];
    const requiredGroups = optionGroups.filter((g) => g.is_required || g.required);

    requiredGroups.forEach((group) => {
      const hasChoice = optionList.some((opt) => opt.group_id === group.id && selected.has(opt.id));
      if (!hasChoice) {
        missing.push(group.title || group.name || `Group ${group.id}`);
      }
    });

    reusableGroups
      .filter((g) => g.required)
      .forEach((group) => {
        const hasChoice = (group.options || []).some((opt) => selected.has(opt.id));
        if (!hasChoice) {
          missing.push(group.title || group.name || `Group ${group.id}`);
        }
      });

    return { ok: missing.length === 0, missing };
  };

  const confirmSheetAdd = () => {
    if (!selectedItemSheet) return;

    if (selectedItemSheet.type === 'menu') {
      addMenuItem(selectedItemSheet.id, sheetQty, sheetSupplements);
    } else {
      const { ok, missing } = validateBreakfastRequiredOptions(selectedItemSheet.id, sheetOptions);
      if (!ok) {
        toast.warn(`Select at least one option from: ${missing.join(', ')}`);
        return;
      }
      addBreakfastItem(selectedItemSheet.id, sheetQty, sheetOptions);
    }
    setSelectedItemSheet(null);
  };

  const total = useMemo(() => cart.reduce((sum, line) => sum + line.unit_price * line.quantity, 0), [cart]);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const removeLine = (index) => setCart((prev) => prev.filter((_, i) => i !== index));
  
  const updateQuantity = (index, delta) => {
    setCart((prev) =>
      prev.map((line, i) =>
        i === index ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    toast.info('Cart cleared');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!['admin', 'server'].includes(user?.role)) {
      toast.error('Access denied');
      return;
    }
    if (!cart.length) {
      toast.warn('Add at least one item');
      return;
    }
    if (orderType === 'local' && !tableId) {
      toast.warn('Select a table for local orders');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      toast.warn('Enter delivery address');
      return;
    }
    setIsSubmitting(true);
    try {
      const sessionId = `staff-${user?.id || 'user'}-${uuidv4()}`;
      const items = cart.filter((c) => c.type === 'menu').map((c) => ({
        item_id: c.item_id,
        quantity: c.quantity,
        unit_price: c.unit_price,
        supplement_ids: c.supplement_ids || [],
      }));
      const breakfastItems = cart.filter((c) => c.type === 'breakfast').map((c) => ({
        breakfast_id: c.breakfast_id,
        quantity: c.quantity,
        unit_price: c.unit_price,
        option_ids: c.option_ids || [],
      }));
      await api.submitStaffOrder({
        items,
        breakfastItems,
        total_price: total,
        order_type: orderType,
        delivery_address: orderType === 'delivery' ? deliveryAddress : null,
        table_id: orderType === 'local' ? tableId : null,
        notes,
        session_id: sessionId,
        source: 'staff-console',
      });
      toast.success('Order created successfully');
      setCart([]);
      setNotes('');
      setDeliveryAddress('');
      setTableId('');
      navigate(user?.role === 'admin' ? '/admin/orders' : '/staff');
    } catch (err) {
      console.error('Failed to submit order', err.response?.data || err.message);
      toast.error(err.response?.data?.error || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMenu = menuItems
    .filter((m) => m.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((m) => {
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'favorites') return favorites.includes(`menu-${m.id}`);
      return m.category_id === selectedCategory;
    });

  const filteredBreakfasts = breakfasts
    .filter((b) => b.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((b) => {
      if (selectedCategory === 'favorites') return favorites.includes(`breakfast-${b.id}`);
      return true;
    });

  const getTableStatus = (table) => {
    const status = table.status || 'free';
    const statusConfig = {
      free: { label: 'Available', color: 'success' },
      occupied: { label: 'Occupied', color: 'danger' },
      reserved: { label: 'Reserved', color: 'warning' },
    };
    return statusConfig[status] || statusConfig.free;
  };
  // ============ RENDER BOTTOM SHEET ============
  const renderBottomSheet = () => {
    if (!selectedItemSheet) return null;

    const { type, id } = selectedItemSheet;
    const isMenu = type === "menu";
    const item = isMenu ? menuItems.find((m) => m.id === id) : breakfasts.find((b) => b.id === id);
    if (!item) return null;

    const itemSupplements = isMenu ? (supplements[id] || []) : [];
    const itemOptions = !isMenu ? (breakfastOptions[id] || []) : [];
    const price = parseFloat(item.sale_price ?? item.regular_price ?? item.price ?? 0);
    const sheetTotal = calculateSheetTotal();

    return (
      <div className="ob-sheet-overlay" onClick={() => setSelectedItemSheet(null)}>
        <div className="ob-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="ob-sheet__handle" />
          <button className="ob-sheet__close" onClick={() => setSelectedItemSheet(null)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div className="ob-sheet__content">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="ob-sheet__image" loading="lazy" />
            ) : (
              <div className="ob-sheet__image ob-sheet__image--placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
            )}

            <div className="ob-sheet__header">
              <div className="ob-sheet__header-row">
                <h2 className="ob-sheet__title">{item.name}</h2>
                <span className="ob-sheet__base-price">{price.toFixed(2)} {currency}</span>
              </div>
              {item.description && <p className="ob-sheet__desc">{item.description}</p>}
              <span className="ob-sheet__type-badge">
                {isMenu ? (
                  <>
                    <UtensilsCrossed size={14} /> Menu Item
                  </>
                ) : (
                  <>
                    <Coffee size={14} /> Breakfast
                  </>
                )}
              </span>
            </div>

            <div className="ob-sheet__qty-section">
              <span className="ob-sheet__section-label">Quantity</span>
              <div className="ob-qty-control ob-qty-control--lg">
                <button className="ob-qty-control__btn" onClick={() => setSheetQty(Math.max(1, sheetQty - 1))} disabled={sheetQty <= 1}>
                  <Minus size={16} />
                </button>
                <span className="ob-qty-control__value">{sheetQty}</span>
                <button className="ob-qty-control__btn" onClick={() => setSheetQty(sheetQty + 1)}>
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {isMenu && (
              <div className="ob-sheet__section">
                <div className="ob-sheet__section-header">
                  <h4 className="ob-sheet__section-title">Add Supplements</h4>
                  <span className="ob-sheet__section-hint">Optional</span>
                </div>
                {loadingSupplements ? (
                  <div className="ob-sheet__loading">Loading supplements...</div>
                ) : itemSupplements.length > 0 ? (
                  <div className="ob-options-grid">
                    {itemSupplements.map((supp) => {
                      const isSelected = sheetSupplements.includes(supp.supplement_id);
                      return (
                        <button
                          key={supp.supplement_id}
                          className={`ob-option-card ${isSelected ? 'ob-option-card--selected' : ''}`}
                          onClick={() => toggleSheetSupplement(supp.supplement_id)}
                        >
                          <div className="ob-option-card__checkbox">{isSelected && <Check />}</div>
                          <div className="ob-option-card__content">
                            <span className="ob-option-card__name">{supp.name}</span>
                            {supp.description && <span className="ob-option-card__desc">{supp.description}</span>}
                          </div>
                          <span className="ob-option-card__price">+{parseFloat(supp.additional_price || 0).toFixed(2)} {currency}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ob-sheet__empty-options">No supplements available</div>
                )}
              </div>
            )}

            {!isMenu && (
              <div className="ob-sheet__section">
                <div className="ob-sheet__section-header">
                  <h4 className="ob-sheet__section-title">Breakfast Options</h4>
                  <span className="ob-sheet__section-hint">Customize your breakfast</span>
                </div>
                {loadingOptions ? (
                  <div className="ob-sheet__loading">Loading options...</div>
                ) : itemOptions.length > 0 ? (
                  <div className="ob-options-grid">
                    {itemOptions.map((opt) => {
                      const isSelected = sheetOptions.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          className={`ob-option-card ${isSelected ? 'ob-option-card--selected' : ''}`}
                          onClick={() => toggleSheetOption(opt.id)}
                        >
                          <div className="ob-option-card__checkbox">{isSelected && <Check />}</div>
                          <div className="ob-option-card__content">
                            <span className="ob-option-card__name">{opt.option_name || opt.name}</span>
                            {opt.description && <span className="ob-option-card__desc">{opt.description}</span>}
                          </div>
                          <span className="ob-option-card__price">+{parseFloat(opt.additional_price || 0).toFixed(2)} {currency}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ob-sheet__empty-options">No options available</div>
                )}

                {reusableGroups.map((group) => {
                  if (!group.options?.length) return null;
                  return (
                    <div key={group.id} className="ob-sheet__section">
                      <div className="ob-sheet__section-header">
                        <h4 className="ob-sheet__section-title">{group.title || group.name}</h4>
                        {group.required && <span className="ob-sheet__section-required">Required</span>}
                      </div>
                      <div className="ob-options-grid">
                        {group.options.map((opt) => {
                          const isSelected = sheetOptions.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              className={`ob-option-card ${isSelected ? 'ob-option-card--selected' : ''}`}
                              onClick={() => toggleSheetOption(opt.id)}
                            >
                              <div className="ob-option-card__checkbox">{isSelected && <Check />}</div>
                              <div className="ob-option-card__content">
                                <span className="ob-option-card__name">{opt.option_name || opt.name}</span>
                              </div>
                              <span className="ob-option-card__price">
                                {parseFloat(opt.additional_price || 0) > 0
                                  ? `+${parseFloat(opt.additional_price).toFixed(2)} ${currency}`
                                  : 'Free'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(sheetSupplements.length > 0 || sheetOptions.length > 0) && (
              <div className="ob-sheet__selected-summary">
                <h5>Selected Add-ons:</h5>
                <div className="ob-sheet__selected-tags">
                  {isMenu &&
                    sheetSupplements.map((suppId) => {
                      const supp = itemSupplements.find((s) => s.supplement_id === suppId);
                      return supp ? (
                        <span key={suppId} className="ob-selected-tag">
                          {supp.name}
                          <button aria-label="Remove supplement" onClick={() => toggleSheetSupplement(suppId)}>x</button>
                        </span>
                      ) : null;
                    })}
                  {!isMenu &&
                    sheetOptions.map((optId) => {
                      const opt = [...itemOptions, ...reusableGroups.flatMap((g) => g.options || [])].find((o) => o.id === optId);
                      return opt ? (
                        <span key={optId} className="ob-selected-tag">
                          {opt.option_name || opt.name}
                          <button aria-label="Remove option" onClick={() => toggleSheetOption(optId)}>x</button>
                        </span>
                      ) : null;
                    })}
                </div>
              </div>
            )}
          </div>

          <div className="ob-sheet__footer">
            <div className="ob-sheet__total">
              <span>Total</span>
              <span className="ob-sheet__total-price">{sheetTotal.toFixed(2)} {currency}</span>
            </div>
            <button className="ob-btn ob-btn--primary ob-btn--lg ob-btn--block" onClick={confirmSheetAdd}>
              <ShoppingCart size={20} />
              <span>Add to Order</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============ RENDER ITEM CARD ============
  const renderItemCard = (item, type) => {
    const isMenu = type === 'menu';
    const price = parseFloat(item.sale_price ?? item.regular_price ?? item.price ?? 0);
    const hasDiscount = isMenu && item.sale_price && item.regular_price && item.sale_price < item.regular_price;

    return (
      <div key={`${type}-${item.id}`} className="ob-item-card">
        <div className="ob-item-card__image-wrap" onClick={() => openSheetForItem(item, type)}>
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="ob-item-card__image" loading="lazy" />
          ) : (
            <div className="ob-item-card__image ob-item-card__image--placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </div>
          )}
          {hasDiscount && <span className="ob-item-card__badge">Sale</span>}
          <span className="ob-item-card__type">
            {isMenu ? <UtensilsCrossed size={14} /> : <Coffee size={14} />}
          </span>
        </div>
        <div className="ob-item-card__body">
          <h4 className="ob-item-card__name" onClick={() => openSheetForItem(item, type)}>{item.name}</h4>
          <div className="ob-item-card__footer">
            <div className="ob-item-card__pricing">
              <span className="ob-item-card__price">{price.toFixed(2)} {currency}</span>
              {hasDiscount && (
                <span className="ob-item-card__original">{parseFloat(item.regular_price).toFixed(2)}</span>
              )}
            </div>
            <button 
              className="ob-item-card__add"
              onClick={() => quickAddItem(item, type)}
              title="Quick add"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============ RENDER CART SIDEBAR ============
  const renderCartSidebar = () => (
    <div className="ob-cart">
      <div className="ob-cart__header">
        <h2 className="ob-cart__title">Current Order</h2>
      </div>

      <div className="ob-cart__type-selector">
        {['local', 'delivery', 'takeaway'].map((type) => (
          <button
            key={type}
            className={`ob-cart__type-btn ${orderType === type ? 'ob-cart__type-btn--active' : ''}`}
            onClick={() => setOrderType(type)}
          >
            {type === 'local' && <Table2 size={16} />}
            {type === 'delivery' && <ShoppingCart size={16} />}
            {type === 'takeaway' && <UtensilsCrossed size={16} />}
            <span style={{ textTransform: 'capitalize' }}>{type}</span>
          </button>
        ))}
      </div>

      {orderType === 'local' && (
        <div className="ob-cart__field">
          <label className="ob-label">Select Table</label>
          <select className="ob-select" value={tableId} onChange={(e) => setTableId(e.target.value)}>
            <option value="">Choose a table...</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                Table {t.table_number || t.id}
              </option>
            ))}
          </select>
        </div>
      )}

      {orderType === 'delivery' && (
        <div className="ob-cart__field">
          <label className="ob-label">Delivery Address</label>
          <input
            type="text"
            className="ob-input"
            placeholder="Enter full delivery address..."
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
          />
        </div>
      )}

      <div className="ob-cart__items">
        {cart.length === 0 ? (
          <div className="ob-cart__empty">
            <p>Your cart is empty</p>
            <span>Add items from the menu to get started</span>
          </div>
        ) : (
          <ul className="ob-cart__list">
            {cart.map((line, idx) => (
              <li key={idx} className="ob-cart-item">
                <div className="ob-cart-item__info">
                  <h4 className="ob-cart-item__name">{line.name}</h4>
                  <div className="ob-cart-item__price-row">
                    <span className="ob-cart-item__unit">
                      {line.unit_price.toFixed(2)} x {line.quantity}
                    </span>
                    <span className="ob-cart-item__total">
                      {(line.unit_price * line.quantity).toFixed(2)} {currency}
                    </span>
                  </div>
                </div>
                <div className="ob-cart-item__actions">
                  <div className="ob-qty-control ob-qty-control--sm">
                    <button onClick={() => updateQuantity(idx, -1)} disabled={line.quantity <= 1}>
                      <Minus size={14} />
                    </button>
                    <span>{line.quantity}</span>
                    <button onClick={() => updateQuantity(idx, 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <button className="ob-cart-item__remove" onClick={() => removeLine(idx)}>
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="ob-cart__footer">
        <div className="ob-cart__notes">
          <label className="ob-label">Special Instructions</label>
          <textarea
            className="ob-textarea"
            placeholder="Any special requests or notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
        <div className="ob-cart__summary">
          <div className="ob-cart__summary-row">
            <span>Subtotal ({cart.length} items)</span>
            <span>
              {total.toFixed(2)} {currency}
            </span>
          </div>
          <div className="ob-cart__summary-row ob-cart__summary-row--total">
            <span>Total</span>
            <span>
              {total.toFixed(2)} {currency}
            </span>
          </div>
        </div>
        <button
          className="ob-btn ob-btn--primary ob-btn--lg ob-btn--block"
          disabled={isSubmitting || cart.length === 0}
          onClick={handleSubmit}
        >
          {isSubmitting ? 'Processing...' : 'Place Order'}
        </button>
      </div>
    </div>
  );

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="ob-loading">
        <div className="ob-loading__spinner"></div>
        <p>Loading menu...</p>
      </div>
    );
  }

  // ============ MAIN RENDER ============
  return (
    <div className="ob">
      {offline && (
        <div className="ob-offline-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
          <span>You're offline. Orders will sync when connection is restored.</span>
        </div>
      )}

      <div className="ob-main">
        <div className="ob-content">
          <header className="ob-header">
            <div className="ob-header__left">
              <h1 className="ob-header__title">Create New Order</h1>
              <p className="ob-header__subtitle">Select items to add to the order</p>
            </div>
            <div className="ob-header__right">
              <button
                className="ob-btn ob-btn--ghost"
                onClick={() => navigate('/admin/orders')}
              >
                Recent Orders
              </button>
              <div className="ob-search">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="ob-search__clear" onClick={() => setSearchQuery('')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </header>

          <nav className="ob-tabs">
            <button 
              className={`ob-tabs__btn ${activeTab === 'menu' ? 'ob-tabs__btn--active' : ''}`}
              onClick={() => setActiveTab('menu')}
            >
              <span className="ob-tabs__icon"><UtensilsCrossed size={16} /></span>
              <span>Menu Items</span>
              <span className="ob-tabs__count">{menuItems.length}</span>
            </button>
            <button 
              className={`ob-tabs__btn ${activeTab === 'breakfast' ? 'ob-tabs__btn--active' : ''}`}
              onClick={() => setActiveTab('breakfast')}
            >
              <span className="ob-tabs__icon"><Coffee size={16} /></span>
              <span>Breakfast</span>
              <span className="ob-tabs__count">{breakfasts.length}</span>
            </button>
            {orderType === 'local' && (
              <button 
                className={`ob-tabs__btn ${activeTab === 'tables' ? 'ob-tabs__btn--active' : ''}`}
                onClick={() => setActiveTab('tables')}
              >
                <span className="ob-tabs__icon"><Table2 size={16} /></span>
                <span>Tables</span>
                <span className="ob-tabs__count">{tables.length}</span>
              </button>
            )}
          </nav>

          <div className="ob-items-section">
            {activeTab === 'menu' && (
              <>
                {filteredMenu.length === 0 ? (
                  <div className="ob-empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <p>No menu items found</p>
                    <span>Try adjusting your search or category filter</span>
                  </div>
                ) : (
                  <div className="ob-items-grid">
                    {filteredMenu.map((item) => renderItemCard(item, 'menu'))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'breakfast' && (
              <>
                {filteredBreakfasts.length === 0 ? (
                  <div className="ob-empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <p>No breakfast items found</p>
                    <span>Try adjusting your search</span>
                  </div>
                ) : (
                  <div className="ob-items-grid">
                    {filteredBreakfasts.map((item) => renderItemCard(item, 'breakfast'))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'tables' && (
              <div className="ob-tables-section">
                <div className="ob-tables-legend">
                  <span className="ob-legend-item ob-legend-item--success">
                    <span className="ob-legend-dot"></span> Available
                  </span>
                  <span className="ob-legend-item ob-legend-item--warning">
                    <span className="ob-legend-dot"></span> Reserved
                  </span>
                  <span className="ob-legend-item ob-legend-item--danger">
                    <span className="ob-legend-dot"></span> Occupied
                  </span>
                </div>
                <div className="ob-tables-grid">
                  {tables.map((table) => {
                    const status = getTableStatus(table);
                    const isSelected = String(table.id) === String(tableId);
                    return (
                      <button
                        key={table.id}
                        className={`ob-table-card ob-table-card--${status.color} ${isSelected ? 'ob-table-card--selected' : ''}`}
                        onClick={() => setTableId(table.id)}
                      >
                        <div className="ob-table-card__icon">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          </svg>
                        </div>
                        <div className="ob-table-card__number">
                          Table {table.table_number || table.id}
                        </div>
                        <div className="ob-table-card__meta">
                          <span className={`ob-table-card__status ob-table-card__status--${status.color}`}>
                            {status.label}
                          </span>
                          {table.capacity && (
                            <span className="ob-table-card__capacity"><Users size={14} /> {table.capacity}</span>
                          )}
                        </div>
                        {isSelected && (
                          <div className="ob-table-card__check">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {renderCartSidebar()}
      </div>

      {/* Mobile cart button */}
      <button className="ob-mobile-cart-btn" onClick={() => setShowMobileCart(true)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        {cartCount > 0 && <span className="ob-mobile-cart-btn__badge">{cartCount}</span>}
        <span className="ob-mobile-cart-btn__text">View Order</span>
        <span className="ob-mobile-cart-btn__total">{total.toFixed(2)} {currency}</span>
      </button>

      {/* Mobile cart overlay */}
      {showMobileCart && (
        <div className="ob-cart-overlay" onClick={() => setShowMobileCart(false)} />
      )}

      {selectedItemSheet && renderBottomSheet()}
    </div>
  );
}

export default OrderBuilder;