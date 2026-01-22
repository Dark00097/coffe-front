import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { Coffee, Star, Sparkles } from 'lucide-react';

function BestSellers({ addToCart }) {
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [centerIndex, setCenterIndex] = useState(0);
  const [currency, setCurrency] = useState('$');
  const [theme, setTheme] = useState({
    primary_color: '#ff6b35',
    secondary_color: '#ff8c42',
    background_color: '#faf8f5',
    text_color: '#1f2937',
  });
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const itemRefs = useRef([]);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const autoScrollIntervalRef = useRef(null);
  const userInteractionRef = useRef(false);
  const lastUserInteractionRef = useRef(Date.now());
  const lastScrollTime = useRef(0);

  useEffect(() => {
    const fetchBestSellersAndTheme = async () => {
      try {
        setLoading(true);
        const [bestSellersResponse, themeResponse] = await Promise.all([
          api.get('/menu-items/best-sellers'),
          api.getTheme()
        ]);
        setBestSellers(bestSellersResponse.data?.slice(0, 8) || []);
        const updatedTheme = themeResponse.data || theme;
        setTheme(updatedTheme);
        
        if (updatedTheme.currency) {
          console.log('Setting currency to:', updatedTheme.currency);
          setCurrency(updatedTheme.currency);
        }
        
        applyTheme(updatedTheme);
      } catch (error) {
        console.error('Erreur lors de la récupération des meilleurs vendeurs ou du thème:', error);
        toast.error(error.response?.data?.error || 'Échec du chargement des meilleurs vendeurs ou du thème');
      } finally {
        setLoading(false);
      }
    };
    fetchBestSellersAndTheme();
  }, []);

  const applyTheme = useCallback((themeData) => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', themeData.primary_color || '#ff6b35');
    root.style.setProperty('--secondary-color', themeData.secondary_color || '#ff8c42');
    root.style.setProperty('--background-color', themeData.background_color || '#faf8f5');
    root.style.setProperty('--text-color', themeData.text_color || '#1f2937');
  }, []);

  const updateCenterItem = useCallback(() => {
    if (!scrollContainerRef.current || bestSellers.length === 0) return;

    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;

    let closestIndex = 0;
    let closestDistance = Infinity;

    itemRefs.current.forEach((ref, index) => {
      if (ref) {
        const rect = ref.getBoundingClientRect();
        const elementCenter = rect.left + rect.width / 2;
        const distance = Math.abs(containerCenter - elementCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }
    });

    setCenterIndex(closestIndex);
  }, [bestSellers.length]);

  const handleScroll = useCallback(() => {
    const now = performance.now();
    if (now - lastScrollTime.current < 16) return;
    lastScrollTime.current = now;

    if (!isScrollingRef.current) {
      isScrollingRef.current = true;
    }

    userInteractionRef.current = true;
    lastUserInteractionRef.current = now;

    requestAnimationFrame(() => {
      updateCenterItem();

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        setTimeout(() => {
          userInteractionRef.current = false;
        }, 2000);
      }, 100);
    });
  }, [updateCenterItem]);

  const startAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current || bestSellers.length <= 1) return;

    autoScrollIntervalRef.current = setInterval(() => {
      if (!userInteractionRef.current && !isScrollingRef.current && bestSellers.length > 0) {
        const container = scrollContainerRef.current;
        if (!container) return;

        const nextIndex = (centerIndex + 1) % bestSellers.length;
        const targetElement = itemRefs.current[nextIndex];

        if (targetElement) {
          const containerRect = container.getBoundingClientRect();
          const elementRect = targetElement.getBoundingClientRect();
          const scrollLeft = elementRect.left - containerRect.left + container.scrollLeft - (containerRect.width - elementRect.width) / 2;

          requestAnimationFrame(() => {
            container.scrollTo({
              left: scrollLeft,
              behavior: 'smooth',
            });
          });
        }
      }
    }, 3000);
  }, [centerIndex, bestSellers.length]);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  }, []);

  const handleUserInteraction = useCallback(() => {
    userInteractionRef.current = true;
    lastUserInteractionRef.current = Date.now();
    stopAutoScroll();

    setTimeout(() => {
      if (Date.now() - lastUserInteractionRef.current >= 3000) {
        userInteractionRef.current = false;
        startAutoScroll();
      }
    }, 3000);
  }, [startAutoScroll, stopAutoScroll]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('touchstart', handleUserInteraction, { passive: true });
    container.addEventListener('mousedown', handleUserInteraction, { passive: true });

    setTimeout(updateCenterItem, 100);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('touchstart', handleUserInteraction);
      container.removeEventListener('mousedown', handleUserInteraction);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll, updateCenterItem, handleUserInteraction]);

  useEffect(() => {
    if (bestSellers.length > 0 && !loading) {
      const timer = setTimeout(startAutoScroll, 2000);
      return () => {
        clearTimeout(timer);
        stopAutoScroll();
      };
    }
  }, [bestSellers.length, loading, startAutoScroll, stopAutoScroll]);

  useEffect(() => {
    return () => {
      stopAutoScroll();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [stopAutoScroll]);

  const handleItemClick = useCallback((itemId) => {
    handleUserInteraction();
    navigate(`/product/${itemId}`);
  }, [navigate, handleUserInteraction]);

  const bestSellerItems = useMemo(() => {
    return bestSellers.map((item, index) => {
      const isCenter = centerIndex === index;
      const distance = Math.abs(centerIndex - index);
      const opacity = Math.max(0.5, 1 - distance * 0.15);
      
      return (
        <div
          key={item.id}
          ref={(el) => (itemRefs.current[index] = el)}
          style={{
            ...styles.bestSellerItem,
            transform: isCenter ? 'scale(1.1)' : 'scale(0.92)',
            opacity: opacity,
            zIndex: isCenter ? 10 : Math.max(1, 5 - distance),
          }}
          className="best-sellers-item"
          onClick={() => handleItemClick(item.id)}
        >
          <div 
            style={{
              ...styles.bestSellerCard,
              ...(isCenter ? styles.centerItemCard : {}),
              backgroundColor: theme.background_color === '#ffffff' ? '#fafafa' : 'rgba(255, 255, 255, 0.7)',
              backdropFilter: isCenter ? 'blur(10px)' : 'blur(5px)',
            }}
          >
            <div 
              style={{
                ...styles.bestSellerImageContainer,
                ...(isCenter ? styles.centerItemImageContainer : {}),
              }}
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  style={styles.bestSellerImage}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.target.src = '/placeholder.jpg';
                  }}
                />
              ) : (
                <div style={styles.bestSellerPlaceholder}>
                  <Coffee size={isCenter ? 32 : 26} color={theme.primary_color || '#ff6b35'} strokeWidth={1.5} />
                </div>
              )}
              {isCenter && (
                <div style={{ 
                  ...styles.highlightBadge, 
                  background: `linear-gradient(135deg, ${theme.primary_color || '#ff6b35'}, ${theme.secondary_color || '#ff8c42'})` 
                }}>
                  <Sparkles size={10} color="#FFFFFF" strokeWidth={2} />
                </div>
              )}
            </div>
            
            <div style={styles.itemInfo}>
              <h3 
                style={{
                  ...styles.bestSellerName,
                  color: isCenter ? theme.primary_color || '#1f2937' : theme.text_color || '#6b7280',
                  fontSize: isCenter ? '14px' : '13px',
                }}
              >
                {item.name}
              </h3>
              <div
                style={{
                  ...styles.priceContainer,
                  background: isCenter 
                    ? `linear-gradient(135deg, ${theme.primary_color || '#ff6b35'}, ${theme.secondary_color || '#ff8c42'})`
                    : 'rgba(0, 0, 0, 0.04)',
                }}
              >
                <span style={{ 
                  ...styles.price, 
                  color: isCenter ? '#FFFFFF' : theme.text_color || '#1f2937' 
                }}>
                  {parseFloat(item.sale_price || item.regular_price).toFixed(2)}
                </span>
                <span style={{ 
                  ...styles.currency, 
                  color: isCenter ? '#FFFFFF' : theme.text_color || '#1f2937' 
                }}>
                  {' '}{currency}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    });
  }, [bestSellers, centerIndex, theme, currency, handleItemClick]);

  if (loading) {
    return (
      <div style={{ ...styles.loadingContainer, backgroundColor: theme.background_color || '#faf8f5' }}>
        <div style={{ ...styles.loadingSpinner, borderTopColor: theme.primary_color || '#ff6b35' }}></div>
        <p style={{ ...styles.loadingText, color: theme.text_color || '#1f2937' }}>Chargement...</p>
      </div>
    );
  }

  if (bestSellers.length === 0) {
    return null;
  }

  return (
    <>
      <style>{cssStyles(theme)}</style>
      <div style={{ ...styles.bestSellersSection, backgroundColor: theme.background_color || '#faf8f5' }}>
        <div style={styles.bestSellersHeader}>
          <div style={styles.titleContainer}>
            <div style={{ 
              ...styles.iconWrapper,
              background: `linear-gradient(135deg, ${theme.primary_color || '#ff6b35'}, ${theme.secondary_color || '#ff8c42'})` 
            }}>
              <Star size={14} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.5} />
            </div>
            <h2 style={{ ...styles.bestSellersTitle, color: theme.text_color || '#1f2937' }}>Meilleurs Vendeurs</h2>
          </div>
          <div style={styles.indicatorContainer}>
            {bestSellers.map((_, index) => (
              <div
                key={index}
                style={{
                  ...styles.indicator,
                  backgroundColor: centerIndex === index 
                    ? theme.primary_color || '#ff6b35' 
                    : 'rgba(0, 0, 0, 0.15)',
                  transform: centerIndex === index ? 'scale(1)' : 'scale(0.75)',
                }}
              />
            ))}
          </div>
        </div>
        
        <div 
          style={styles.bestSellersScrollContainer}
          ref={scrollContainerRef} 
          className="best-sellers-scroll"
        >
          <div style={styles.bestSellersGrid}>
            {bestSellerItems}
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  bestSellersSection: {
    marginBottom: '20px',
    width: '100%',
    boxSizing: 'border-box',
    paddingTop: '12px',
  },
  bestSellersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingLeft: '16px',
    paddingRight: '16px',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconWrapper: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  },
  bestSellersTitle: {
    fontSize: '19px',
    fontWeight: '600',
    margin: 0,
    letterSpacing: '-0.3px',
    lineHeight: '1.2',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', Roboto, sans-serif",
  },
  indicatorContainer: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: '12px',
  },
  indicator: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  bestSellersScrollContainer: {
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollSnapType: 'x mandatory',
    paddingTop: '8px',
    paddingBottom: '24px',
    paddingLeft: '0',
    paddingRight: '0',
    width: '100%',
    boxSizing: 'border-box',
  },
  bestSellersGrid: {
    display: 'flex',
    gap: '14px',
    minWidth: 'fit-content',
    alignItems: 'center',
    paddingBottom: '8px',
    paddingLeft: 'calc(50% - 55px)',
    paddingRight: 'calc(50% - 55px)',
  },
  bestSellerItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    minWidth: '100px',
    maxWidth: '110px',
    flex: '0 0 auto',
    transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    scrollSnapAlign: 'center',
    willChange: 'transform, opacity',
    backfaceVisibility: 'hidden',
  },
  bestSellerCard: {
    width: '100%',
    borderRadius: '16px',
    padding: '10px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    border: '0.5px solid rgba(0, 0, 0, 0.06)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  centerItemCard: {
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
  },
  bestSellerImageContainer: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
    overflow: 'hidden',
    transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    flexShrink: 0,
    position: 'relative',
    background: 'rgba(0, 0, 0, 0.02)',
    border: '0.5px solid rgba(0, 0, 0, 0.04)',
  },
  centerItemImageContainer: {
    width: '68px',
    height: '68px',
    borderRadius: '18px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  },
  bestSellerImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '14px',
  },
  bestSellerPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '14px',
    background: 'rgba(0, 0, 0, 0.02)',
  },
  highlightBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    border: '2px solid #FFFFFF',
  },
  itemInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    width: '100%',
  },
  bestSellerName: {
    fontWeight: '500',
    textAlign: 'center',
    margin: 0,
    lineHeight: '1.3',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transition: 'all 0.3s ease',
    width: '100%',
    letterSpacing: '-0.2px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Roboto, sans-serif",
  },
  priceContainer: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    borderRadius: '8px',
    padding: '5px 10px',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    minWidth: '50px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
  },
  currency: {
    fontSize: '11px',
    fontWeight: '500',
    transition: 'color 0.3s ease',
    letterSpacing: '-0.1px',
  },
  price: {
    fontSize: '14px',
    fontWeight: '600',
    transition: 'color 0.3s ease',
    letterSpacing: '-0.2px',
  },
  loadingContainer: {
    padding: '32px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '16px',
    margin: '0 16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    border: '0.5px solid rgba(0, 0, 0, 0.06)',
  },
  loadingSpinner: {
    width: '24px',
    height: '24px',
    border: '2px solid rgba(0, 0, 0, 0.1)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginBottom: '12px',
  },
  loadingText: {
    fontSize: '14px',
    fontWeight: '500',
    margin: 0,
    letterSpacing: '-0.2px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Roboto, sans-serif",
  },
};

const cssStyles = (theme) => `
  .best-sellers-scroll::-webkit-scrollbar {
    display: none;
  }

  .best-sellers-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
    overscroll-behavior-x: contain;
  }

  .best-sellers-item {
    will-change: transform, opacity;
    transform-style: preserve-3d;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .best-sellers-item:active {
    transform: scale(0.88) !important;
    transition: transform 0.1s ease !important;
  }

  @media (max-width: 480px) {
    .best-sellers-scroll {
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
    
    .best-sellers-item {
      min-width: 95px !important;
      max-width: 105px !important;
    }
  }

  @media (max-width: 375px) {
    .best-sellers-scroll {
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
    
    .best-sellers-item {
      min-width: 88px !important;
      max-width: 98px !important;
    }
  }

  @media (max-width: 320px) {
    .best-sellers-scroll {
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
    
    .best-sellers-item {
      min-width: 80px !important;
      max-width: 90px !important;
    }
  }

  @media (min-width: 768px) {
    .best-sellers-item {
      min-width: 115px !important;
      max-width: 125px !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .best-sellers-item,
    .best-seller-card,
    .best-sellers-price-container {
      transition: none !important;
    }
    
    .best-sellers-scroll {
      scroll-behavior: auto !important;
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export default BestSellers;
