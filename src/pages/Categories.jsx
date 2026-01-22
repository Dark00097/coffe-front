import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CategoryIcon from '@mui/icons-material/Category';
import ImageIcon from '@mui/icons-material/Image';
import StarIcon from '@mui/icons-material/Star';
import { Coffee } from 'lucide-react';
import './css/Categories.css';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', image: null, is_top: false });
  const [editingCategory, setEditingCategory] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get('/check-auth');
        if (res.data.role !== 'admin') {
          toast.error('Admin access required');
          navigate('/login');
        } else {
          setUser(res.data);
        }
      } catch (err) {
        toast.error(err.response?.data?.error || 'Please log in');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data);
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to fetch categories');
      }
    };

    checkAuth();
    fetchCategories();
  }, [navigate]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('name', newCategory.name.trim());
      if (newCategory.description.trim()) {
        formData.append('description', newCategory.description.trim());
      }
      if (newCategory.image) {
        formData.append('image', newCategory.image);
      }
      formData.append('is_top', newCategory.is_top);
      await api.post('/categories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Category added successfully');
      setNewCategory({ name: '', description: '', image: null, is_top: false });
      setShowAddForm(false);
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add category');
    }
  };

  const handleEditCategory = async (e, id) => {
    e.preventDefault();
    if (!editingCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('user_id', user.id);
      formData.append('name', editingCategory.name.trim());
      if (editingCategory.description.trim()) {
        formData.append('description', editingCategory.description.trim());
      }
      if (editingCategory.image instanceof File) {
        formData.append('image', editingCategory.image);
      }
      formData.append('is_top', editingCategory.is_top);
      await api.put(`/categories/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Category updated successfully');
      setEditingCategory(null);
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) return;
    try {
      await api.delete(`/categories/${id}`, { data: { user_id: user.id } });
      toast.success('Category deleted successfully');
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete category');
    }
  };

  if (isLoading || !user) {
    return (
      <div className="categories__container">
        <div className="categories__loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="categories__container">
      <div className="categories__inner-container">
        {/* Header */}
        <div className="categories__header">
          <h1 className="categories__header-title">
            <CategoryIcon className="categories__category-icon" />
            Category Management
          </h1>
          <div className="categories__header-actions">
            <button
              className="categories__button"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <AddIcon className="categories__add-icon" />
              Add Category
            </button>
            <button
              className="categories__button categories__button--secondary"
              onClick={() => navigate('/admin')}
            >
              <ArrowBackIcon className="categories__back-icon" />
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Add Category Form */}
        {showAddForm && (
          <div className="categories__form-card">
            <h2 className="categories__form-title">
              <AddIcon className="categories__add-icon" />
              Add New Category
            </h2>
            <form onSubmit={handleAddCategory} className="categories__form">
              <div className="categories__input-group">
                <label className="categories__label">Category Name *</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="Enter category name"
                  required
                  className="categories__input"
                  onFocus={(e) => e.target.classList.add('categories__input--focused')}
                  onBlur={(e) => e.target.classList.remove('categories__input--focused')}
                />
              </div>
              <div className="categories__input-group">
                <label className="categories__label">Description</label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Enter category description (optional)"
                  className="categories__textarea"
                  onFocus={(e) => e.target.classList.add('categories__textarea--focused')}
                  onBlur={(e) => e.target.classList.remove('categories__textarea--focused')}
                />
              </div>
              <div className="categories__input-group">
                <label className="categories__label">Image</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setNewCategory({ ...newCategory, image: e.target.files[0] })}
                  className="categories__file-input"
                />
              </div>
              <div className="categories__input-group">
                <label className="categories__label">Mark as Top Category</label>
                <div className="categories__checkbox-container">
                  <input
                    type="checkbox"
                    checked={newCategory.is_top}
                    onChange={(e) => setNewCategory({ ...newCategory, is_top: e.target.checked })}
                    className="categories__checkbox"
                  />
                  <span>Feature this category on the homepage</span>
                </div>
              </div>
              <div className="categories__form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewCategory({ name: '', description: '', image: null, is_top: false });
                  }}
                  className="categories__button categories__button--secondary"
                >
                  <CancelIcon className="categories__cancel-icon" />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="categories__button categories__button--success"
                >
                  <SaveIcon className="categories__save-icon" />
                  Add Category
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories Grid */}
        {categories.length === 0 ? (
          <div className="categories__empty-state">
            <CategoryIcon className="categories__empty-state-icon" />
            <div className="categories__empty-state-text">No categories found</div>
            <div className="categories__empty-state-subtext">Create your first category to get started</div>
          </div>
        ) : (
          <div className="categories__grid">
            {categories.map(category => (
              <div key={category.id} className="categories__card">
                {editingCategory?.id === category.id ? (
                  <form onSubmit={(e) => handleEditCategory(e, category.id)} className="categories__form">
                    <div className="categories__input-group">
                      <label className="categories__label">Category Name *</label>
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        placeholder="Enter category name"
                        required
                        className="categories__input"
                        onFocus={(e) => e.target.classList.add('categories__input--focused')}
                        onBlur={(e) => e.target.classList.remove('categories__input--focused')}
                      />
                    </div>
                    <div className="categories__input-group">
                      <label className="categories__label">Description</label>
                      <textarea
                        value={editingCategory.description}
                        onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                        placeholder="Enter category description"
                        className="categories__textarea"
                        onFocus={(e) => e.target.classList.add('categories__textarea--focused')}
                        onBlur={(e) => e.target.classList.remove('categories__textarea--focused')}
                      />
                    </div>
                    <div className="categories__input-group">
                      <label className="categories__label">Image</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setEditingCategory({ ...editingCategory, image: e.target.files[0] })}
                        className="categories__file-input"
                      />
                      {category.image_url && !(editingCategory.image instanceof File) && (
                        <div className="categories__card-image-container">
                          <img 
                            src={category.image_url} 
                            alt="Current" 
                            className="categories__card-image categories__card-image--preview" 
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              console.error('Error loading category image:', category.image_url);
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="categories__card-placeholder-image" style={{ display: 'none' }}>
                            <Coffee size={40} color="#ff8c42" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="categories__input-group">
                      <label className="categories__label">Mark as Top Category</label>
                      <div className="categories__checkbox-container">
                        <input
                          type="checkbox"
                          checked={editingCategory.is_top}
                          onChange={(e) => setEditingCategory({ ...editingCategory, is_top: e.target.checked })}
                          className="categories__checkbox"
                        />
                        <span>Feature this category on the homepage</span>
                      </div>
                    </div>
                    <div className="categories__form-actions">
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="categories__button categories__button--secondary"
                      >
                        <CancelIcon className="categories__cancel-icon" />
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="categories__button categories__button--success"
                      >
                        <SaveIcon className="categories__save-icon" />
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {category.is_top && (
                      <div className="categories__top-badge">
                        <StarIcon className="categories__star-icon" />
                        Top Category
                      </div>
                    )}
                    <h3 className="categories__card-title">{category.name}</h3>
                    {category.description && (
                      <p className="categories__card-description">{category.description}</p>
                    )}
                    {category.image_url && (
                      <div className="categories__card-image-container">
                        <img 
                          src={category.image_url} 
                          alt={category.name} 
                          className="categories__card-image"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            console.error('Error loading category image:', category.image_url);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="categories__card-placeholder-image" style={{ display: 'none' }}>
                          <Coffee size={40} color="#ff8c42" />
                        </div>
                      </div>
                    )}
                    <div className="categories__card-actions">
                      <button
                        onClick={() => setEditingCategory({ 
                          id: category.id, 
                          name: category.name, 
                          description: category.description || '', 
                          image: null, 
                          image_url: category.image_url,
                          is_top: category.is_top
                        })}
                        className="categories__button"
                      >
                        <EditIcon className="categories__edit-icon" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="categories__button categories__button--danger"
                      >
                        <DeleteIcon className="categories__delete-icon" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Categories;
