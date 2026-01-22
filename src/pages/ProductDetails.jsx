import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTransition } from '../contexts/TransitionContext';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { debounce } from 'lodash';
import MenuItemCard from '../components/MenuItemCard';
import {
  ShoppingCartOutlined,
  RemoveOutlined,
  AddOutlined,
  CategoryOutlined,
  CheckCircleOutlined,
  Star,
  RestaurantMenuOutlined,
} from '@mui/icons-material';
import './css/ProductDetails.css';

function ProductDetails({ addToCart }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { transitionData, isTransitioning, endTransition } = useTransition();
  
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [selectedSupplement, setSelectedSupplement] = useState('0');
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(0);
  const [isRatingSubmitted, setIsRating] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchCurrentX, setTouchCurrentX] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const containerRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [currency, setCurrency] = useState('$');
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const fetchData = async () => {
      try {
        setLoading(true);
        const itemId = parseInt(id);
        if (isNaN(itemId) || itemId <= 0) {
          throw new Error('Invalid product ID');
        }

        const [productResponse, relatedResponse, supplementsResponse, ratingResponse, categoriesResponse, themeResponse] = await Promise.all([
          api.get(`/menu-items/${itemId}`),
          api.get(`/menu-items/${itemId}/related`),
          api.getSupplementsByMenuItem(itemId),
          api.getRatingsByItem(itemId),
          api.get('/categories'),
          api.getTheme(),
        ]);

        const categoryResponse = await api.get(`/menu-items?category_id=${productResponse.data.category_id}`);

        setProduct(productResponse.data);
        setRelatedProducts(relatedResponse.data || []);
        setSupplements(supplementsResponse.data || []);
        setCategoryProducts(categoryResponse.data || []);
        setCategories(categoriesResponse.data || []);

        if (themeResponse.data && themeResponse.data.currency) {
          setCurrency(themeResponse.data.currency);
        }

        if (ratingResponse.data?.length > 0) {
          setIsRating(true);
          setRating(parseInt(ratingResponse.data[0].rating) || 0);
        }
        
        // Delay to allow animation to start
        setTimeout(() => {
          setLoading(false);
          endTransition();
        }, 100);
      } catch (error) {
        console.error('Error loading product details:', error);
        toast.error(error.response?.data?.error || 'Failed to load product details');
        setError('Failed to load product details');
        setLoading(false);
        endTransition();
      }
    };
    fetchData();
  }, [id, endTransition]);

  const debouncedRatingSubmit = useMemo(
    () =>
      debounce(async (ratingValue) => {
        if (ratingValue < 1 || ratingValue > 5) {
          toast.error('Please select a rating between 1 and 5');
          return;
        }
        try {
          await api.submitRating({
            item_id: parseInt(id),
            rating: parseInt(ratingValue),
          });
          setIsRating(true);
          toast.success('Rating submitted successfully!');
          const response = await api.get(`/menu-items/${id}`);
          setProduct(response.data);
        } catch (error) {
          console.error('Error submitting rating:', error);
          toast.error(error.response?.data?.error || 'Failed to submit rating');
        }
      }, 500),
    [id]
  );

  const handleAddToCart = useCallback(async () => {
    if (!product) {
      toast.error('Product not loaded');
      return;
    }
    if (!product.availability) {
      toast.error('Item not available');
      return;
    }
    try {
      const selectedSupplementData = selectedSupplement !== '0'
        ? supplements.find((s) => s.supplement_id === parseInt(selectedSupplement))
        : null;
      const itemToAdd = {
        item_id: parseInt(product.id),
        name: product.name || 'Unknown Product',
        unit_price: parseFloat(product.sale_price || product.regular_price) || 0,
        quantity: parseInt(quantity) || 1,
        image_url: product.image_url && product.image_url !== 'null' ? product.image_url : '/placeholder.jpg',
        supplement_id: selectedSupplementData ? parseInt(selectedSupplementData.supplement_id) : null,
        supplement_name: selectedSupplementData ? selectedSupplementData.name : null,
        supplement_price: selectedSupplementData ? parseFloat(selectedSupplementData.additional_price) || 0 : 0,
        cartItemId: `${product.id}-${Date.now()}`,
      };
      await addToCart(itemToAdd);
      toast.success(`${product.name} added to cart!`);
      setSelectedSupplement('0');
      setQuantity(1);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error(error.response?.data?.error || 'Failed to add to cart');
    }
  }, [product, quantity, selectedSupplement, supplements, addToCart]);

  const handleStarClick = useCallback((star) => {
    if (!isRatingSubmitted) {
      setRating(star);
    }
  }, [isRatingSubmitted]);

  const handleViewProduct = useCallback((productId) => {
    navigate(`/product/${productId}`);
  }, [navigate]);

  const calculateTotalPrice = useCallback(() => {
    const basePrice = parseFloat(product?.sale_price || product?.regular_price) || 0;
    const supplementPrice = selectedSupplement !== '0'
      ? parseFloat(supplements.find((s) => s.supplement_id === parseInt(selectedSupplement))?.additional_price) || 0
      : 0;
    return ((basePrice + supplementPrice) * quantity).toFixed(2);
  }, [product, selectedSupplement, supplements, quantity]);

  const handleTouchStart = useCallback((e) => {
    if (window.innerWidth > 768) return;
    setTouchStartX(e.touches[0].clientX);
    setTouchCurrentX(e.touches[0].clientX);
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback(
    (e) => {
      if (!isSwiping || window.innerWidth > 768) return;
      setTouchCurrentX(e.touches[0].clientX);
      const deltaX = touchCurrentX - touchStartX;
      const boundedDeltaX = Math.max(Math.min(deltaX, 150), -150);
      if (containerRef.current) {
        containerRef.current.style.transform = `translate3d(${boundedDeltaX}px, 0, 0)`;
        containerRef.current.style.transition = 'none';
      }
    },
    [isSwiping, touchStartX, touchCurrentX]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isSwiping || window.innerWidth > 768) return;
    setIsSwiping(false);
    const deltaX = touchCurrentX - touchStartX;
    const swipeThreshold = 80;
    const currentIndex = categoryProducts.findIndex((p) => p.id === parseInt(id));

    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
      containerRef.current.style.transform = 'translate3d(0, 0, 0)';
    }

    if (deltaX > swipeThreshold) {
      if (currentIndex === 0 && product?.category_id) {
        navigate(`/category/${product.category_id}`);
      } else if (currentIndex > 0) {
        const prevProduct = categoryProducts[currentIndex - 1];
        navigate(`/product/${prevProduct.id}`);
      }
    } else if (deltaX < -swipeThreshold) {
      if (currentIndex < categoryProducts.length - 1) {
        const nextProduct = categoryProducts[currentIndex + 1];
        navigate(`/product/${nextProduct.id}`);
      } else if (categories.length > 0 && product?.category_id) {
        const categoryIds = categories.map(cat => parseInt(cat.id)).sort((a, b) => a - b);
        let currentCategoryIndex = categoryIds.indexOf(parseInt(product.category_id));
        let nextCategoryId = null;

        while (currentCategoryIndex < categoryIds.length - 1) {
          currentCategoryIndex += 1;
          const candidateCategoryId = categoryIds[currentCategoryIndex];
          try {
            const response = await api.get(`/menu-items?category_id=${candidateCategoryId}`);
            if (response.data && response.data.length > 0) {
              nextCategoryId = candidateCategoryId;
              break;
            }
          } catch (error) {
            console.error(`Error checking category ${candidateCategoryId}:`, error);
          }
        }

        if (nextCategoryId) {
          navigate(`/category/${nextCategoryId}`);
        }
      }
    }

    setTouchStartX(null);
    setTouchCurrentX(null);
  }, [isSwiping, touchCurrentX, touchStartX, categoryProducts, id, navigate, product, categories]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
      containerRef.current.style.transform = 'translate3d(0, 0, 0)';
    }
    setIsSwiping(false);
    setTouchStartX(null);
    setTouchCurrentX(null);
  }, [id]);

  // Animation variants
  const pageVariants = {
    initial: transitionData ? {
      position: 'fixed',
      top: transitionData.startPosition.top,
      left: transitionData.startPosition.left,
      width: transitionData.startPosition.width,
      height: transitionData.startPosition.height,
      borderRadius: '16px',
      overflow: 'hidden',
    } : {
      opacity: 0,
    },
    animate: {
      position: 'relative',
      top: 0,
      left: 0,
      width: '100%',
      height: 'auto',
      opacity: 1,
      borderRadius: '0px',
      transition: {
        duration: 0.6,
        ease: [0.43, 0.13, 0.23, 0.96],
        opacity: { duration: 0.3 },
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.3 },
    },
  };

  const contentVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        delay: transitionData ? 0.35 : 0,
        duration: 0.5,
        ease: [0.43, 0.13, 0.23, 0.96],
      },
    },
  };

  const detailsVariants = {
    initial: { opacity: 0, y: 30 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        delay: transitionData ? 0.45 : 0.1,
        duration: 0.5,
        ease: [0.43, 0.13, 0.23, 0.96],
      },
    },
  };

  const overlayVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        delay: 0.1,
        duration: 0.4,
      },
    },
  };

  if (error) {
    return (
      <motion.div
        className="product-details-container"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="product-details-error-container">
          <div className="product-details-error-icon">🍽️</div>
          <p className="product-details-error-text">{error}</p>
          <button className="product-details-retry-button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <motion.div
        className="product-details-container"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="product-details-loading-container">
          <div className="product-details-loading-spinner"></div>
          <p className="product-details-loading-text">Loading...</p>
        </div>
      </motion.div>
    );
  }

  if (!product) {
    return (
      <motion.div
        className="product-details-container"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="product-details-error-container">
          <div className="product-details-error-icon">🔍</div>
          <p className="product-details-error-text">Product not found</p>
          <button className="product-details-retry-button" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </motion.div>
    );
  }

  const imageSrc = product.image_url && product.image_url !== 'null' ? product.image_url : '/placeholder.jpg';
  const regularPrice = parseFloat(product.regular_price) || 0;
  const salePrice = parseFloat(product.sale_price) || null;
  const averageRating = parseFloat(product.average_rating) || 0;
  const reviewCount = parseInt(product.review_count) || 0;

  return (
    <>
      {/* Background overlay that fades in */}
      <AnimatePresence>
        {isTransitioning && transitionData && (
          <motion.div
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="initial"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.1)',
              zIndex: 999,
              pointerEvents: 'none',
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="product-details-container"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          zIndex: isTransitioning ? 1000 : 'auto',
        }}
      >
        <motion.div 
          className="product-details-image-section"
          layoutId={transitionData && transitionData.itemId === product.id ? `product-image-container-${product.id}` : undefined}
        >
          <div className="product-details-image-container">
            <motion.img
              layoutId={transitionData && transitionData.itemId === product.id ? `product-image-${product.id}` : undefined}
              src={imageSrc}
              srcSet={`${imageSrc}?w=400 1x, ${imageSrc}?w=800 2x`}
              alt={product.name || 'Product'}
              className="product-details-product-image"
              loading="eager"
              decoding="async"
              onError={(e) => {
                e.target.src = '/placeholder.jpg';
              }}
            />
          </div>
        </motion.div>

        <motion.div 
          className="product-details-details-section"
          variants={detailsVariants}
          initial="initial"
          animate="animate"
        >
          <motion.h1 
            className="product-details-product-title"
            layoutId={transitionData && transitionData.itemId === product.id ? `product-title-${product.id}` : undefined}
          >
            {product.name || 'Unknown Product'}
          </motion.h1>

          <motion.div 
            className="product-details-rating-container"
            layoutId={transitionData && transitionData.itemId === product.id ? `product-rating-${product.id}` : undefined}
          >
            <div className="product-details-rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={star <= Math.round(averageRating) ? 'product-details-rating-star-filled' : 'product-details-rating-star'}
                />
              ))}
            </div>
            <span className="product-details-rating-text">
              {averageRating.toFixed(1)} ({reviewCount})
            </span>
          </motion.div>

          <motion.p 
            className="product-details-product-description"
            variants={contentVariants}
          >
            {product.description || 'No description available.'}
          </motion.p>

          <motion.div 
            className="product-details-price-section"
            variants={contentVariants}
          >
            <motion.div 
              className="product-details-price-container"
              layoutId={transitionData && transitionData.itemId === product.id ? `product-price-${product.id}` : undefined}
            >
              {salePrice ? (
                <>
                  <span className="product-details-original-price">{regularPrice.toFixed(2)} {currency}</span>
                  <span className="product-details-sale-price">{salePrice.toFixed(2)} {currency}</span>
                  <span className="product-details-save-badge">-{(regularPrice - salePrice).toFixed(2)} {currency}</span>
                </>
              ) : (
                <span className="product-details-regular-price-only">{regularPrice.toFixed(2)} {currency}</span>
              )}
            </motion.div>
            <div className="product-details-total-price">
              <span className="product-details-total-label">Total</span>
              <span className="product-details-total-amount">{calculateTotalPrice()} {currency}</span>
            </div>
          </motion.div>

          <motion.div 
            className="product-details-options-card"
            variants={contentVariants}
          >
            <div className="product-details-option-row">
              <div className="product-details-option-left">
                <CheckCircleOutlined
                  style={{ fontSize: '18px' }}
                  className={product.availability ? 'text-green-500' : 'text-red-500'}
                />
                <span className="product-details-option-label">Availability</span>
              </div>
              <span className="product-details-option-value">
                {product.availability ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            {product.dietary_tags && product.dietary_tags !== '[]' && (
              <div className="product-details-option-row">
                <div className="product-details-option-left">
                  <RestaurantMenuOutlined style={{ fontSize: '18px' }} className="text-orange-500" />
                  <span className="product-details-option-label">Dietary</span>
                </div>
                <span className="product-details-option-value">
                  {JSON.parse(product.dietary_tags || '[]').join(', ') || 'None'}
                </span>
              </div>
            )}

            {supplements.length > 0 && (
              <div className="product-details-option-row">
                <div className="product-details-option-left">
                  <CategoryOutlined style={{ fontSize: '18px' }} className="text-orange-500" />
                  <span className="product-details-option-label">Supplement</span>
                </div>
                <select
                  value={selectedSupplement}
                  onChange={(e) => setSelectedSupplement(e.target.value)}
                  className="product-details-supplement-select"
                >
                  <option value="0">None</option>
                  {supplements.map((s) => (
                    <option key={s.supplement_id} value={s.supplement_id}>
                      {s.name} (+{parseFloat(s.additional_price || 0).toFixed(2)} {currency})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="product-details-option-row">
              <div className="product-details-option-left">
                <Star style={{ fontSize: '18px' }} className="text-yellow-400" />
                <span className="product-details-option-label">Your Rating</span>
              </div>
              <div className="product-details-user-rating-container">
                <div className="product-details-user-rating-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={star <= rating ? 'product-details-user-rating-star-filled' : 'product-details-user-rating-star'}
                      onClick={() => handleStarClick(star)}
                    />
                  ))}
                </div>
                {!isRatingSubmitted && rating > 0 && (
                  <button
                    className="product-details-rating-submit-button"
                    onClick={() => debouncedRatingSubmit(rating)}
                  >
                    Submit
                  </button>
                )}
                {isRatingSubmitted && <span className="product-details-rating-thank-you">Thank you!</span>}
              </div>
            </div>

            <div className="product-details-option-row">
              <div className="product-details-option-left">
                <span className="product-details-option-label">Quantity</span>
              </div>
              <div className="product-details-quantity-container">
                <button
                  className="product-details-quantity-button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || !product.availability}
                  aria-label="Decrease quantity"
                >
                  <RemoveOutlined style={{ fontSize: '18px' }} />
                </button>
                <span className="product-details-quantity-display">{quantity}</span>
                <button
                  className="product-details-quantity-button"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={!product.availability}
                  aria-label="Increase quantity"
                >
                  <AddOutlined style={{ fontSize: '18px' }} />
                </button>
              </div>
            </div>
          </motion.div>

          <motion.button
            className="product-details-add-to-cart-button"
            onClick={handleAddToCart}
            disabled={!product.availability}
            variants={contentVariants}
            whileTap={{ scale: 0.97 }}
          >
            <ShoppingCartOutlined style={{ fontSize: '20px' }} />
            {product.availability ? `Add to Cart · ${calculateTotalPrice()} ${currency}` : 'Unavailable'}
          </motion.button>
        </motion.div>

        {relatedProducts.length > 0 && (
          <motion.div 
            className="product-details-related-section"
            variants={contentVariants}
            initial="initial"
            animate="animate"
          >
            <h2 className="product-details-section-title">You may also like</h2>
            <div className="product-details-related-grid">
              {relatedProducts.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <MenuItemCard 
                    item={item} 
                    onAddToCart={addToCart} 
                    onView={handleViewProduct} 
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}

export default ProductDetails;
