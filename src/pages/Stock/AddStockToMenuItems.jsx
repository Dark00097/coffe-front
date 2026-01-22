import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { toast } from 'react-toastify';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { PlusCircleIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Coffee } from 'lucide-react';
import './css/AddStockToMenuItems.css';

const AddStockToMenuItems = () => {
  // State management
  const [items, setItems] = useState({ menuItems: [], breakfasts: [], supplements: [], options: [] });
  const [ingredients, setIngredients] = useState([]);
  const [stockData, setStockData] = useState({ menuItems: [], breakfasts: [], supplements: [], options: [] });
  const [filterData, setFilterData] = useState({
    itemType: 'all',
    itemId: '',
    ingredientId: '',
  });
  const [addModal, setAddModal] = useState({ open: false, itemType: '', itemId: null });
  const [editModal, setEditModal] = useState({ open: false, itemType: '', itemId: null, ingredients: [], selectedIngredient: null });
  const [newIngredient, setNewIngredient] = useState({ ingredientId: '', quantity: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs for modal focus management
  const addModalRef = useRef(null);
  const editModalRef = useRef(null);

  // Function to get user_id from JWT
  const getUserIdFromToken = () => {
    const token = localStorage.getItem('jwt_token');
    if (!token || token === 'null' || token === 'undefined' || !token.trim()) {
      console.error('No valid JWT token found');
      return null;
    }
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
      return null;
    }
  };

  // Validate token before making requests
  const validateToken = () => {
    const token = localStorage.getItem('jwt_token');
    if (!token || token === 'null' || token === 'undefined' || !token.trim()) {
      setError('No valid authentication token found. Please log in again.');
      toast.error('Please log in again.');
      window.location.href = '/login';
      return false;
    }
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
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < currentTime) {
        setError('Authentication token has expired. Please log in again.');
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('deviceId');
        window.location.href = '/login';
        return false;
      }
      return true;
    } catch (error) {
      setError('Invalid authentication token. Please log in again.');
      toast.error('Invalid token. Please log in again.');
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('sessionId');
      localStorage.removeItem('deviceId');
      window.location.href = '/login';
      return false;
    }
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!validateToken()) return;

      setIsLoading(true);
      setError(null);
      try {
        const user_id = getUserIdFromToken();
        if (!user_id) {
          throw new Error('User ID not found. Please log in again.');
        }

        const [menuRes, breakfastRes, supplementRes, optionRes, ingredientRes, stockRes] = await Promise.all([
          api.get('/menu-items'),
          api.get('/breakfasts'),
          api.get('/supplements'),
          api.get('/breakfast-options'),
          api.getIngredients({ user_id }),
          api.getStockDashboard({ user_id }),
        ]);
        setItems({
          menuItems: menuRes.data || [],
          breakfasts: breakfastRes.data || [],
          supplements: supplementRes.data || [],
          options: optionRes.data || [],
        });
        setIngredients(ingredientRes.data || []);
        setStockData({
          menuItems: stockRes.data.associations?.menuItems || [],
          breakfasts: stockRes.data.associations?.breakfasts || [],
          supplements: stockRes.data.associations?.supplements || [],
          options: stockRes.data.associations?.breakfastOptions || [],
        });
      } catch (error) {
        console.error('Error fetching data:', error.response?.data || error.message);
        setError(error.response?.data?.error || 'Failed to fetch items or ingredients');
        toast.error(error.response?.data?.error || 'Failed to fetch items or ingredients');
        if (error.response?.status === 403) {
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('sessionId');
          localStorage.removeItem('deviceId');
          window.location.href = '/login';
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle filter changes
  const handleFilterChange = (e) => {
    setFilterData({ ...filterData, [e.target.name]: e.target.value });
  };

  // Handle new ingredient input changes
  const handleNewIngredientChange = (e) => {
    setNewIngredient({ ...newIngredient, [e.target.name]: e.target.value });
  };

  // Open add ingredient modal
  const openAddModal = (itemType, itemId) => {
    if (['menuItem', 'breakfast', 'supplement', 'option'].includes(itemType)) {
      setAddModal({ open: true, itemType, itemId });
      setNewIngredient({ ingredientId: '', quantity: '' });
    } else {
      toast.error('Invalid item type');
    }
  };

  // Close add ingredient modal
  const closeAddModal = () => {
    setAddModal({ open: false, itemType: '', itemId: null });
  };

  // Handle adding a new ingredient
  const handleAddIngredient = async (e) => {
    e.preventDefault();
    if (!newIngredient.ingredientId || !newIngredient.quantity) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      const user_id = getUserIdFromToken();
      if (!user_id) {
        throw new Error('User ID not found. Please log in again.');
      }
      const data = {
        ingredient_id: newIngredient.ingredientId,
        quantity: parseFloat(newIngredient.quantity),
        user_id,
      };
      let response;
      switch (addModal.itemType) {
        case 'menuItem':
          response = await api.assignIngredientToMenuItem(addModal.itemId, data);
          break;
        case 'breakfast':
          response = await api.assignIngredientToBreakfast(addModal.itemId, data);
          break;
        case 'supplement':
          response = await api.assignIngredientToSupplement(addModal.itemId, data);
          break;
        case 'option':
          response = await api.assignIngredientToBreakfastOption(addModal.itemId, data);
          break;
        default:
          throw new Error('Invalid item type');
      }
      toast.success('Ingredient assigned successfully');
      closeAddModal();
      const stockRes = await api.getStockDashboard({ user_id });
      setStockData({
        menuItems: stockRes.data.associations?.menuItems || [],
        breakfasts: stockRes.data.associations?.breakfasts || [],
        supplements: stockRes.data.associations?.supplements || [],
        options: stockRes.data.associations?.breakfastOptions || [],
      });
    } catch (error) {
      console.error('Error assigning ingredient:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to assign ingredient');
      if (error.response?.status === 403) {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('deviceId');
        window.location.href = '/login';
      }
    }
  };

  // Open edit ingredient modal
  const openEditModal = (itemType, itemId, assignedIngredients) => {
    if (['menuItem', 'breakfast', 'supplement', 'option'].includes(itemType) && items[itemType + 's']?.length > 0) {
      setEditModal({ open: true, itemType, itemId, ingredients: assignedIngredients, selectedIngredient: null });
    } else {
      toast.error('Cannot open modal: Invalid item type or data not loaded');
    }
  };

  // Close edit ingredient modal
  const closeEditModal = () => {
    setEditModal({ open: false, itemType: '', itemId: null, ingredients: [], selectedIngredient: null });
  };

  // Handle updating an ingredient
  const handleUpdateIngredient = async (ingredientId, quantity) => {
    if (!ingredientId || !quantity) {
      toast.error('Please select an ingredient and enter a quantity');
      return;
    }
    try {
      const user_id = getUserIdFromToken();
      if (!user_id) {
        throw new Error('User ID not found. Please log in again.');
      }
      const data = {
        quantity: parseFloat(quantity),
        user_id,
      };
      let response;
      switch (editModal.itemType) {
        case 'menuItem':
          response = await api.updateIngredientForMenuItem(editModal.itemId, ingredientId, data);
          break;
        case 'breakfast':
          response = await api.updateIngredientForBreakfast(editModal.itemId, ingredientId, data);
          break;
        case 'supplement':
          response = await api.updateIngredientForSupplement(editModal.itemId, ingredientId, data);
          break;
        case 'option':
          response = await api.updateIngredientForBreakfastOption(editModal.itemId, ingredientId, data);
          break;
        default:
          throw new Error('Invalid item type');
      }
      toast.success('Ingredient updated successfully');
      const stockRes = await api.getStockDashboard({ user_id });
      setStockData({
        menuItems: stockRes.data.associations?.menuItems || [],
        breakfasts: stockRes.data.associations?.breakfasts || [],
        supplements: stockRes.data.associations?.supplements || [],
        options: stockRes.data.associations?.breakfastOptions || [],
      });
      setEditModal({ ...editModal, selectedIngredient: null }); // Keep modal open after update
    } catch (error) {
      console.error('Error updating ingredient:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to update ingredient');
      if (error.response?.status === 403) {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('deviceId');
        window.location.href = '/login';
      }
    }
  };

  // Handle removing an ingredient
  const handleRemoveIngredient = async (itemType, itemId, ingredientId) => {
    try {
      const user_id = getUserIdFromToken();
      if (!user_id) {
        throw new Error('User ID not found. Please log in again.');
      }
      const data = { user_id };
      let response;
      switch (itemType) {
        case 'menuItem':
          response = await api.deleteIngredientFromMenuItem(itemId, ingredientId, data);
          break;
        case 'breakfast':
          response = await api.deleteIngredientFromBreakfast(itemId, ingredientId, data);
          break;
        case 'supplement':
          response = await api.deleteIngredientFromSupplement(itemId, ingredientId, data);
          break;
        case 'option':
          response = await api.deleteIngredientFromBreakfastOption(itemId, ingredientId, data);
          break;
        default:
          throw new Error('Invalid item type');
      }
      toast.success('Ingredient removed successfully');
      const stockRes = await api.getStockDashboard({ user_id });
      setStockData({
        menuItems: stockRes.data.associations?.menuItems || [],
        breakfasts: stockRes.data.associations?.breakfasts || [],
        supplements: stockRes.data.associations?.supplements || [],
        options: stockRes.data.associations?.breakfastOptions || [],
      });
    } catch (error) {
      console.error('Error removing ingredient:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Failed to remove ingredient');
      if (error.response?.status === 403) {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('deviceId');
        window.location.href = '/login';
      }
    }
  };

  // Get assigned ingredients for a specific item
  const getAssignedIngredients = (itemType, itemId) => {
    return stockData[itemType + 's']?.filter((assoc) => assoc.id === parseInt(itemId)) || [];
  };

  // Filter items based on selected criteria
  const filteredItems = (type) => {
    if (filterData.itemType !== 'all' && filterData.itemType !== type) return [];
    let result = items[type + 's'];
    if (filterData.itemId) {
      result = result.filter((item) => item.id === parseInt(filterData.itemId));
    }
    if (filterData.ingredientId) {
      const assigned = stockData[type + 's'].filter(
        (assoc) => assoc.ingredient_id === parseInt(filterData.ingredientId)
      );
      const assignedItemIds = new Set(assigned.map((a) => a.id));
      result = result.filter((item) => assignedItemIds.has(item.id));
    }
    return result;
  };

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.href = '/login'}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  return (
    <div className="stock-container">
      <h1 className="main-title">Manage Item Ingredients</h1>

      {/* Filter Form */}
      <div className="filter-card">
        <h2 className="filter-title">Filter Items</h2>
        <div className="filter-grid">
          <div className="filter-group">
            <label className="filter-label">Item Type</label>
            <select
              name="itemType"
              value={filterData.itemType}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="all">All</option>
              <option value="menuItem">Menu Item</option>
              <option value="breakfast">Breakfast</option>
              <option value="supplement">Supplement</option>
              <option value="option">Breakfast Option</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Select Item</label>
            <select
              name="itemId"
              value={filterData.itemId}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">All Items</option>
              {filterData.itemType === 'all' ? (
                <>
                  {items.menuItems.map((item) => (
                    <option key={`menuItem-${item.id}`} value={item.id}>
                      Menu Item: {item.name}
                    </option>
                  ))}
                  {items.breakfasts.map((item) => (
                    <option key={`breakfast-${item.id}`} value={item.id}>
                      Breakfast: {item.name}
                    </option>
                  ))}
                  {items.supplements.map((item) => (
                    <option key={`supplement-${item.id}`} value={item.id}>
                      Supplement: {item.name}
                    </option>
                  ))}
                  {items.options.map((item) => (
                    <option key={`option-${item.id}`} value={item.id}>
                      Option: {item.option_name}
                    </option>
                  ))}
                </>
              ) : (
                items[filterData.itemType + 's'].map((item) => (
                  <option key={item.id} value={item.id}>
                    {filterData.itemType === 'option' ? item.option_name : item.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Ingredient</label>
            <select
              name="ingredientId"
              value={filterData.ingredientId}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">All Ingredients</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>
                  {ingredient.name} ({ingredient.unit})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Menu Items and Breakfasts with Images */}
      {['menuItem', 'breakfast'].map((type) => (
        <div key={type} className="section-container">
          <h2 className="section-title">
            {type === 'menuItem' ? 'Menu Items' : 'Breakfasts'}
          </h2>
          <div className="card-grid">
            {filteredItems(type).map((item) => {
              const assignedIngredients = getAssignedIngredients(type, item.id);
              return (
                <div key={item.id} className="item-card">
                  {item.image_url ? (
                    <div className="item-image-container">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="item-image"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          console.error('Error loading image:', item.image_url);
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="item-placeholder-image" style={{ display: 'none' }}>
                        <Coffee size={40} color="#ff8c42" />
                      </div>
                    </div>
                  ) : (
                    <div className="item-no-image" style={{ display: 'flex' }}>
                      No Image Available
                    </div>
                  )}
                  <div className="item-content">
                    <div className="item-header">
                      <h3 className="item-title">{item.name}</h3>
                      <button
                        onClick={() => openAddModal(type, item.id)}
                        className="add-button"
                        title="Add Ingredient"
                        style={{ padding: '0.25rem' }}
                      >
                        <PlusCircleIcon className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="item-subtitle">
                      {assignedIngredients.length} ingredient{assignedIngredients.length !== 1 ? 's' : ''} assigned
                    </p>
                    {assignedIngredients.length > 0 && (
                      <ul className="ingredient-list">
                        {assignedIngredients.map((assoc) => (
                          <li key={assoc.ingredient_id} className="ingredient-item">
                            <span>{assoc.ingredient_name}: {assoc.quantity} {assoc.unit}</span>
                            <div className="ingredient-actions">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditModal({
                                    ...editModal,
                                    open: true,
                                    itemType: type,
                                    itemId: item.id,
                                    ingredients: assignedIngredients,
                                    selectedIngredient: assoc,
                                  });
                                }}
                                className="action-button edit"
                                title="Edit Ingredient"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveIngredient(type, item.id, assoc.ingredient_id);
                                }}
                                className="action-button delete"
                                title="Remove Ingredient"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(type, item.id, assignedIngredients);
                      }}
                      className="manage-button"
                    >
                      Manage Ingredients
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Supplements and Breakfast Options without Images */}
      {['supplement', 'option'].map((type) => (
        <div key={type} className="section-container">
          <h2 className="section-title">
            {type === 'supplement' ? 'Supplements' : 'Breakfast Options'}
          </h2>
          <div className="list-container">
            {filteredItems(type).map((item) => {
              const assignedIngredients = getAssignedIngredients(type, item.id);
              return (
                <div key={item.id} className="list-item">
                  <div className="list-item-header">
                    <div>
                      <h3 className="list-item-title">
                        {type === 'option' ? item.option_name : item.name}
                      </h3>
                      <p className="list-item-subtitle">
                        {assignedIngredients.length} ingredient{assignedIngredients.length !== 1 ? 's' : ''} assigned
                      </p>
                    </div>
                    <div className="button-group">
                      <button
                        onClick={() => openAddModal(type, item.id)}
                        className="add-button"
                        title="Add Ingredient"
                        style={{ padding: '0.25rem' }}
                      >
                        <PlusCircleIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(type, item.id, assignedIngredients);
                        }}
                        className="manage-button"
                        title="Manage Ingredients"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  {assignedIngredients.length > 0 && (
                    <ul className="ingredient-list">
                      {assignedIngredients.map((assoc) => (
                        <li key={assoc.ingredient_id} className="ingredient-item">
                          <span>{assoc.ingredient_name}: {assoc.quantity} {assoc.unit}</span>
                          <div className="ingredient-actions">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditModal({
                                  ...editModal,
                                  open: true,
                                  itemType: type,
                                  itemId: item.id,
                                  ingredients: assignedIngredients,
                                  selectedIngredient: assoc,
                                });
                              }}
                              className="action-button edit"
                              title="Edit Ingredient"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveIngredient(type, item.id, assoc.ingredient_id);
                              }}
                              className="action-button delete"
                              title="Remove Ingredient"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Add Ingredient Modal */}
      <Transition appear show={addModal.open} as={Fragment}>
        <Dialog as="div" className="modal-overlay" open={addModal.open} onClose={closeAddModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="modal-overlay" />
          </Transition.Child>
          <div className="modal-container">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div ref={addModalRef} className="modal-content">
                <Dialog.Title as="h3" className="modal-title">
                  Add Ingredient to{' '}
                  {addModal.itemType && items[addModal.itemType + 's']
                    ? addModal.itemType === 'option'
                      ? items.options.find((o) => o.id === addModal.itemId)?.option_name || 'Unknown Option'
                      : items[addModal.itemType + 's'].find((i) => i.id === addModal.itemId)?.name || 'Unknown Item'
                    : 'Loading...'}
                </Dialog.Title>
                <form onSubmit={handleAddIngredient} className="modal-form">
                  <div className="form-group">
                    <label className="form-label">Ingredient</label>
                    <select
                      name="ingredientId"
                      value={newIngredient.ingredientId}
                      onChange={handleNewIngredientChange}
                      className="form-input"
                      required
                    >
                      <option value="">Select an ingredient</option>
                      {ingredients.map((ingredient) => (
                        <option key={ingredient.id} value={ingredient.id}>
                          {ingredient.name} ({ingredient.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      value={newIngredient.quantity}
                      onChange={handleNewIngredientChange}
                      className="form-input"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="modal-buttons">
                    <button type="submit" className="btn-primary">
                      <PlusCircleIcon className="h-5 w-5" /> Add Ingredient
                    </button>
                    <button type="button" onClick={closeAddModal} className="btn-secondary">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* Edit Ingredient Modal */}
      <Transition appear show={editModal.open} as={Fragment}>
        <Dialog as="div" className="modal-overlay" open={editModal.open} onClose={closeEditModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="modal-overlay" />
          </Transition.Child>
          <div className="modal-container">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div ref={editModalRef} className="modal-content">
                <Dialog.Title as="h3" className="modal-title">
                  Manage Ingredients for{' '}
                  {editModal.itemType && items[editModal.itemType + 's']
                    ? editModal.itemType === 'option'
                      ? items.options.find((o) => o.id === editModal.itemId)?.option_name || 'Unknown Option'
                      : items[editModal.itemType + 's'].find((i) => i.id === editModal.itemId)?.name || 'Unknown Item'
                    : 'Loading...'}
                </Dialog.Title>
                <div className="modal-body">
                  {editModal.ingredients.length > 0 ? (
                    <ul className="ingredient-list">
                      {editModal.ingredients.map((assoc) => (
                        <li key={assoc.ingredient_id} className="ingredient-item">
                          <div className="ingredient-details">
                            <span>{assoc.ingredient_name}: {assoc.quantity} {assoc.unit}</span>
                          </div>
                          <div className="ingredient-actions">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditModal({
                                  ...editModal,
                                  selectedIngredient: assoc,
                                });
                              }}
                              className="action-button edit"
                              title="Edit Ingredient"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveIngredient(editModal.itemType, editModal.itemId, assoc.ingredient_id);
                              }}
                              className="action-button delete"
                              title="Remove Ingredient"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-ingredients">No ingredients assigned.</p>
                  )}
                  {editModal.selectedIngredient && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdateIngredient(editModal.selectedIngredient.ingredient_id, editModal.selectedIngredient.quantity);
                      }}
                      className="edit-form"
                    >
                      <div className="form-group">
                        <label className="form-label">Ingredient</label>
                        <select
                          value={editModal.selectedIngredient.ingredient_id}
                          onChange={(e) => {
                            const selectedIngredient = ingredients.find((ing) => ing.id === parseInt(e.target.value));
                            if (selectedIngredient) {
                              const newIngredients = editModal.ingredients.map((ing) =>
                                ing.ingredient_id === editModal.selectedIngredient.ingredient_id
                                  ? { ...ing, ingredient_id: e.target.value, ingredient_name: selectedIngredient.name, unit: selectedIngredient.unit }
                                  : ing
                              );
                              setEditModal({
                                ...editModal,
                                ingredients: newIngredients,
                                selectedIngredient: {
                                  ...editModal.selectedIngredient,
                                  ingredient_id: e.target.value,
                                  ingredient_name: selectedIngredient.name,
                                  unit: selectedIngredient.unit,
                                },
                              });
                            }
                          }}
                          className="form-input"
                        >
                          {ingredients.map((ingredient) => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.name} ({ingredient.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Quantity</label>
                        <input
                          type="number"
                          value={editModal.selectedIngredient.quantity}
                          onChange={(e) => {
                            const newIngredients = editModal.ingredients.map((ing) =>
                              ing.ingredient_id === editModal.selectedIngredient.ingredient_id
                                ? { ...ing, quantity: e.target.value }
                                : ing
                            );
                            setEditModal({
                              ...editModal,
                              ingredients: newIngredients,
                              selectedIngredient: {
                                ...editModal.selectedIngredient,
                                quantity: e.target.value,
                              },
                            });
                          }}
                          className="form-input"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="modal-buttons">
                        <button type="submit" className="btn-primary">
                          <PencilIcon className="h-5 w-5" /> Update
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditModal({ ...editModal, selectedIngredient: null });
                          }}
                          className="btn-secondary"
                        >
                          Cancel Edit
                        </button>
                      </div>
                    </form>
                  )}
                </div>
                <div className="modal-buttons">
                  <button onClick={closeEditModal} className="btn-secondary">
                    Close
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default AddStockToMenuItems;
