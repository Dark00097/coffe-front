import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
  AddCircleOutline,
  DeleteOutline,
  Edit,
  Close,
  Save,
  Cancel,
  ArrowBack,
  Search,
  FilterList,
  Add,
  Restaurant,
  AttachMoney,
  Category,
  Visibility,
  VisibilityOff,
  Star
} from '@mui/icons-material';
import { Coffee } from 'lucide-react';
import { createFormData } from '../utils/formDataHelper';
import './css/ManageMenuItems.css';

const safeParseDietaryTags = (tags) => {
  if (!tags || typeof tags !== 'string') return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error parsing dietary_tags:', error, { tags });
    return [];
  }
};

function ManageMenuItems() {
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newSupplementId, setNewSupplementId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        const authRes = await api.get('/check-auth');
        if (!authRes.data?.id || authRes.data.role !== 'admin') {
          toast.error('Admin access required');
          navigate('/login');
          return;
        }
        setUser(authRes.data);

        const [menuRes, catRes, supRes] = await Promise.all([
          api.get('/menu-items'),
          api.get('/categories'),
          api.get('/supplements'),
        ]);
        setMenuItems(menuRes.data || []);
        setFilteredItems(menuRes.data || []);
        setCategories(catRes.data || []);
        setSupplements(supRes.data || []);
      } catch (error) {
        console.error('Initialization error:', error);
        toast.error(error.response?.data?.error || 'Failed to load data');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };
    initializeData();
  }, [navigate]);

  useEffect(() => {
    let filtered = menuItems;
    
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category_id === parseInt(selectedCategory));
    }
    
    setFilteredItems(filtered);
  }, [menuItems, searchTerm, selectedCategory]);

  const handleEdit = async (item) => {
    try {
      const supRes = await api.get(`/menu-items/${item.id}/supplements`);
      const regularPriceValue = parseFloat(item.regular_price);
      const salePriceValue = item.sale_price !== null ? parseFloat(item.sale_price) : '';
      setEditingItem({
        id: parseInt(item.id) || 0,
        name: item.name || '',
        description: item.description || '',
        regular_price: isNaN(regularPriceValue) ? '' : regularPriceValue,
        sale_price: isNaN(salePriceValue) ? '' : salePriceValue,
        category_id: parseInt(item.category_id) || '',
        availability: !!item.availability,
        is_best_seller: !!item.is_best_seller,
        dietary_tags: safeParseDietaryTags(item.dietary_tags).join(', ') || '',
        image: null,
        image_url: item.image_url,
        assignedSupplements: supRes.data.map(sup => ({
          supplement_id: parseInt(sup.supplement_id) || 0,
          name: sup.name || '',
          additional_price: parseFloat(sup.additional_price) || 0,
        })),
      });
      setNewSupplementId('');
    } catch (error) {
      console.error('Error fetching supplements:', error);
      toast.error('Failed to load supplement data');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    let newValue;
    if (type === 'checkbox') {
      newValue = checked;
    } else if (type === 'file') {
      newValue = files[0];
    } else if (type === 'number' && (name === 'regular_price' || name === 'sale_price')) {
      newValue = value === '' ? '' : parseFloat(value) || 0;
    } else {
      newValue = value;
    }
    setEditingItem(prev => (prev ? { ...prev, [name]: newValue } : null));
  };

  const handleSupplementChange = (supplementId, field, value) => {
    setEditingItem(prev => {
      if (!prev) return null;
      return {
        ...prev,
        assignedSupplements: prev.assignedSupplements.map(sup =>
          sup.supplement_id === supplementId
            ? { ...sup, [field]: field === 'additional_price' ? parseFloat(value) || 0 : value }
            : sup
        ),
      };
    });
  };

  const handleAddSupplement = () => {
    if (!newSupplementId) {
      toast.error('Please select a supplement');
      return;
    }
    const supplement = supplements.find(s => s.id === parseInt(newSupplementId));
    if (!supplement) {
      toast.error('Invalid supplement selected');
      return;
    }
    if (editingItem?.assignedSupplements.some(s => s.supplement_id === supplement.id)) {
      toast.warn('Supplement already assigned');
      return;
    }
    setEditingItem(prev => {
      if (!prev) return null;
      return {
        ...prev,
        assignedSupplements: [
          ...prev.assignedSupplements,
          {
            supplement_id: supplement.id,
            name: supplement.name,
            additional_price: parseFloat(supplement.price) || 0,
          },
        ],
      };
    });
    setNewSupplementId('');
  };

  const handleRemoveSupplement = async (supplementId) => {
    if (!user) {
      toast.error('You must be logged in to remove supplements');
      return;
    }
    if (!window.confirm('Remove this supplement from the menu item?')) return;
    try {
      setIsSubmitting(true);
      await api.delete(`/menu-items/${editingItem.id}/supplements/${supplementId}`, {
        data: { user_id: user.id }
      });
      setEditingItem(prev => {
        if (!prev) return null;
        return {
          ...prev,
          assignedSupplements: prev.assignedSupplements.filter(
            sup => sup.supplement_id !== supplementId
          ),
        };
      });
      toast.success('Supplement removed');
    } catch (error) {
      console.error('Error removing supplement:', error);
      toast.error(error.response?.data?.error || 'Failed to remove supplement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (isSubmitting) {
      toast.error('Update in progress, please wait');
      return;
    }
    if (!user || !user.id) {
      toast.error('User not authenticated');
      return;
    }
    if (!editingItem) {
      toast.error('No item selected for editing');
      return;
    }

    try {
      setIsSubmitting(true);

      const itemId = parseInt(editingItem.id);
      const userId = parseInt(user.id);
      const name = editingItem.name?.trim();
      const regularPrice = parseFloat(editingItem.regular_price);
      const salePrice = editingItem.sale_price !== '' ? parseFloat(editingItem.sale_price) : null;
      const categoryId = parseInt(editingItem.category_id);
      const dietaryTags = editingItem.dietary_tags?.trim();
      const description = editingItem.description?.trim();
      const availability = editingItem.availability;
      const isBestSeller = editingItem.is_best_seller;

      if (!itemId || isNaN(itemId) || itemId <= 0) {
        throw new Error('Invalid menu item ID');
      }
      if (!userId || isNaN(userId) || userId <= 0) {
        throw new Error('Invalid user ID');
      }
      if (!name) {
        throw new Error('Name is required');
      }
      if (isNaN(regularPrice) || regularPrice <= 0) {
        throw new Error('Regular price must be a positive number');
      }
      if (salePrice !== null && (isNaN(salePrice) || salePrice < 0)) {
        throw new Error('Sale price must be a non-negative number');
      }
      if (!categoryId || isNaN(categoryId) || categoryId <= 0) {
        throw new Error('Category is required');
      }
      if (dietaryTags && !/^[a-zA-Z0-9\s,-]*$/.test(dietaryTags)) {
        throw new Error('Dietary tags must be a comma-separated list');
      }
      if (editingItem.image) {
        if (!['image/jpeg', 'image/png'].includes(editingItem.image.type)) {
          throw new Error('Image must be JPEG or PNG');
        }
        if (editingItem.image.size > 5 * 1024 * 1024) {
          throw new Error('Image size must be less than 5MB');
        }
      }

      const payload = {
        user_id: userId,
        name,
        regular_price: regularPrice,
        sale_price: salePrice,
        category_id: categoryId,
        availability,
        is_best_seller: isBestSeller,
        description: description || '',
        dietary_tags: dietaryTags ? dietaryTags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        image: editingItem.image,
      };

      console.log('Update payload:', payload);

      const formData = createFormData(payload);

      console.log('FormData entries before sending:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value instanceof File ? value.name : value}`);
      }

      await api.put(`/menu-items/${itemId}`, formData);

      const existingSups = (await api.get(`/menu-items/${itemId}/supplements`)).data;
      for (const sup of editingItem.assignedSupplements) {
        const additionalPrice = parseFloat(sup.additional_price);
        if (isNaN(additionalPrice) || additionalPrice < 0) {
          throw new Error(`Invalid additional price for supplement ${sup.name}`);
        }
        if (!sup.supplement_id || !sup.name) {
          throw new Error(`Invalid supplement data for ${sup.name || 'unknown'}`);
        }
        const supPayload = {
          user_id: userId,
          name: sup.name.trim(),
          additional_price: additionalPrice,
          supplement_id: parseInt(sup.supplement_id),
        };
        const isAssigned = existingSups.some(s => s.supplement_id === sup.supplement_id);
        if (isAssigned) {
          await api.put(`/menu-items/${itemId}/supplements/${sup.supplement_id}`, supPayload);
        } else {
          await api.post(`/menu-items/${itemId}/supplements`, supPayload);
        }
      }

      const updatedItems = await api.get('/menu-items');
      setMenuItems(updatedItems.data || []);
      setFilteredItems(updatedItems.data || []);
      setEditingItem(null);
      toast.success('Menu item updated');
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update menu item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = () => {
    setEditingItem({
      id: 0,
      name: '',
      description: '',
      regular_price: '',
      sale_price: '',
      category_id: '',
      availability: true,
      is_best_seller: false,
      dietary_tags: '',
      image: null,
      image_url: null,
      assignedSupplements: [],
    });
    setNewSupplementId('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (isSubmitting) {
      toast.error('Submission in progress, please wait');
      return;
    }
    if (!user || !user.id) {
      toast.error('User not authenticated');
      return;
    }
    if (!editingItem) {
      toast.error('No item selected for creation');
      return;
    }

    try {
      setIsSubmitting(true);

      const userId = parseInt(user.id);
      const name = editingItem.name?.trim();
      const regularPrice = parseFloat(editingItem.regular_price);
      const salePrice = editingItem.sale_price !== '' ? parseFloat(editingItem.sale_price) : null;
      const categoryId = parseInt(editingItem.category_id);
      const dietaryTags = editingItem.dietary_tags?.trim();
      const description = editingItem.description?.trim();
      const availability = editingItem.availability;
      const isBestSeller = editingItem.is_best_seller;

      if (!userId || isNaN(userId) || userId <= 0) {
        throw new Error('Invalid user ID');
      }
      if (!name) {
        throw new Error('Name is required');
      }
      if (isNaN(regularPrice) || regularPrice <= 0) {
        throw new Error('Regular price must be a positive number');
      }
      if (salePrice !== null && (isNaN(salePrice) || salePrice < 0)) {
        throw new Error('Sale price must be a non-negative number');
      }
      if (!categoryId || isNaN(categoryId) || categoryId <= 0) {
        throw new Error('Category is required');
      }
      if (dietaryTags && !/^[a-zA-Z0-9\s,-]*$/.test(dietaryTags)) {
        throw new Error('Dietary tags must be a comma-separated list');
      }
      if (editingItem.image) {
        if (!['image/jpeg', 'image/png'].includes(editingItem.image.type)) {
          throw new Error('Image must be JPEG or PNG');
        }
        if (editingItem.image.size > 5 * 1024 * 1024) {
          throw new Error('Image size must be less than 5MB');
        }
      }

      const payload = {
        user_id: userId,
        name,
        regular_price: regularPrice,
        sale_price: salePrice,
        category_id: categoryId,
        availability,
        is_best_seller: isBestSeller,
        description: description || '',
        dietary_tags: dietaryTags ? dietaryTags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        image: editingItem.image,
      };

      console.log('Create payload:', payload);

      const formData = createFormData(payload);

      console.log('FormData entries before sending:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value instanceof File ? value.name : value}`);
      }

      const response = await api.post('/menu-items', formData);
      const newItemId = response.data.id;

      for (const sup of editingItem.assignedSupplements) {
        const additionalPrice = parseFloat(sup.additional_price);
        if (isNaN(additionalPrice) || additionalPrice < 0) {
          throw new Error(`Invalid additional price for supplement ${sup.name}`);
        }
        if (!sup.supplement_id || !sup.name) {
          throw new Error(`Invalid supplement data for ${sup.name || 'unknown'}`);
        }
        const supPayload = {
          user_id: userId,
          name: sup.name.trim(),
          additional_price: additionalPrice,
          supplement_id: parseInt(sup.supplement_id),
        };
        await api.post(`/menu-items/${newItemId}/supplements`, supPayload);
      }

      const updatedItems = await api.get('/menu-items');
      setMenuItems(updatedItems.data || []);
      setFilteredItems(updatedItems.data || []);
      setEditingItem(null);
      toast.success('Menu item created');
    } catch (error) {
      console.error('Create error:', error);
      toast.error(error.message || 'Failed to create menu item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!user) {
      toast.error('You must be logged in to delete items');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;

    try {
      setIsSubmitting(true);
      await api.delete(`/menu-items/${id}`, { data: { user_id: user.id } });
      const updatedItems = await api.get('/menu-items');
      setMenuItems(updatedItems.data || []);
      setFilteredItems(updatedItems.data || []);
      toast.success('Menu item deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete menu item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (id, currentAvailability) => {
    if (!user) {
      toast.error('You must be logged in to update availability');
      return;
    }
    try {
      setIsSubmitting(true);
      await api.put(`/menu-items/${id}/availability`, {
        user_id: user.id,
        availability: !currentAvailability,
      });
      const updatedItems = await api.get('/menu-items');
      setMenuItems(updatedItems.data || []);
      setFilteredItems(updatedItems.data || []);
      toast.success('Availability updated');
    } catch (error) {
      console.error('Toggle availability error:', error);
      toast.error(error.response?.data?.error || 'Failed to update availability');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryFilter = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleCancel = () => {
    setEditingItem(null);
    setNewSupplementId('');
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading menu items...</p>
      </div>
    );
  }

  return (
    <div className="manage-menu-items">
      <div className="header">
        <button
          className="back-button"
          onClick={() => navigate('/admin')}
          disabled={isSubmitting}
          title="Back to Admin Dashboard"
        >
          <ArrowBack />
        </button>
        <h1>Manage Menu Items</h1>
        <button
          className="add-button"
          onClick={handleAdd}
          disabled={isSubmitting}
          title="Add New Menu Item"
        >
          <AddCircleOutline /> Add Item
        </button>
      </div>

      <div className="filters">
        <div className="search-bar">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={handleSearch}
            disabled={isSubmitting}
          />
        </div>
        <div className="category-filter">
          <FilterList className="filter-icon" />
          <select
            value={selectedCategory}
            onChange={handleCategoryFilter}
            disabled={isSubmitting}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {editingItem && (
        <div className="edit-form-container">
          <h2>{editingItem.id === 0 ? 'Add New Menu Item' : 'Edit Menu Item'}</h2>
          <form
            onSubmit={editingItem.id === 0 ? handleCreate : handleUpdate}
            className="edit-form"
            encType="multipart/form-data"
          >
            <div className="form-group">
              <label>
                <Restaurant className="form-icon" /> Name
              </label>
              <input
                type="text"
                name="name"
                value={editingItem.name}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={editingItem.description}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>
                <AttachMoney className="form-icon" /> Regular Price
              </label>
              <input
                type="number"
                name="regular_price"
                value={editingItem.regular_price}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>
                <AttachMoney className="form-icon" /> Sale Price (optional)
              </label>
              <input
                type="number"
                name="sale_price"
                value={editingItem.sale_price}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>
                <Category className="form-icon" /> Category
              </label>
              <select
                name="category_id"
                value={editingItem.category_id}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>
                <Visibility className="form-icon" /> Availability
              </label>
              <input
                type="checkbox"
                name="availability"
                checked={editingItem.availability}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>
                <Star className="form-icon" /> Best Seller
              </label>
              <input
                type="checkbox"
                name="is_best_seller"
                checked={editingItem.is_best_seller}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>Dietary Tags (comma-separated)</label>
              <input
                type="text"
                name="dietary_tags"
                value={editingItem.dietary_tags}
                onChange={handleInputChange}
                placeholder="e.g., Vegan, Gluten-Free"
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>Image</label>
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png"
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              {editingItem.image_url && !(editingItem.image instanceof File) && (
                <div className="menu-item-image-container">
                  <img
                    src={editingItem.image_url}
                    alt="Current"
                    className="preview-image"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      console.error('Error loading menu item image:', editingItem.image_url);
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="menu-item-placeholder-image" style={{ display: 'none' }}>
                    <Coffee size={40} color="#ff8c42" />
                  </div>
                </div>
              )}
              <div className="menu-item-no-image" style={{ display: editingItem.image_url ? 'none' : 'flex' }}>
                No Image Available
              </div>
            </div>
            <div className="form-group">
              <label>Assign Supplements</label>
              <div className="supplement-assignment">
                <select
                  value={newSupplementId}
                  onChange={(e) => setNewSupplementId(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Select Supplement</option>
                  {supplements.map(sup => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name} (${sup.price})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddSupplement}
                  disabled={isSubmitting}
                  className="add-supplement-button"
                >
                  <Add /> Add
                </button>
              </div>
              {editingItem.assignedSupplements.map(sup => (
                <div key={sup.supplement_id} className="supplement-item">
                  <input
                    type="text"
                    value={sup.name}
                    onChange={(e) => handleSupplementChange(sup.supplement_id, 'name', e.target.value)}
                    disabled={isSubmitting}
                  />
                  <input
                    type="number"
                    value={sup.additional_price}
                    onChange={(e) => handleSupplementChange(sup.supplement_id, 'additional_price', e.target.value)}
                    step="0.01"
                    min="0"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSupplement(sup.supplement_id)}
                    disabled={isSubmitting}
                    className="remove-supplement-button"
                  >
                    <Close />
                  </button>
                </div>
              ))}
            </div>
            <div className="form-actions">
              <button type="submit" disabled={isSubmitting}>
                <Save /> {editingItem.id === 0 ? 'Create' : 'Update'}
              </button>
              <button type="button" onClick={handleCancel} disabled={isSubmitting}>
                <Cancel /> Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="menu-items-grid">
        {filteredItems.map(item => (
          <div key={item.id} className="menu-item-card">
            <div className="card-header">
              <h3>{item.name}</h3>
              <div className="card-actions">
                <button
                  onClick={() => handleEdit(item)}
                  disabled={isSubmitting}
                  title="Edit Item"
                >
                  <Edit />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={isSubmitting}
                  title="Delete Item"
                >
                  <DeleteOutline />
                </button>
                <button
                  onClick={() => handleToggleAvailability(item.id, item.availability)}
                  disabled={isSubmitting}
                  title={item.availability ? 'Make Unavailable' : 'Make Available'}
                >
                  {item.availability ? <Visibility /> : <VisibilityOff />}
                </button>
              </div>
            </div>
            <div className="card-content">
              {item.image_url && (
                <div className="menu-item-image-container">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="menu-item-image"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      console.error('Error loading menu item image:', item.image_url);
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="menu-item-placeholder-image" style={{ display: 'none' }}>
                    <Coffee size={40} color="#ff8c42" />
                  </div>
                </div>
              )}
              <div className="menu-item-no-image" style={{ display: item.image_url ? 'none' : 'flex' }}>
                No Image Available
              </div>
              <p><strong>Category:</strong> {item.category_name || 'N/A'}</p>
              <p><strong>Regular Price:</strong> ${parseFloat(item.regular_price).toFixed(2)}</p>
              {item.sale_price !== null && (
                <p><strong>Sale Price:</strong> ${parseFloat(item.sale_price).toFixed(2)}</p>
              )}
              <p><strong>Availability:</strong> {item.availability ? 'Available' : 'Unavailable'}</p>
              <p><strong>Best Seller:</strong> {item.is_best_seller ? 'Yes' : 'No'}</p>
              <p><strong>Dietary Tags:</strong> {safeParseDietaryTags(item.dietary_tags).join(', ') || 'None'}</p>
              <p><strong>Description:</strong> {item.description || 'No description'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ManageMenuItems;
