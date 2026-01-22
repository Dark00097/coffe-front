import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { Search, Coffee } from 'lucide-react';
import MenuItemCard from '../components/MenuItemCard';
import Banner from '../components/Banner';
import TopCategories from '../components/TopCategories';
import BestSellers from '../components/BestSellers';
import debounce from 'lodash/debounce';
import './css/Home.css';

function Home({ addToCart }) {
  const [menuItems, setMenuItems] = useState([]);
  const [breakfastItems, setBreakfastItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const navigate = useNavigate();
  const bannerContainerRef = useRef(null);
  const isMounted = useRef(true);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (query) => {
        if (!isMounted.current) return;
        setSearchLoading(true);
        if (query.trim().length < 2) {
          setFilteredItems(menuItems);
          setSearchLoading(false);
          return;
        }
        try {
          const response = await api.searchMenuItems(query);
          setFilteredItems(response.data || []);
        } catch (error) {
          console.error('Erreur lors de la recherche des éléments du menu :', error);
          toast.error(error.response?.data?.error || 'Échec de la recherche des éléments du menu');
          setFilteredItems([]);
        } finally {
          setSearchLoading(false);
        }
      }, 500),
    [menuItems]
  );

  useEffect(() => {
    let isActive = true;
    const fetchData = async () => {
      try {
        console.log('Récupération des données pour la page d\'accueil', { timestamp: new Date().toISOString() });
        setLoading(true);
        const [menuResponse, breakfastResponse, categoriesResponse, bannersResponse] = await Promise.all([
          api.get('/menu-items'),
          api.getBreakfasts(),
          api.get('/categories'),
          api.getEnabledBanners(),
        ]);

        if (isActive) {
          const menuData = menuResponse.data || [];
          const breakfastData = breakfastResponse.data || [];
          const categoriesData = categoriesResponse.data || [];
          const bannersData = bannersResponse.data || [];

          setMenuItems(menuData);
          setBreakfastItems(breakfastData);
          setCategories([
            { id: 'all', name: 'Tout le menu', image_url: null },
            ...categoriesData,
          ]);
          setFilteredItems(menuData);
          setBanners(bannersData);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données :', error);
        if (isActive) {
          toast.error(error.response?.data?.error || 'Échec du chargement des données');
          setError('Échec du chargement des données.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
          console.log('Récupération des données terminée', { loading: false, timestamp: new Date().toISOString() });
        }
      }
    };
    fetchData();
    return () => {
      isActive = false;
      console.log('Nettoyage de l\'effet Home', { timestamp: new Date().toISOString() });
      debouncedSearch.cancel();
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % banners.length;
        if (bannerContainerRef.current) {
          bannerContainerRef.current.scrollTo({
            left: nextIndex * bannerContainerRef.current.offsetWidth,
            behavior: 'smooth',
          });
        }
        return nextIndex;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [banners.length]);

  const handleViewProduct = useCallback((id, itemType = 'menuItem') => {
    if (itemType === 'breakfast') {
      navigate(`/breakfast/${id}`);
    } else {
      navigate(`/product/${id}`);
    }
  }, [navigate]);

  const handleCategoryClick = useCallback((categoryId) => {
    if (categoryId === 'all') {
      navigate('/categories');
    } else {
      navigate(`/category/${categoryId}`);
    }
  }, [navigate]);

  const categoryItems = useMemo(() => {
    return categories.slice(0, 6).map((category, index) => (
      <div
        key={category.id}
        className="home-category-item"
        style={{ animationDelay: `${index * 0.08}s` }}
        onClick={() => handleCategoryClick(category.id)}
      >
        <div className="home-category-image-container">
          {category.image_url ? (
            <img
              src={category.image_url}
              srcSet={`
                ${category.image_url}?w=72 1x,
                ${category.image_url}?w=144 2x
              `}
              alt={category.name}
              className="home-category-image"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                console.error('Error loading category image:', category.image_url);
                e.target.src = '/placeholder.jpg';
              }}
            />
          ) : (
            <div className="home-category-placeholder">
              <Coffee size={24} color="#8e8e93" />
            </div>
          )}
        </div>
        <p className="home-category-name">{category.name}</p>
      </div>
    ));
  }, [categories, handleCategoryClick]);

  const bannerItems = useMemo(() => {
    return banners.map((banner) => (
      <div key={banner.id} className="home-banner-item">
        <Banner banner={banner} />
      </div>
    ));
  }, [banners]);

  const saleItems = useMemo(() => {
    return [
      ...menuItems,
      ...breakfastItems.map(breakfast => ({
        ...breakfast,
        type: 'breakfast',
      })),
    ]
      .filter((item) => item.sale_price && item.sale_price < item.regular_price)
      .map((item) => (
        <div key={`${item.type || 'menuItem'}-${item.id}`} className="home-sale-item">
          <MenuItemCard
            item={item}
            onAddToCart={addToCart}
            onView={() => handleViewProduct(item.id, item.type || 'menuItem')}
            popupClassName="home-menu-item-popup"
          />
        </div>
      ));
  }, [menuItems, breakfastItems, addToCart, handleViewProduct]);

  const categorySections = useMemo(() => {
    return categories
      .filter((category) => category.id !== 'all')
      .map((category) => {
        const categoryMenuItems = menuItems.filter((item) => item.category_id === category.id);
        const categoryBreakfastItems = breakfastItems
          .filter((breakfast) => breakfast.category_id === category.id)
          .map(breakfast => ({
            ...breakfast,
            type: 'breakfast',
            category_name: category.name,
          }));
        const combinedItems = [...categoryMenuItems, ...categoryBreakfastItems];
        if (combinedItems.length === 0) return null;
        return (
          <div key={category.id} className="home-category-section">
            <div sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <h2 className="home-category-section-title">{category.name}</h2>
              <button
                className="home-see-all-button"
                onClick={() => handleCategoryClick(category.id)}
              >
                Voir tout
              </button>
            </div>
            <div className="home-category-scroll-container">
              <div className="home-category-grid">
                {combinedItems.map((item) => (
                  <div key={`${item.type || 'menuItem'}-${item.id}`} className="home-category-item-scroll">
                    <MenuItemCard
                      item={item}
                      onAddToCart={addToCart}
                      onView={() => handleViewProduct(item.id, item.type || 'menuItem')}
                      popupClassName="home-menu-item-popup"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })
      .filter(Boolean);
  }, [categories, menuItems, breakfastItems, addToCart, handleViewProduct, handleCategoryClick]);

  if (error) {
    return (
      <div className="home-error-container">
        <div className="home-error-content">
          <p className="home-error-text">Erreur: {error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="home-loading-container">
        <div className="home-loading-spinner"></div>
        <p className="home-loading-text">Chargement du menu...</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="home-header">
        <div className="home-welcome-section">
          <div className="home-welcome-content">
            <h1 className="home-welcome-title">Bon retour !</h1>
            <p className="home-welcome-subtitle">Que souhaitez-vous manger aujourd'hui ?</p>
          </div>
          <div className="home-welcome-emoji">🍽️</div>
        </div>

        <div className="home-search-container">
          <div className="home-search-wrapper">
            <Search size={18} color="#8e8e93" className="home-search-icon" />
            <input
              type="text"
              placeholder="Rechercher quelque chose"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="home-search-input"
            />
          </div>
          {searchQuery && filteredItems.length > 0 && !searchLoading && (
            <button
              className="home-clear-results-button"
              onClick={() => setSearchQuery('')}
            >
              Effacer
            </button>
          )}
        </div>

        {searchQuery.trim() ? (
          <div className="home-search-results-section">
            <div className="home-search-results-header">
              <h2 className="home-search-results-title">
                Résultats de recherche pour "{searchQuery}"
              </h2>
              <button
                className="home-see-all-button"
                onClick={() => navigate('/categories')}
              >
                Voir tout
              </button>
            </div>
            {searchLoading ? (
              <div className="home-search-loading">
                <div className="home-loading-spinner"></div>
                <p>Recherche en cours...</p>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="home-search-results-container">
                <div className="home-search-results-grid">
                  {filteredItems.map((item, index) => (
                    <div
                      key={`menuItem-${item.id}`}
                      className="home-search-result-item"
                      style={{ animationDelay: `${index * 0.08}s` }}
                    >
                      <MenuItemCard
                        item={item}
                        onAddToCart={addToCart}
                        onView={() => handleViewProduct(item.id)}
                        popupClassName="home-menu-item-popup"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="home-no-results-text">Aucun résultat trouvé pour "{searchQuery}".</p>
            )}
          </div>
        ) : (
          <div className="home-categories-section">
            <div className="home-categories-header">
              <h2 className="home-categories-title">Catégories</h2>
              <button
                className="home-see-all-button"
                onClick={() => navigate('/categories')}
              >
                Voir tout
              </button>
            </div>
            <div className="home-categories-scroll-container">
              <div className="home-categories-grid">
                {categoryItems}
              </div>
            </div>
          </div>
        )}
      </div>

      {!searchQuery.trim() && (
        <div className="home-action-section">
          {banners.length > 0 && (
            <div className="home-banner-container" ref={bannerContainerRef}>
              <div className="home-banner-grid">
                {bannerItems}
              </div>
            </div>
          )}
          <TopCategories />
          {saleItems.length > 0 && (
            <div className="home-sale-section">
              <div className="home-sale-header">
                <h2 className="home-sale-title">En promotion</h2>
                <button
                  className="home-see-all-button"
                  onClick={() => navigate('/sale')}
                >
                  Voir tout
                </button>
              </div>
              <div className="home-sale-scroll-container">
                <div className="home-sale-grid">
                  {saleItems}
                </div>
              </div>
            </div>
          )}
          {categorySections}
          <BestSellers addToCart={addToCart} />
        </div>
      )}
    </div>
  );
}

export default Home;
