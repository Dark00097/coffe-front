import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { AlertTriangle, Coffee, ArrowRight, RotateCw, X } from 'lucide-react';
import './css/CategoryList.css';

function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCloseAnimation, setShowCloseAnimation] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });

    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await api.get('/categories');
        setCategories(response.data || []);
      } catch (error) {
        console.error('Erreur lors de la récupération des catégories:', error);
        toast.error(error.response?.data?.error || 'Échec du chargement des catégories');
        setError('Échec du chargement des catégories.');
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleCategoryClick = useCallback((id) => {
    navigate(`/category/${id}`);
  }, [navigate]);

  const handleClose = useCallback(() => {
    setShowCloseAnimation(true);
    setTimeout(() => {
      navigate(-1);
    }, 200);
  }, [navigate]);

  const categoryItems = useMemo(() => {
    return categories.map((category, index) => (
      <div
        key={category.id}
        className="category-list-card"
        style={{ animationDelay: `${index * 0.05}s` }}
        onClick={() => handleCategoryClick(category.id)}
      >
        <div className="category-list-image-container">
          {category.image_url ? (
            <img
              src={category.image_url}
              alt={category.name}
              className="category-list-image"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                console.error('Erreur lors du chargement de l\'image de la catégorie:', category.image_url);
                e.target.src = '/placeholder.jpg';
              }}
            />
          ) : (
            <div className="category-list-placeholder-image">
              <Coffee size={40} color="#ff8c42" />
            </div>
          )}
          <div className="category-list-image-overlay"></div>
          <div className="category-list-card-badge">
            <ArrowRight size={16} color="#fff" />
          </div>
        </div>
        <div className="category-list-card-content">
          <h3 className="category-list-category-name">{category.name}</h3>
          <p className="category-list-category-description">
            {category.description || 'Découvrez de délicieuses options dans cette catégorie'}
          </p>
        </div>
      </div>
    ));
  }, [categories, handleCategoryClick]);

  if (error) {
    return (
      <div className="category-list-error-container">
        <div className="category-list-error-content">
          <AlertTriangle size={56} color="#ff6b35" className="category-list-error-icon" />
          <h3 className="category-list-error-title">Oups ! Quelque chose s'est mal passé</h3>
          <p className="category-list-error-text">{error}</p>
          <button className="category-list-retry-button" onClick={() => window.location.reload()}>
            <RotateCw size={18} style={{ marginRight: '8px' }} />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="category-list-loading-container">
        <div className="category-list-loading-spinner"></div>
        <p className="category-list-loading-text">Chargement des catégories...</p>
      </div>
    );
  }

  return (
    <div className={`category-list-container ${showCloseAnimation ? 'category-list-container-closing' : ''}`}>
      <div className="category-list-header">
        <div className="category-list-header-content">
          <button 
            className="category-list-close-button"
            onClick={handleClose}
          >
            <X size={20} color="#fff" />
          </button>
          <div className="category-list-title-section">
            <h1 className="category-list-title">Nos catégories</h1>
            <p className="category-list-subtitle">Découvrez ce que nous proposons</p>
          </div>
          <div className="category-list-header-emoji">🍴</div>
        </div>
      </div>
      <div className="category-list-content">
        {categories.length === 0 && !loading && (
          <div className="category-list-empty-state">
            <Coffee size={64} color="#ff8c42" className="category-list-empty-icon" />
            <h3 className="category-list-empty-title">Aucune catégorie pour le moment</h3>
            <p className="category-list-empty-text">Revenez bientôt pour découvrir de nouvelles catégories !</p>
          </div>
        )}
        <div className="category-list-grid">{categoryItems}</div>
      </div>
    </div>
  );
}

export default CategoryList;
