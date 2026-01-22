import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { ChevronLeft, Coffee, Search } from 'lucide-react';
import debounce from 'lodash/debounce';
import MenuItemCard from '../components/MenuItemCard';
import './css/CategoryMenu.css';

function CategoryMenu({ addToCart }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [categoryImage, setCategoryImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const containerRef = useRef(null);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchCurrentX, setTouchCurrentX] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);

  // Fallback image URL (replace with your actual placeholder image URL)
  const FALLBACK_IMAGE = 'https://res.cloudinary.com/dbvbbtekw/image/upload/v1630000000/Uploads/placeholder.jpg';

  const debouncedSearch = debounce((query) => {
    if (query.trim() === '') {
      setFilteredItems(menuItems);
      return;
    }
    
    const filtered = menuItems.filter(item =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.description?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredItems(filtered);
  }, 300);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchData = async () => {
      try {
        setLoading(true);
        const [menuResponse, categoryResponse, breakfastResponse, categoriesResponse] = await Promise.all([
          api.get(`/menu-items?category_id=${id}`),
          api.get(`/categories/${id}`),
          api.getBreakfasts(),
          api.get('/categories'),
        ]);
        
        const menuData = menuResponse.data || [];
        const categoryData = categoryResponse.data;
        const breakfastData = breakfastResponse.data || [];
        const categoriesData = categoriesResponse.data || [];

        const categoryBreakfasts = breakfastData
          .filter(breakfast => breakfast.category_id === parseInt(id))
          .map(breakfast => ({
            ...breakfast,
            type: 'breakfast',
            category_name: categoryData?.name || 'Petit-déjeuner',
          }));

        const combinedItems = [
          ...menuData,
          ...categoryBreakfasts,
        ];

        setMenuItems(combinedItems);
        setFilteredItems(combinedItems);
        setCategoryName(categoryData?.name || 'Catégorie');
        // Normalize Cloudinary image URL
        const imageUrl = categoryData?.image_url 
          ? categoryData.image_url.startsWith('http') 
            ? categoryData.image_url 
            : `${import.meta.env.VITE_API_URL || 'https://lacoupole-back.onrender.com'}${categoryData.image_url}`
          : null;
        setCategoryImage(imageUrl);
        setCategories(categoriesData);
        
        setTimeout(() => setIsVisible(true), 100);
      } catch (error) {
        console.error('Erreur lors du chargement des données de catégorie :', error);
        toast.error(error.response?.data?.error || 'Échec du chargement du menu ou de la catégorie');
        setError('Échec du chargement de la catégorie ou des éléments du menu.');
        setMenuItems([]);
        setFilteredItems([]);
        setCategoryName('Catégorie');
        setCategories([]);
        setTimeout(() => setIsVisible(true), 100);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchData();
    } else {
      setError('ID de catégorie invalide.');
      setLoading(false);
      setTimeout(() => setIsVisible(true), 100);
    }
  }, [id]);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, menuItems]);

  const handleBack = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      navigate(-1);
    }, 300);
  }, [navigate]);

  const handleView = useCallback((itemId, itemType = 'menuItem') => {
    if (itemType === 'breakfast') {
      navigate(`/breakfast/${itemId}`);
    } else {
      navigate(`/product/${itemId}`);
    }
  }, [navigate]);

  const handleSearchFocus = useCallback(() => {}, []);

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
        containerRef.current.style.transform = `translateX(${boundedDeltaX}px)`;
        containerRef.current.style.transition = 'none';
      }
    },
    [isSwiping, touchStartX, touchCurrentX]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping || window.innerWidth > 768) return;
    setIsSwiping(false);
    const deltaX = touchCurrentX - touchStartX;
    const swipeThreshold = 80;

    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      containerRef.current.style.transform = 'translateX(0)';
    }

    if (categories.length > 0) {
      const currentId = parseInt(id);
      const categoryIds = categories.map(cat => parseInt(cat.id)).sort((a, b) => a - b);
      const currentIndex = categoryIds.indexOf(currentId);

      if (deltaX > swipeThreshold) {
        // Left-to-right swipe: previous category or CategoryList if first
        if (currentIndex === 0) {
          navigate('/categories');
        } else {
          navigate(`/category/${categoryIds[currentIndex - 1]}`);
        }
      } else if (deltaX < -swipeThreshold) {
        // Right-to-left swipe: next category
        if (currentIndex < categoryIds.length - 1) {
          navigate(`/category/${categoryIds[currentIndex + 1]}`);
        }
      }
    }

    setTouchStartX(null);
    setTouchCurrentX(null);
  }, [isSwiping, touchCurrentX, touchStartX, navigate, categories, id]);

  // Handle image load error
  const handleImageError = (e) => {
    e.target.src = FALLBACK_IMAGE;
  };

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      containerRef.current.style.transform = 'translateX(0)';
    }
    setIsSwiping(false);
    setTouchStartX(null);
    setTouchCurrentX(null);
  }, []);

  if (error) {
    return (
      <div
        className="category-menu-error-container"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="category-menu-error-content">
          <Coffee size={64} color="#ff6b35" className="category-menu-error-icon" />
          <p className="category-menu-error-text">{error}</p>
          <button className="category-menu-retry-button" onClick={() => window.location.reload()}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="category-menu-loading-container"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="category-menu-loading-spinner"></div>
        <p className="category-menu-loading-text">Chargement du menu...</p>
      </div>
    );
  }

  return (
    <div
      className={`category-menu-container ${isVisible ? 'category-menu-container--visible' : ''}`}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="category-menu-header">
        <div className="category-menu-header-background">
          {categoryImage ? (
            <img 
              className="category-menu-header-image"
              src={categoryImage}
              alt={categoryName}
              onError={handleImageError}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            />
          ) : (
            <div className="category-menu-header-gradient" />
          )}
          <div className="category-menu-header-overlay" />
        </div>

        <div className="category-menu-header-content">
          <div className="category-menu-nav-bar">
            <button
              className="category-menu-back-button"
              onClick={handleBack}
            >
              <ChevronLeft size={24} color="white" />
            </button>
            <div className="category-menu-header-title">
              <h1 className="category-menu-category-title">{categoryName}</h1>
              <p className="category-menu-category-subtitle">
                {filteredItems.length} article{filteredItems.length !== 1 ? 's' : ''} délicieux disponible{filteredItems.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="category-menu-search-section">
            <div className="category-menu-search-container">
              <div className="category-menu-search-wrapper">
                <Search size={20} color="#8e8e93" className="category-menu-search-icon" />
                <input
                  type="text"
                  placeholder="Rechercher dans cette catégorie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={handleSearchFocus}
                  className="category-menu-search-input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="category-menu-content">
        {searchQuery && (
          <div className="category-menu-search-results">
            <p className="category-menu-search-results-text">
              {filteredItems.length > 0 
                ? `${filteredItems.length} article${filteredItems.length !== 1 ? 's' : ''} trouvé${filteredItems.length !== 1 ? 's' : ''} pour "${searchQuery}"`
                : `Aucun article trouvé pour "${searchQuery}"`
              }
            </p>
          </div>
        )}

        {filteredItems.length === 0 && !loading ? (
          <div className="category-menu-empty-state">
            <div className="category-menu-empty-state-icon">
              <Coffee size={64} color="#8e8e93" />
            </div>
            <h3 className="category-menu-empty-state-title">
              {searchQuery ? 'Aucun article trouvé' : 'Aucun élément de menu disponible'}
            </h3>
            <p className="category-menu-empty-state-text">
              {searchQuery 
                ? 'Ajustez vos termes de recherche ou parcourez tous les éléments.'
                : 'Cette catégorie est actuellement vide. Revenez bientôt pour découvrir de nouveaux articles !'
              }
            </p>
            {searchQuery && (
              <button 
                className="category-menu-clear-search-button"
                onClick={() => setSearchQuery('')}
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <div className="category-menu-grid" style={{ position: 'static' }}>
            {filteredItems.map((item, index) => (
              <MenuItemCard
                key={`${item.type || 'menuItem'}-${item.id}`}
                item={item}
                onAddToCart={addToCart}
                onView={() => handleView(item.id, item.type || 'menuItem')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoryMenu;
