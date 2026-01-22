import { api } from '../services/api';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import StarIcon from '@mui/icons-material/Star';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import EditIcon from '@mui/icons-material/Edit';
import { debounce } from 'lodash';
import { toast } from 'react-toastify';

function MenuItemCard({ item, onAddToCart, onView, isManager }) {
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [supplements, setSupplements] = useState({ options: [], optionGroups: [] });
  const [selectedOptions, setSelectedOptions] = useState({});
  const [showOptionPopup, setShowOptionPopup] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [currency, setCurrency] = useState('$');

  const isMobile = screenSize.width <= 768;
  const isSmallMobile = screenSize.width <= 375;

  const handleResize = useCallback(
    debounce(() => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 100),
    []
  );

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

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

  useEffect(() => {
    if (!item?.id) return;
    const fetchData = async () => {
      try {
        let data = { options: [], optionGroups: [] };
        if (item.type === 'breakfast') {
          const [optionsResponse, groupsResponse] = await Promise.all([
            api.getBreakfastOptions(item.id),
            api.getBreakfastOptionGroups(item.id),
          ]);
          data = {
            options: optionsResponse.data || [],
            optionGroups: groupsResponse.data || [],
          };
        } else {
          const response = await api.getSupplementsByMenuItem(item.id);
          data = {
            options: response.data || [],
            optionGroups: [],
          };
        }
        setSupplements(data);
      } catch (err) {
        console.error(`Error loading ${item.type === 'breakfast' ? 'options' : 'supplements'} for item ${item.id}:`, err);
        setSupplements({ options: [], optionGroups: [] });
      }
    };
    fetchData();
  }, [item?.id, item?.type]);

  const imageSrc = useMemo(() => {
    return item?.image_url &&
      item.image_url !== '/Uploads/undefined' &&
      item.image_url !== 'null'
      ? item.image_url
      : '/placeholder.jpg';
  }, [item?.image_url]);

  const handleOptionChange = useCallback((groupId, optionId) => {
    setSelectedOptions((prev) => {
      const currentSelections = prev[groupId] || [];
      const group = supplements.optionGroups.find(g => g.id === groupId);
      const maxSelections = group?.max_selections || 0;
      let newSelections;

      if (Array.isArray(currentSelections)) {
        if (currentSelections.includes(optionId)) {
          newSelections = currentSelections.filter(id => id !== optionId);
        } else if (maxSelections === 0 || currentSelections.length < maxSelections) {
          newSelections = [...currentSelections, optionId];
        } else {
          newSelections = [...currentSelections.slice(1), optionId];
        }
      } else {
        newSelections = [optionId];
      }

      return {
        ...prev,
        [groupId]: newSelections,
      };
    });
    setValidationErrors((prev) => ({
      ...prev,
      [groupId]: false,
    }));
  }, [supplements.optionGroups]);

  const handleAddToCart = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!item?.availability) return;

      if (item.type === 'breakfast' && supplements.optionGroups?.length > 0) {
        const errors = {};
        let hasErrors = false;

        supplements.optionGroups.forEach((group) => {
          const selections = selectedOptions[group.id] || [];
          if (group.is_required && selections.length === 0) {
            errors[group.id] = true;
            hasErrors = true;
          }
          if (group.max_selections > 0 && selections.length > group.max_selections) {
            errors[group.id] = true;
            hasErrors = true;
          }
        });

        if (hasErrors) {
          setValidationErrors(errors);
          setShowOptionPopup(true);
          return;
        }
      }

      if ((item.type === 'breakfast' && supplements.optionGroups?.length > 0) || (item.type !== 'breakfast' && supplements.options.length > 0)) {
        setShowOptionPopup(true);
      } else {
        if (item.type === 'breakfast') {
          onAddToCart({
            breakfast_id: item.id,
            unit_price: parseFloat(item.price || 0),
            quantity: 1,
            option_ids: [],
            cartItemId: `${item.id}-${Date.now()}`,
            name: item.name,
            image_url: item.image_url,
            type: 'breakfast',
            options: [],
          });
        } else {
          onAddToCart({
            ...item,
            item_id: item.id,
            unit_price: parseFloat(item.sale_price || item.regular_price) || 0,
            quantity: item.quantity || 1,
            supplement_id: null,
            supplement_name: null,
            supplement_price: 0,
            cartItemId: `${item.id}-${Date.now()}`,
            type: 'menuItem',
            image_url: item.image_url,
          });
        }
      }
    },
    [item, onAddToCart, supplements, selectedOptions]
  );

  const handleOptionSelection = useCallback(() => {
    if (item.type === 'breakfast') {
      const selectedOptionIds = Object.values(selectedOptions).flat().filter(id => id);
      const optionsPrice = supplements.options
        .filter((opt) => selectedOptionIds.includes(opt.id))
        .reduce((sum, opt) => sum + parseFloat(opt.additional_price || 0), 0);
      const totalPrice = (parseFloat(item.price || 0) + optionsPrice);

      onAddToCart({
        breakfast_id: item.id,
        unit_price: parseFloat(item.price || 0),
        total_price: totalPrice.toFixed(2),
        quantity: 1,
        option_ids: selectedOptionIds,
        name: item.name,
        image_url: item.image_url,
        type: 'breakfast',
        options: supplements.options
          .filter((opt) => selectedOptionIds.includes(opt.id))
          .map((opt) => ({
            ...opt,
            group_title: supplements.optionGroups.find((g) => g.id === opt.group_id)?.title || 'Unknown Group',
          })),
        cartItemId: `${item.id}-${Date.now()}`,
      });
    } else {
      const supplement = supplements.options.find(s => s.supplement_id === parseInt(Object.values(selectedOptions)[0] || '0'));
      onAddToCart({
        ...item,
        item_id: item.id,
        unit_price: parseFloat(item.sale_price || item.regular_price) || 0,
        quantity: item.quantity || 1,
        supplement_id: supplement ? parseInt(supplement.supplement_id) : null,
        supplement_name: supplement ? supplement.name : null,
        supplement_price: supplement ? parseFloat(supplement.additional_price || 0) : 0,
        cartItemId: `${item.id}-${Date.now()}`,
        type: 'menuItem',
        image_url: item.image_url,
      });
    }
    setShowOptionPopup(false);
    setSelectedOptions({});
    setValidationErrors({});
  }, [item, onAddToCart, supplements, selectedOptions]);

  const handleViewProduct = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (onView && item?.id) {
        onView(item.id, item?.type);
      }
    },
    [onView, item?.id, item?.type]
  );

  const handleEditProduct = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (item?.id) {
        window.location.href = `/edit-product/${item.id}`;
      }
    },
    [item?.id]
  );

  const regularPrice = parseFloat(item?.type === 'breakfast' ? item.price : item.regular_price) || 0;
  const salePrice = parseFloat(item?.type === 'breakfast' ? null : item.sale_price) || null;
  const ratingValue = parseFloat(item?.average_rating) || 0;
  const reviewCount = parseInt(item?.review_count) || 0;

  const discountPercentage = useMemo(() => {
    return salePrice && regularPrice > 0
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : 0;
  }, [salePrice, regularPrice]);

  const displayPrice = useMemo(() => {
    if (item.type === 'breakfast') {
      const optionsPrice = (supplements.options || [])
        .filter((opt) => Object.values(selectedOptions).flat().includes(opt.id))
        .reduce((sum, opt) => sum + parseFloat(opt.additional_price || 0), 0);
      return (regularPrice + optionsPrice).toFixed(2);
    }
    return (salePrice || regularPrice).toFixed(2);
  }, [item.type, regularPrice, salePrice, selectedOptions, supplements]);

  const renderStars = useMemo(() => {
    const stars = [];
    const fullStars = Math.floor(ratingValue);
    for (let i = 0; i < 5; i++) {
      stars.push(
        i < fullStars ? (
          <StarIcon
            key={i}
            sx={{
              fontSize: isSmallMobile ? '10px' : '11px',
              color: '#fbbf24',
            }}
          />
        ) : (
          <StarOutlineIcon
            key={i}
            sx={{
              fontSize: isSmallMobile ? '10px' : '11px',
              color: '#d1d5db',
            }}
          />
        )
      );
    }
    return stars;
  }, [ratingValue, isSmallMobile]);

  const styles = useMemo(
    () => ({
      card: {
        background: '#ffffff',
        borderRadius: isSmallMobile ? '14px' : '16px',
        overflow: 'hidden',
        boxShadow: isHovered ? '0 8px 20px rgba(0, 0, 0, 0.08)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
        transform: isHovered && !isMobile ? 'translateY(-4px)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        width: '100%',
        border: '0.5px solid rgba(0, 0, 0, 0.06)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      },
      imageContainer: {
        position: 'relative',
        width: '100%',
        height: isSmallMobile ? '120px' : isMobile ? '140px' : '180px',
        background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
        overflow: 'hidden',
      },
      image: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center',
        opacity: imageLoaded ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered && !isMobile ? 'scale(1.05)' : 'scale(1)',
      },
      discountBadge: {
        position: 'absolute',
        top: '8px',
        left: '8px',
        background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
        color: '#ffffff',
        padding: isSmallMobile ? '3px 8px' : '4px 10px',
        borderRadius: '8px',
        fontSize: isSmallMobile ? '9px' : '10px',
        fontWeight: '600',
        zIndex: 3,
        letterSpacing: '-0.05px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
      actionButtons: {
        position: 'absolute',
        bottom: '8px',
        right: '8px',
        display: 'flex',
        gap: '6px',
        zIndex: 2,
      },
      actionButton: {
        background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
        border: 'none',
        borderRadius: '10px',
        width: isSmallMobile ? '32px' : '36px',
        height: isSmallMobile ? '32px' : '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        WebkitTapHighlightColor: 'transparent',
      },
      actionButtonDisabled: {
        background: 'rgba(156, 163, 175, 0.7)',
        cursor: 'not-allowed',
        boxShadow: 'none',
      },
      content: {
        padding: isSmallMobile ? '10px' : '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: isSmallMobile ? '4px' : '6px',
      },
      category: {
        fontSize: isSmallMobile ? '9px' : '10px',
        color: '#6b7280',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
      },
      title: {
        fontSize: isSmallMobile ? '14px' : '15px',
        fontWeight: '500',
        color: '#1f2937',
        lineHeight: '1.3',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: '2.6em',
        letterSpacing: '-0.2px',
      },
      ratingContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        background: 'rgba(0, 0, 0, 0.02)',
        borderRadius: '8px',
        width: 'fit-content',
      },
      ratingStars: {
        display: 'flex',
        gap: '1px',
      },
      ratingText: {
        fontSize: isSmallMobile ? '9px' : '10px',
        color: '#6b7280',
        fontWeight: '500',
        letterSpacing: '-0.05px',
      },
      priceContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'auto',
        paddingTop: '4px',
      },
      priceInfo: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '2px',
      },
      currentPrice: {
        fontSize: isSmallMobile ? '15px' : '16px',
        fontWeight: '600',
        color: salePrice ? 'var(--primary-color)' : '#1f2937',
        letterSpacing: '-0.3px',
      },
      originalPrice: {
        fontSize: isSmallMobile ? '10px' : '11px',
        color: '#9ca3af',
        textDecoration: 'line-through',
        fontWeight: '400',
        letterSpacing: '-0.1px',
      },
      mobileActionButtons: {
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
      },
      mobileActionButton: {
        background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
        border: 'none',
        borderRadius: '8px',
        width: isSmallMobile ? '28px' : '30px',
        height: isSmallMobile ? '28px' : '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
        WebkitTapHighlightColor: 'transparent',
      },
      mobileActionButtonDisabled: {
        background: 'rgba(156, 163, 175, 0.7)',
        cursor: 'not-allowed',
        boxShadow: 'none',
      },
      unavailableBadge: {
        background: 'rgba(107, 114, 128, 0.9)',
        color: '#ffffff',
        padding: isSmallMobile ? '3px 8px' : '4px 10px',
        borderRadius: '8px',
        fontSize: isSmallMobile ? '9px' : '10px',
        fontWeight: '600',
        marginBottom: '4px',
        width: 'fit-content',
        letterSpacing: '-0.05px',
      },
      loadingPlaceholder: {
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      },
      overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease-out',
      },
      popup: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#ffffff',
        borderRadius: '16px',
        padding: isSmallMobile ? '16px' : '20px',
        maxWidth: isSmallMobile ? '90%' : '380px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        zIndex: 1001,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      popupTitle: {
        fontSize: isSmallMobile ? '16px' : '18px',
        fontWeight: '600',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: '16px',
        letterSpacing: '-0.3px',
        lineHeight: '1.3',
      },
      popupSelect: {
        width: '100%',
        padding: '12px 36px 12px 14px',
        fontSize: isSmallMobile ? '14px' : '15px',
        color: '#1f2937',
        border: '0.5px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '10px',
        background: '#ffffff',
        marginBottom: '12px',
        outline: 'none',
        backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        backgroundSize: '14px',
        fontWeight: '400',
        letterSpacing: '-0.1px',
        transition: 'border-color 0.2s ease',
        appearance: 'none',
      },
      popupOptionsContainer: {
        maxHeight: '300px',
        overflowY: 'auto',
        marginBottom: '16px',
        WebkitOverflowScrolling: 'touch',
      },
      optionGroup: {
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        borderRadius: '12px',
        padding: '10px',
        marginBottom: '10px',
        border: '0.5px solid rgba(0, 0, 0, 0.06)',
      },
      groupTitle: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '8px',
        paddingBottom: '6px',
        borderBottom: '0.5px solid rgba(0, 0, 0, 0.06)',
        letterSpacing: '-0.1px',
      },
      optionItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 0',
        fontSize: '14px',
        color: '#1f2937',
        cursor: 'pointer',
        transition: 'background 0.2s ease',
        borderRadius: '6px',
        paddingLeft: '4px',
      },
      checkboxInput: {
        width: '18px',
        height: '18px',
        margin: '0',
        appearance: 'none',
        border: `2px solid #d1d5db`,
        borderRadius: '5px',
        outline: 'none',
        cursor: 'pointer',
        position: 'relative',
        backgroundColor: '#ffffff',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      },
      optionText: {
        flexGrow: '1',
        fontSize: '13px',
        color: '#1f2937',
        fontWeight: '400',
        letterSpacing: '-0.1px',
      },
      optionPrice: {
        color: '#6b7280',
        marginLeft: '4px',
        fontSize: '12px',
        fontWeight: '500',
      },
      optionSelected: {
        fontWeight: '500',
        color: 'var(--primary-color)',
      },
      optionGroupError: {
        border: '1px solid #ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
      },
      popupButtons: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        marginTop: '16px',
      },
      popupButton: {
        flex: 1,
        padding: isSmallMobile ? '10px 16px' : '12px 20px',
        border: 'none',
        borderRadius: '10px',
        fontSize: isSmallMobile ? '14px' : '15px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        letterSpacing: '-0.2px',
        WebkitTapHighlightColor: 'transparent',
      },
      addButton: {
        background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)',
        color: '#ffffff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
      cancelButton: {
        background: '#f3f4f6',
        color: '#1f2937',
      },
    }),
    [isHovered, isMobile, isSmallMobile, imageLoaded, selectedOptions, validationErrors, salePrice]
  );

  const animations = `
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translate(-50%, -45%);
      }
      to { 
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }
    .action-btn:active:not(:disabled) {
      transform: scale(0.9);
    }
    .mobile-action-btn:active:not(:disabled) {
      transform: scale(0.9);
    }
    .popup-btn:active:not(:disabled) {
      transform: scale(0.97);
    }
    .add-btn:active:not(:disabled) {
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    }
    .popup-select:focus {
      border-color: var(--primary-color);
    }
    input[type="checkbox"]:checked {
      border-color: var(--primary-color);
      background: var(--primary-color);
    }
    input[type="checkbox"]:checked::after {
      content: '';
      position: absolute;
      width: 4px;
      height: 8px;
      border: solid #ffffff;
      border-width: 0 2px 2px 0;
      top: 2px;
      left: 5px;
      transform: rotate(45deg);
    }
    @media (hover: hover) {
      .action-btn:hover:not(:disabled) {
        transform: scale(1.05);
      }
      .popup-btn:hover:not(:disabled) {
        transform: translateY(-1px);
      }
      .add-btn:hover:not(:disabled) {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
    }
  `;

  if (!item) {
    return null;
  }

  return (
    <>
      <style>{animations}</style>
      <div
        style={styles.card}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        onClick={isManager ? handleEditProduct : handleViewProduct}
      >
        <div style={styles.imageContainer}>
          {!imageLoaded && <div style={styles.loadingPlaceholder} />}
          <img
            src={imageSrc}
            srcSet={`${imageSrc}?w=180 1x, ${imageSrc}?w=360 2x`}
            alt={item.name || 'Item'}
            style={styles.image}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.target.src = '/placeholder.jpg';
              setImageLoaded(true);
            }}
          />

          {discountPercentage > 0 && (
            <div style={styles.discountBadge}>-{discountPercentage}%</div>
          )}

          {!isMobile && (
            <div style={styles.actionButtons}>
              {isManager ? (
                <button
                  style={styles.actionButton}
                  className="action-btn"
                  onClick={handleEditProduct}
                  title="Edit item"
                  aria-label="Edit item"
                >
                  <EditIcon sx={{ fontSize: isSmallMobile ? 16 : 18, color: '#ffffff' }} />
                </button>
              ) : (
                <>
                  <button
                    style={styles.actionButton}
                    className="action-btn"
                    onClick={handleViewProduct}
                    title="View details"
                    aria-label="View details"
                  >
                    <RemoveRedEyeIcon sx={{ fontSize: isSmallMobile ? 16 : 18, color: '#ffffff' }} />
                  </button>
                  <button
                    style={{
                      ...styles.actionButton,
                      ...(item.availability ? {} : styles.actionButtonDisabled),
                    }}
                    className="action-btn"
                    onClick={handleAddToCart}
                    title={item.availability ? 'Add to cart' : 'Unavailable'}
                    disabled={!item.availability}
                    aria-label={item.availability ? 'Add to cart' : 'Unavailable'}
                  >
                    <ShoppingCartIcon sx={{ fontSize: isSmallMobile ? 16 : 18, color: '#ffffff' }} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div style={styles.content}>
          {!item.availability && (
            <div style={styles.unavailableBadge}>Unavailable</div>
          )}

          <div style={styles.category}>{item.category_name || (item.type === 'breakfast' ? 'Breakfast' : 'Uncategorized')}</div>

          <h3 style={styles.title}>{item.name || 'Unknown Item'}</h3>

          {(ratingValue > 0 || reviewCount > 0) && (
            <div style={styles.ratingContainer}>
              <div style={styles.ratingStars}>{renderStars}</div>
              <span style={styles.ratingText}>
                {ratingValue.toFixed(1)} ({reviewCount})
              </span>
            </div>
          )}

          <div style={styles.priceContainer}>
            <div style={styles.priceInfo}>
              <span style={styles.currentPrice}>
                {displayPrice} {currency}
              </span>
              {salePrice && (
                <span style={styles.originalPrice}>{regularPrice.toFixed(2)} {currency}</span>
              )}
            </div>

            {isMobile && (
              <div style={styles.mobileActionButtons}>
                {isManager ? (
                  <button
                    style={styles.mobileActionButton}
                    className="mobile-action-btn"
                    onClick={handleEditProduct}
                    title="Edit item"
                    aria-label="Edit item"
                  >
                    <EditIcon sx={{ fontSize: 14, color: '#ffffff' }} />
                  </button>
                ) : (
                  <>
                    <button
                      style={styles.mobileActionButton}
                      className="mobile-action-btn"
                      onClick={handleViewProduct}
                      title="View details"
                      aria-label="View details"
                    >
                      <RemoveRedEyeIcon sx={{ fontSize: 14, color: '#ffffff' }} />
                    </button>
                    <button
                      style={{
                        ...styles.mobileActionButton,
                        ...(item.availability ? {} : styles.mobileActionButtonDisabled),
                      }}
                      className="mobile-action-btn"
                      onClick={handleAddToCart}
                      title={item.availability ? 'Add to cart' : 'Unavailable'}
                      disabled={!item.availability}
                      aria-label={item.availability ? 'Add to cart' : 'Unavailable'}
                    >
                      <ShoppingCartIcon sx={{ fontSize: 14, color: '#ffffff' }} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showOptionPopup && !isManager && (
        <>
          <div
            style={styles.overlay}
            onClick={() => {
              setShowOptionPopup(false);
              setSelectedOptions({});
              setValidationErrors({});
            }}
          />
          <div style={styles.popup}>
            <h3 style={styles.popupTitle}>
              Choose {item.type === 'breakfast' ? 'options' : 'supplement'} for {item.name}
            </h3>
            {item.type === 'breakfast' && supplements.optionGroups?.length > 0 && (
              <div style={styles.popupOptionsContainer}>
                {supplements.optionGroups.map((group) => (
                  <div
                    key={group.id}
                    style={{
                      ...styles.optionGroup,
                      ...(validationErrors[group.id] ? styles.optionGroupError : {}),
                    }}
                  >
                    <div style={styles.groupTitle}>
                      {group.title} {group.is_required ? '(Required)' : '(Optional)'}
                      {group.max_selections > 0 && `, Max: ${group.max_selections}`}
                      {validationErrors[group.id] && <span style={{ color: '#ef4444' }}> - Please select</span>}
                    </div>
                    {supplements.options
                      .filter((opt) => opt.group_id === group.id)
                      .map((opt) => (
                        <label
                          key={opt.id}
                          style={styles.optionItem}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedOptions[group.id]?.includes(opt.id)}
                            onChange={() => handleOptionChange(group.id, opt.id)}
                            disabled={!item.availability}
                            style={styles.checkboxInput}
                          />
                          <span
                            style={{
                              ...styles.optionText,
                              ...(selectedOptions[group.id]?.includes(opt.id) ? styles.optionSelected : {}),
                            }}
                          >
                            {opt.option_name}
                            <span style={styles.optionPrice}>
                              +{parseFloat(opt.additional_price || 0).toFixed(2)} {currency}
                            </span>
                          </span>
                        </label>
                      ))}
                  </div>
                ))}
              </div>
            )}
            {item.type !== 'breakfast' && supplements.options.length > 0 && (
              <select
                value={Object.values(selectedOptions)[0] || '0'}
                onChange={(e) => handleOptionChange('supplement', e.target.value)}
                style={styles.popupSelect}
                className="popup-select"
              >
                <option value="0">No supplement</option>
                {supplements.options.map((supplement) => (
                  <option
                    key={supplement.supplement_id}
                    value={supplement.supplement_id}
                  >
                    {supplement.name} (+{parseFloat(supplement.additional_price || 0).toFixed(2)} {currency})
                  </option>
                ))}
              </select>
            )}
            <div style={styles.popupButtons}>
              <button
                style={{ ...styles.popupButton, ...styles.addButton }}
                className="popup-btn add-btn"
                onClick={() => handleOptionSelection()}
                disabled={
                  !item.availability ||
                  (item.type === 'breakfast' &&
                    supplements.optionGroups?.length > 0 &&
                    supplements.optionGroups
                      .filter((g) => g.is_required)
                      .some((g) => !selectedOptions[g.id] || selectedOptions[g.id].length === 0))
                }
              >
                Add to Cart
              </button>
              <button
                style={{ ...styles.popupButton, ...styles.cancelButton }}
                className="popup-btn cancel-btn"
                onClick={() => {
                  setShowOptionPopup(false);
                  setSelectedOptions({});
                  setValidationErrors({});
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default MenuItemCard;
