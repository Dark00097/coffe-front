import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { createFormData } from '../utils/formDataHelper';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  Restaurant as RestaurantIcon,
  Description as DescriptionIcon,
  AttachMoney as AttachMoneyIcon,
  Category as CategoryIcon,
  Check as CheckIcon,
  LocalOffer as LocalOfferIcon
} from '@mui/icons-material';
import './css/AddMenuItem.css';

function AddMenuItem() {
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    regular_price: '',
    category_id: '',
    image: null,
    availability: true,
    dietary_tags: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          throw new Error('No token found');
        }
        const res = await api.get('/check-auth', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.data.role !== 'admin') {
          toast.error('Admin access required');
          navigate('/login');
        } else {
          setUser(res.data);
          console.log('User authenticated:', res.data);
        }
      } catch (err) {
        console.error('Auth check failed:', err.response?.data || err.message);
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('sessionId');
        delete api.defaults.headers.common['X-Session-Id'];
        delete api.defaults.headers.common['Authorization'];
        toast.error(err.response?.data?.error || 'Please log in');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
        });
        setCategories(res.data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error(error.response?.data?.error || 'Failed to fetch categories');
      }
    };

    checkAuth();
    fetchCategories();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    const newValue = type === 'checkbox' ? checked : type === 'file' ? files[0] : value;
    setNewItem(prev => ({
      ...prev,
      [name]: newValue,
    }));
    console.log('Input changed:', { name, value: type === 'file' ? files[0]?.name : newValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading || !user) {
      toast.error('Please wait, authentication is still loading');
      return;
    }
    try {
      if (!newItem.name.trim()) {
        toast.error('Name is required');
        return;
      }
      const regular_price = parseFloat(newItem.regular_price);
      if (isNaN(regular_price) || regular_price <= 0) {
        toast.error('Regular price must be a positive number');
        return;
      }
      if (!newItem.category_id) {
        toast.error('Category is required');
        return;
      }
      if (newItem.dietary_tags && !/^[a-zA-Z0-9\s,-]+$/.test(newItem.dietary_tags)) {
        toast.error('Dietary tags must be a comma-separated list of valid tags');
        return;
      }
      if (newItem.image && !['image/jpeg', 'image/png'].includes(newItem.image.type)) {
        toast.error('Image must be JPEG or PNG');
        return;
      }
      if (newItem.image && newItem.image.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      const payload = {
        user_id: user.id,
        name: newItem.name.trim(),
        description: newItem.description || '',
        regular_price: regular_price.toFixed(2),
        category_id: parseInt(newItem.category_id),
        availability: newItem.availability,
        dietary_tags: newItem.dietary_tags || '',
        image: newItem.image || null,
      };

      console.log('FormData payload before creation:', payload);
      const formData = createFormData(payload);

      const response = await api.post('/menu-items', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        },
      });

      console.log('Menu item added:', response.data);
      toast.success('Menu item added');
      setNewItem({
        name: '',
        description: '',
        regular_price: '',
        category_id: '',
        image: null,
        availability: true,
        dietary_tags: '',
      });
      navigate('/admin');
    } catch (error) {
      console.error('Error adding menu item:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('sessionId');
        delete api.defaults.headers.common['X-Session-Id'];
        delete api.defaults.headers.common['Authorization'];
        toast.error('Session expired, please log in again');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.error || 'Failed to add menu item');
      }
    }
  };

  if (isLoading || !user) {
    return (
      <div className="add-menu-item__loading-container">
        <div className="add-menu-item__loading-spinner"></div>
        <p className="add-menu-item__loading-text">Loading...</p>
      </div>
    );
  }

  return (
    <div className="add-menu-item__container">
      <div className="add-menu-item__header">
        <button
          onClick={() => navigate('/admin')}
          className="add-menu-item__back-button"
        >
          <ArrowBackIcon className="add-menu-item__back-icon" />
        </button>
        <div className="add-menu-item__title-section">
          <RestaurantIcon className="add-menu-item__title-icon" />
          <h1 className="add-menu-item__title">Add New Menu Item</h1>
        </div>
      </div>

      <div className="add-menu-item__form-card">
        <form onSubmit={handleSubmit} className="add-menu-item__form">
          <div className="add-menu-item__form-grid">
            {/* Name Field */}
            <div className="add-menu-item__input-group">
              <label className="add-menu-item__label" htmlFor="name">
                <RestaurantIcon className="add-menu-item__label-icon" />
                Item Name *
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={newItem.name}
                onChange={handleInputChange}
                placeholder="Enter item name"
                required
                className="add-menu-item__input"
              />
            </div>

            {/* Price Field */}
            <div className="add-menu-item__input-group">
              <label className="add-menu-item__label" htmlFor="regular_price">
                <AttachMoneyIcon className="add-menu-item__label-icon" />
                Price *
              </label>
              <input
                id="regular_price"
                type="number"
                name="regular_price"
                step="0.01"
                min="0.01"
                value={newItem.regular_price}
                onChange={handleInputChange}
                placeholder="0.00"
                required
                className="add-menu-item__input"
              />
            </div>
          </div>

          {/* Description Field */}
          <div className="add-menu-item__input-group">
            <label className="add-menu-item__label" htmlFor="description">
              <DescriptionIcon className="add-menu-item__label-icon" />
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={newItem.description}
              onChange={handleInputChange}
              placeholder="Describe your menu item..."
              className="add-menu-item__textarea"
            />
          </div>

          <div className="add-menu-item__form-grid">
            {/* Category Field */}
            <div className="add-menu-item__input-group">
              <label className="add-menu-item__label" htmlFor="category_id">
                <CategoryIcon className="add-menu-item__label-icon" />
                Category *
              </label>
              <select
                id="category_id"
                name="category_id"
                value={newItem.category_id}
                onChange={handleInputChange}
                required
                className="add-menu-item__select"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Availability Toggle */}
            <div className="add-menu-item__input-group">
              <label className="add-menu-item__label">
                <CheckIcon className="add-menu-item__label-icon" />
                Availability
              </label>
              <div className="add-menu-item__checkbox-container">
                <label className="add-menu-item__checkbox-label">
                  <input
                    type="checkbox"
                    name="availability"
                    checked={newItem.availability}
                    onChange={handleInputChange}
                    className="add-menu-item__checkbox"
                  />
                  <span className="add-menu-item__checkbox-text">Available for order</span>
                </label>
              </div>
            </div>
          </div>

          {/* Dietary Tags Field */}
          <div className="add-menu-item__input-group">
            <label className="add-menu-item__label" htmlFor="dietary_tags">
              <LocalOfferIcon className="add-menu-item__label-icon" />
              Dietary Tags
            </label>
            <input
              id="dietary_tags"
              type="text"
              name="dietary_tags"
              value={newItem.dietary_tags}
              onChange={handleInputChange}
              placeholder="e.g., vegan, gluten-free, dairy-free"
              className="add-menu-item__input"
            />
            <small className="add-menu-item__helper-text">Separate multiple tags with commas</small>
          </div>

          {/* Image Upload Field */}
          <div className="add-menu-item__input-group">
            <label className="add-menu-item__label" htmlFor="image">
              <CloudUploadIcon className="add-menu-item__label-icon" />
              Item Image
            </label>
            <div className="add-menu-item__file-input-container">
              <input
                id="image"
                type="file"
                name="image"
                accept="image/jpeg,image/png"
                onChange={handleInputChange}
                className="add-menu-item__file-input"
              />
              <label htmlFor="image" className="add-menu-item__file-input-label">
                <CloudUploadIcon className="add-menu-item__upload-icon" />
                {newItem.image ? newItem.image.name : 'Choose image file'}
              </label>
            </div>
            <small className="add-menu-item__helper-text">JPEG or PNG format, max 5MB</small>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !user || user.role !== 'admin'}
            className="add-menu-item__submit-button"
          >
            <AddIcon className="add-menu-item__button-icon" />
            Add Menu Item
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddMenuItem;