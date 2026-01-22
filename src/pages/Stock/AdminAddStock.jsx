import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { toast } from 'react-toastify';
import './css/AdminAddStock.css';

const AdminAddStock = () => {
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    quantity_in_stock: 0,
    low_stock_threshold: 0,
  });
  const [ingredients, setIngredients] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Function to get user_id from JWT
  const getUserIdFromToken = () => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        return decoded.id;
      } catch (error) {
        console.error('Error decoding JWT:', error.message);
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('deviceId');
        window.location.href = '/login';
        return null;
      }
    }
    return null;
  };

  // Fetch ingredients on component mount
  useEffect(() => {
    const fetchIngredients = async () => {
      setLoading(true);
      try {
        const user_id = getUserIdFromToken();
        if (!user_id) {
          throw new Error('User ID not found. Please log in again.');
        }
        const response = await api.getIngredients({ user_id });
        setIngredients(response.data);
      } catch (error) {
        console.error('Error fetching ingredients:', error.response?.data || error.message);
        toast.error(error.response?.data?.error || 'Failed to load ingredients');
        if (error.response?.status === 403) {
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('sessionId');
          localStorage.removeItem('deviceId');
          window.location.href = '/login';
        }
      } finally {
        setLoading(false);
      }
    };
    fetchIngredients();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user_id = getUserIdFromToken();
      if (!user_id) {
        throw new Error('User ID not found. Please log in again.');
      }
      const data = {
        ...formData,
        quantity_in_stock: parseFloat(formData.quantity_in_stock),
        low_stock_threshold: parseFloat(formData.low_stock_threshold),
        user_id,
      };
      if (editingId) {
        await api.updateIngredient(editingId, data);
        toast.success('Ingredient updated successfully');
        setIngredients(ingredients.map((item) =>
          item.id === editingId ? { ...item, ...data } : item
        ));
      } else {
        const response = await api.addIngredient(data);
        toast.success('Ingredient added successfully');
        setIngredients([...ingredients, { id: response.data.id, ...data }]);
      }
      setFormData({ name: '', unit: '', quantity_in_stock: 0, low_stock_threshold: 0 });
      setEditingId(null);
    } catch (error) {
      console.error('Error saving ingredient:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to save ingredient');
      if (error.response?.status === 403) {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('deviceId');
        window.location.href = '/login';
      }
    }
  };

  const handleEdit = (ingredient) => {
    setFormData({
      name: ingredient.name,
      unit: ingredient.unit,
      quantity_in_stock: ingredient.quantity_in_stock,
      low_stock_threshold: ingredient.low_stock_threshold,
    });
    setEditingId(ingredient.id);
  };

  const handleCancel = () => {
    setFormData({ name: '', unit: '', quantity_in_stock: 0, low_stock_threshold: 0 });
    setEditingId(null);
  };

  return (
    <div className="admin-add-stock-container">
      <h1 className="admin-add-stock-title">Add/Edit Ingredient</h1>
      
      {/* Form for adding/editing ingredients */}
      <form onSubmit={handleSubmit} className="admin-add-stock-form">
        <div className="admin-add-stock-form-group">
          <label className="admin-add-stock-label">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="admin-add-stock-input"
            required
          />
        </div>
        <div className="admin-add-stock-form-group">
          <label className="admin-add-stock-label">Unit (e.g., ml, g, kg)</label>
          <input
            type="text"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="admin-add-stock-input"
            required
          />
        </div>
        <div className="admin-add-stock-form-group">
          <label className="admin-add-stock-label">Quantity in Stock</label>
          <input
            type="number"
            name="quantity_in_stock"
            value={formData.quantity_in_stock}
            onChange={handleChange}
            className="admin-add-stock-input"
            min="0"
            step="0.01"
            required
          />
        </div>
        <div className="admin-add-stock-form-group">
          <label className="admin-add-stock-label">Low Stock Threshold</label>
          <input
            type="number"
            name="low_stock_threshold"
            value={formData.low_stock_threshold}
            onChange={handleChange}
            className="admin-add-stock-input"
            min="0"
            step="0.01"
            required
          />
        </div>
        <div className="admin-add-stock-button-group">
          <button
            type="submit"
            className="admin-add-stock-submit-button"
          >
            {editingId ? 'Update Ingredient' : 'Add Ingredient'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="admin-add-stock-cancel-button"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Display list of ingredients */}
      <h2 className="admin-add-stock-subtitle">Ingredients List</h2>
      {loading ? (
        <p className="admin-add-stock-loading">Loading ingredients...</p>
      ) : ingredients.length === 0 ? (
        <p className="admin-add-stock-no-data">No ingredients found.</p>
      ) : (
        <div className="admin-add-stock-table-wrapper">
          <table className="admin-add-stock-table">
            <thead>
              <tr>
                <th className="admin-add-stock-table-header">Name</th>
                <th className="admin-add-stock-table-header">Unit</th>
                <th className="admin-add-stock-table-header">Quantity in Stock</th>
                <th className="admin-add-stock-table-header">Low Stock Threshold</th>
                <th className="admin-add-stock-table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ingredient) => (
                <tr key={ingredient.id} className="admin-add-stock-table-row">
                  <td className="admin-add-stock-table-cell">{ingredient.name}</td>
                  <td className="admin-add-stock-table-cell">{ingredient.unit}</td>
                  <td className="admin-add-stock-table-cell">{ingredient.quantity_in_stock}</td>
                  <td className="admin-add-stock-table-cell">{ingredient.low_stock_threshold}</td>
                  <td className="admin-add-stock-table-cell">
                    <button
                      onClick={() => handleEdit(ingredient)}
                      className="admin-add-stock-edit-button"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminAddStock;
