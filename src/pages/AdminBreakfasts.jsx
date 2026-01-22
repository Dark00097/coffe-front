import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import {
  AddCircleOutline,
  DeleteOutline,
  Edit,
  Save,
  Cancel,
  ArrowBack,
  Restaurant,
  Category as CategoryIcon
} from '@mui/icons-material';
import { Coffee } from 'lucide-react';
import './css/AdminBreakfasts.css';

function AdminBreakfasts() {
  const [breakfasts, setBreakfasts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reusableOptionGroups, setReusableOptionGroups] = useState([]);
  const [editingBreakfast, setEditingBreakfast] = useState(null);
  const [newOption, setNewOption] = useState({ group_id: '', option_type: '', option_name: '', additional_price: '' });
  const [newOptionGroup, setNewOptionGroup] = useState({ title: '', is_required: true, max_selections: '1' });
  const [editingOptionGroup, setEditingOptionGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [formErrors, setFormErrors] = useState({ name: '', price: '' });
  const navigate = useNavigate();

  const fetchBreakfastDetails = async (breakfast) => {
    const [optionsRes, groupsRes] = await Promise.all([
      api.getBreakfastOptions(breakfast.id),
      api.getBreakfastOptionGroups(breakfast.id)
    ]);
    return {
      ...breakfast,
      options: (optionsRes.data || []).map(opt => ({
        ...opt,
        additional_price: parseFloat(opt.additional_price) || 0
      })),
      optionGroups: (groupsRes.data || []).filter(g => g.breakfast_id === breakfast.id),
      reusable_option_groups: Array.isArray(groupsRes.data) 
        ? (groupsRes.data || []).filter(g => !g.breakfast_id).map(g => g.id)
        : []
    };
  };

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
        setUserId(authRes.data.id);
        const [breakfastRes, categoriesRes, reusableGroupsRes] = await Promise.all([
          api.getBreakfasts(),
          api.get('/categories'),
          api.getReusableOptionGroups()
        ]);
        const breakfastsWithDetails = await Promise.all(
          breakfastRes.data.map(breakfast => fetchBreakfastDetails(breakfast))
        );
        setBreakfasts(breakfastsWithDetails);
        setCategories(categoriesRes.data || []);
        setReusableOptionGroups(reusableGroupsRes.data || []);
      } catch (error) {
        toast.error('Failed to load data');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };
    initializeData();
  }, [navigate]);

  const handleEdit = (breakfast) => {
    setEditingBreakfast({
      id: breakfast.id,
      name: breakfast.name || '',
      description: breakfast.description || '',
      price: breakfast.price ? String(breakfast.price) : '',
      availability: !!breakfast.availability,
      image: null,
      image_url: breakfast.image_url,
      category_id: breakfast.category_id || '',
      options: breakfast.options.map(opt => ({
        ...opt,
        additional_price: parseFloat(opt.additional_price) || 0
      })),
      optionGroups: breakfast.optionGroups || [],
      reusable_option_groups: Array.isArray(breakfast.reusable_option_groups) 
        ? breakfast.reusable_option_groups 
        : []
    });
    setFormErrors({ name: '', price: '' });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (name === 'reusable_option_groups') {
      const groupId = Number(value);
      setEditingBreakfast(prev => {
        const currentGroups = Array.isArray(prev.reusable_option_groups) 
          ? [...prev.reusable_option_groups] 
          : [];
        if (checked) {
          if (!currentGroups.includes(groupId)) {
            return {
              ...prev,
              reusable_option_groups: [...currentGroups, groupId]
            };
          }
        } else {
          return {
            ...prev,
            reusable_option_groups: currentGroups.filter(id => id !== groupId)
          };
        }
        return prev;
      });
    } else {
      setEditingBreakfast(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked :
                type === 'file' ? files[0] :
                type === 'number' && name === 'category_id' ? (value === '' ? '' : parseInt(value)) :
                value
      }));
      setFormErrors(prev => ({
        ...prev,
        [name]: validateField(name, value)
      }));
    }
  };

  const validateField = (name, value) => {
    if (name === 'name') {
      return value && value.trim() ? '' : 'Name is required';
    }
    if (name === 'price') {
      return value && !isNaN(parseFloat(value)) && parseFloat(value) > 0 ? '' : 'Valid price is required';
    }
    return '';
  };

  const handleOptionChange = (e) => {
    const { name, value } = e.target;
    setNewOption(prev => ({
      ...prev,
      [name]: name === 'additional_price' ? (value === '' ? '' : parseFloat(value)) :
              name === 'group_id' ? (value === '' ? '' : parseInt(value)) : value
    }));
  };

  const handleOptionGroupChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewOptionGroup(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
              name === 'max_selections' ? (value === '' ? '1' : parseInt(value)) : value
    }));
  };

  const handleEditOptionGroupChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingOptionGroup(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
              name === 'max_selections' ? (value === '' ? '1' : parseInt(value)) : value
    }));
  };

  const handleAddOptionGroup = async () => {
    if (!newOptionGroup.title.trim()) {
      toast.error('Option group title is required');
      return;
    }
    const maxSelections = parseInt(newOptionGroup.max_selections) || 1;
    if (maxSelections < 0) {
      toast.error('Max selections must be a non-negative number');
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        user_id: String(userId),
        title: newOptionGroup.title.trim(),
        is_required: newOptionGroup.is_required,
        max_selections: String(maxSelections)
      };
      await api.addBreakfastOptionGroup(editingBreakfast.id, payload);
      toast.success('Option group added');
      setNewOptionGroup({ title: '', is_required: true, max_selections: '1' });
      const groupsRes = await api.getBreakfastOptionGroups(editingBreakfast.id);
      setEditingBreakfast(prev => ({
        ...prev,
        optionGroups: groupsRes.data || []
      }));
      await refreshBreakfasts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add option group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOptionGroup = (group) => {
    setEditingOptionGroup({
      id: group.id,
      title: group.title,
      is_required: group.is_required,
      max_selections: String(group.max_selections)
    });
  };

  const handleUpdateOptionGroup = async (groupId) => {
    if (!editingOptionGroup.title.trim()) {
      toast.error('Option group title is required');
      return;
    }
    const maxSelections = parseInt(editingOptionGroup.max_selections) || 1;
    if (maxSelections < 0) {
      toast.error('Max selections must be a non-negative number');
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        user_id: String(userId),
        title: editingOptionGroup.title.trim(),
        is_required: editingOptionGroup.is_required,
        max_selections: String(maxSelections)
      };
      await api.updateBreakfastOptionGroup(editingBreakfast.id, groupId, payload);
      toast.success('Option group updated');
      setEditingOptionGroup(null);
      const groupsRes = await api.getBreakfastOptionGroups(editingBreakfast.id);
      setEditingBreakfast(prev => ({
        ...prev,
        optionGroups: groupsRes.data || []
      }));
      await refreshBreakfasts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update option group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveOptionGroup = async (groupId) => {
    if (!window.confirm('Remove this option group? This will also remove associated options.')) return;
    try {
      setIsSubmitting(true);
      await api.deleteBreakfastOptionGroup(editingBreakfast.id, groupId, { user_id: String(userId) });
      toast.success('Option group removed');
      const [groupsRes, optionsRes] = await Promise.all([
        api.getBreakfastOptionGroups(editingBreakfast.id),
        api.getBreakfastOptions(editingBreakfast.id)
      ]);
      setEditingBreakfast(prev => ({
        ...prev,
        optionGroups: (groupsRes.data || []).filter(g => g.breakfast_id === editingBreakfast.id),
        options: (optionsRes.data || []).map(opt => ({
          ...opt,
          additional_price: parseFloat(opt.additional_price) || 0
        })),
        reusable_option_groups: Array.isArray(groupsRes.data) 
          ? (groupsRes.data || []).filter(g => !g.breakfast_id).map(g => g.id)
          : []
      }));
      await refreshBreakfasts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove option group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveReusableOptionGroup = async (groupId) => {
    if (!window.confirm('Remove this reusable option group from this breakfast?')) return;
    try {
      setIsSubmitting(true);
      await api.deleteBreakfastOptionGroup(editingBreakfast.id, groupId, { user_id: String(userId) });
      toast.success('Reusable option group removed from breakfast');
      setEditingBreakfast(prev => ({
        ...prev,
        reusable_option_groups: Array.isArray(prev.reusable_option_groups) 
          ? prev.reusable_option_groups.filter(id => id !== groupId)
          : []
      }));
      const groupsRes = await api.getBreakfastOptionGroups(editingBreakfast.id);
      setEditingBreakfast(prev => ({
        ...prev,
        optionGroups: (groupsRes.data || []).filter(g => g.breakfast_id === editingBreakfast.id),
        reusable_option_groups: Array.isArray(groupsRes.data) 
          ? (groupsRes.data || []).filter(g => !g.breakfast_id).map(g => g.id)
          : []
      }));
      await refreshBreakfasts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove reusable option group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddOption = async () => {
    if (!newOption.group_id || !newOption.option_type.trim() || !newOption.option_name.trim() || newOption.additional_price === '') {
      toast.error('All option fields are required');
      return;
    }
    if (!editingBreakfast.optionGroups.length) {
      toast.error('Create at least one option group first');
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        user_id: String(userId),
        group_id: newOption.group_id,
        option_type: newOption.option_type.trim(),
        option_name: newOption.option_name.trim(),
        additional_price: newOption.additional_price
      };
      await api.addBreakfastOption(editingBreakfast.id, payload);
      toast.success('Option added');
      setNewOption({ group_id: '', option_type: '', option_name: '', additional_price: '' });
      const optionsRes = await api.getBreakfastOptions(editingBreakfast.id);
      setEditingBreakfast(prev => ({
        ...prev,
        options: (optionsRes.data || []).map(opt => ({
          ...opt,
          additional_price: parseFloat(opt.additional_price) || 0
        }))
      }));
      await refreshBreakfasts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add option');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveOption = async (optionId) => {
    if (!window.confirm('Remove this option?')) return;
    try {
      setIsSubmitting(true);
      await api.deleteBreakfastOption(editingBreakfast.id, optionId, { user_id: String(userId) });
      toast.success('Option removed');
      const optionsRes = await api.getBreakfastOptions(editingBreakfast.id);
      setEditingBreakfast(prev => ({
        ...prev,
        options: (optionsRes.data || []).map(opt => ({
          ...opt,
          additional_price: parseFloat(opt.additional_price) || 0
        }))
      }));
      await refreshBreakfasts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove option');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const errors = {
      name: validateField('name', editingBreakfast.name),
      price: validateField('price', editingBreakfast.price)
    };
    setFormErrors(errors);
    if (errors.name || errors.price) {
      toast.error('Please fix form errors before submitting');
      return;
    }
    if (editingBreakfast.category_id && isNaN(parseInt(editingBreakfast.category_id))) {
      toast.error('Invalid category selected');
      return;
    }
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('user_id', String(userId));
      formData.append('name', editingBreakfast.name.trim());
      formData.append('description', editingBreakfast.description || '');
      formData.append('price', editingBreakfast.price || '');
      formData.append('availability', String(editingBreakfast.availability));
      if (editingBreakfast.category_id) {
        formData.append('category_id', String(editingBreakfast.category_id));
      }
      if (editingBreakfast.image) {
        formData.append('image', editingBreakfast.image);
      }
      formData.append('option_groups', JSON.stringify(editingBreakfast.optionGroups));
      formData.append('reusable_option_groups', JSON.stringify(Array.isArray(editingBreakfast.reusable_option_groups) ? editingBreakfast.reusable_option_groups : []));
      if (editingBreakfast.id) {
        await api.updateBreakfast(editingBreakfast.id, formData);
        toast.success('Breakfast updated');
      } else {
        await api.addBreakfast(formData);
        toast.success('Breakfast added');
      }
      setEditingBreakfast(null);
      setFormErrors({ name: '', price: '' });
      await refreshBreakfasts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save breakfast');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this breakfast?')) return;
    try {
      setIsSubmitting(true);
      await api.deleteBreakfast(id, { user_id: String(userId) });
      toast.success('Breakfast deleted');
      await refreshBreakfasts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete breakfast');
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshBreakfasts = async () => {
    const breakfastRes = await api.getBreakfasts();
    const breakfastsWithDetails = await Promise.all(
      breakfastRes.data.map(breakfast => fetchBreakfastDetails(breakfast))
    );
    setBreakfasts(breakfastsWithDetails);
  };

  const handleCancel = () => {
    setEditingBreakfast(null);
    setNewOption({ group_id: '', option_type: '', option_name: '', additional_price: '' });
    setNewOptionGroup({ title: '', is_required: true, max_selections: '1' });
    setEditingOptionGroup(null);
    setFormErrors({ name: '', price: '' });
  };

  if (isLoading) {
    return (
      <div className="admin-breakfasts__container">
        <div className="admin-breakfasts__loading">
          <Restaurant className="admin-breakfasts__loading-icon" />
          Loading breakfasts...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-breakfasts__container">
      <div className="admin-breakfasts__header">
        <h1 className="admin-breakfasts__header-title">
          <Coffee />
          Manage Breakfasts
        </h1>
        <p className="admin-breakfasts__header-subtitle">
          Create, update, and manage breakfast items, option groups, and their options
        </p>
        <button 
          className="admin-breakfasts__back-button"
          onClick={() => navigate('/admin')}
        >
          <ArrowBack />
          Back to Dashboard
        </button>
      </div>

      <div className="admin-breakfasts__controls-section">
        <button
          className="admin-breakfasts__primary-button"
          onClick={() => setEditingBreakfast({
            id: null,
            name: '',
            description: '',
            price: '',
            availability: true,
            image: null,
            image_url: null,
            category_id: '',
            options: [],
            optionGroups: [],
            reusable_option_groups: []
          })}
        >
          <AddCircleOutline />
          Add New Breakfast
        </button>
        <button
          className="admin-breakfasts__primary-button"
          onClick={() => navigate('/admin/reusable-option-groups')}
        >
          <AddCircleOutline />
          Manage Reusable Option Groups
        </button>
      </div>

      {editingBreakfast && (
        <div className="admin-breakfasts__item-card-editing">
          <form onSubmit={handleUpdate}>
            <div className="admin-breakfasts__form-section">
              <div className="admin-breakfasts__form-group">
                <label className="admin-breakfasts__form-label">
                  Breakfast Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={editingBreakfast.name || ''}
                  onChange={handleInputChange}
                  placeholder="Enter breakfast name"
                  required
                  className="admin-breakfasts__form-input"
                />
                {formErrors.name && (
                  <span className="admin-breakfasts__error">{formErrors.name}</span>
                )}
              </div>
              <div className="admin-breakfasts__form-group">
                <label className="admin-breakfasts__form-label">
                  Description
                </label>
                <textarea
                  name="description"
                  value={editingBreakfast.description || ''}
                  onChange={handleInputChange}
                  placeholder="Enter description"
                  className="admin-breakfasts__form-textarea"
                />
              </div>
              <div className="admin-breakfasts__form-group">
                <label className="admin-breakfasts__form-label">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="price"
                  value={editingBreakfast.price || ''}
                  onChange={handleInputChange}
                  placeholder="Enter price (e.g., 10.00)"
                  required
                  className="admin-breakfasts__form-input"
                />
                {formErrors.price && (
                  <span className="admin-breakfasts__error">{formErrors.price}</span>
                )}
              </div>
              <div className="admin-breakfasts__form-group">
                <label className="admin-breakfasts__form-label">
                  <CategoryIcon fontSize="small" />
                  Category
                </label>
                <select
                  name="category_id"
                  value={editingBreakfast.category_id || ''}
                  onChange={handleInputChange}
                  className="admin-breakfasts__form-select"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="admin-breakfasts__form-group">
                <label className="admin-breakfasts__form-label">Image Upload</label>
                <input
                  type="file"
                  name="image"
                  accept="image/jpeg,image/png"
                  onChange={handleInputChange}
                  className="admin-breakfasts__form-input"
                />
                {editingBreakfast.image_url && !(editingBreakfast.image instanceof File) && (
                  <div className="admin-breakfasts__image-container">
                    <img
                      src={editingBreakfast.image_url}
                      alt={editingBreakfast.name}
                      className="admin-breakfasts__item-image"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        console.error('Error loading breakfast image:', editingBreakfast.image_url);
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="admin-breakfasts__placeholder-image" style={{ display: 'none' }}>
                      <Coffee size={40} color="#ff8c42" />
                    </div>
                  </div>
                )}
                <div className="admin-breakfasts__no-image" style={{ display: editingBreakfast.image_url ? 'none' : 'flex' }}>
                  No Image Available
                </div>
              </div>
              <div className="admin-breakfasts__form-group">
                <div className="admin-breakfasts__checkbox-container">
                  <input
                    type="checkbox"
                    name="availability"
                    checked={editingBreakfast.availability}
                    onChange={handleInputChange}
                    className="admin-breakfasts__checkbox"
                  />
                  <label className="admin-breakfasts__form-label">Available</label>
                </div>
              </div>
              {editingBreakfast.id && (
                <>
                  <div className="admin-breakfasts__form-group">
                    <label className="admin-breakfasts__form-label">Reusable Option Groups</label>
                    <div className="admin-breakfasts__reusable-groups-container">
                      {reusableOptionGroups.length > 0 ? (
                        reusableOptionGroups.map(group => (
                          <div key={group.id} className="admin-breakfasts__reusable-group-item">
                            <div className="admin-breakfasts__checkbox-container">
                              <input
                                type="checkbox"
                                name="reusable_option_groups"
                                value={group.id}
                                checked={Array.isArray(editingBreakfast.reusable_option_groups) && editingBreakfast.reusable_option_groups.includes(group.id)}
                                onChange={handleInputChange}
                                className="admin-breakfasts__checkbox"
                              />
                              <label className="admin-breakfasts__form-label">
                                {group.title} {group.is_required ? '(Required)' : '(Optional)'}, Max: {group.max_selections || 'Unlimited'}
                              </label>
                            </div>
                            {Array.isArray(editingBreakfast.reusable_option_groups) && editingBreakfast.reusable_option_groups.includes(group.id) && (
                              <button
                                type="button"
                                onClick={() => handleRemoveReusableOptionGroup(group.id)}
                                className="admin-breakfasts__danger-button"
                                disabled={isSubmitting}
                              >
                                <DeleteOutline fontSize="small" />
                                Remove
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div>No reusable option groups available</div>
                      )}
                    </div>
                  </div>
                  <div className="admin-breakfasts__option-section">
                    <label className="admin-breakfasts__form-label">Option Groups</label>
                    <div className="admin-breakfasts__option-grid admin-breakfasts__option-grid--group">
                      <input
                        type="text"
                        name="title"
                        value={newOptionGroup.title}
                        onChange={handleOptionGroupChange}
                        placeholder="Option Group Title (e.g., Beverage)"
                        className="admin-breakfasts__form-input"
                      />
                      <div className="admin-breakfasts__checkbox-container">
                        <input
                          type="checkbox"
                          name="is_required"
                          checked={newOptionGroup.is_required}
                          onChange={handleOptionGroupChange}
                          className="admin-breakfasts__checkbox"
                        />
                        <label className="admin-breakfasts__form-label">Required</label>
                      </div>
                      <input
                        type="number"
                        name="max_selections"
                        min="0"
                        value={newOptionGroup.max_selections}
                        onChange={handleOptionGroupChange}
                        placeholder="Max Selections"
                        className="admin-breakfasts__form-input"
                      />
                      <button
                        type="button"
                        onClick={handleAddOptionGroup}
                        className="admin-breakfasts__primary-button"
                        disabled={isSubmitting}
                      >
                        <AddCircleOutline fontSize="small" />
                        Add Group
                      </button>
                    </div>
                    {editingBreakfast.optionGroups.map(group => (
                      <div key={group.id} className="admin-breakfasts__option-item">
                        {editingOptionGroup?.id === group.id ? (
                          <>
                            <input
                              type="text"
                              name="title"
                              value={editingOptionGroup.title}
                              onChange={handleEditOptionGroupChange}
                              className="admin-breakfasts__form-input"
                            />
                            <div className="admin-breakfasts__checkbox-container">
                              <input
                                type="checkbox"
                                name="is_required"
                                checked={editingOptionGroup.is_required}
                                onChange={handleEditOptionGroupChange}
                                className="admin-breakfasts__checkbox"
                              />
                              <label className="admin-breakfasts__form-label">Required</label>
                            </div>
                            <input
                              type="number"
                              name="max_selections"
                              min="0"
                              value={editingOptionGroup.max_selections}
                              onChange={handleEditOptionGroupChange}
                              placeholder="Max Selections"
                              className="admin-breakfasts__form-input"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateOptionGroup(group.id)}
                              className="admin-breakfasts__primary-button"
                              disabled={isSubmitting}
                            >
                              <Save fontSize="small" />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingOptionGroup(null)}
                              className="admin-breakfasts__secondary-button"
                              disabled={isSubmitting}
                            >
                              <Cancel fontSize="small" />
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <span>{group.title} {group.is_required ? '(Required)' : '(Optional)'}, Max: {group.max_selections || 'Unlimited'}</span>
                            <button
                              type="button"
                              onClick={() => handleEditOptionGroup(group)}
                              className="admin-breakfasts__secondary-button"
                              disabled={isSubmitting}
                            >
                              <Edit fontSize="small" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveOptionGroup(group.id)}
                              className="admin-breakfasts__danger-button"
                              disabled={isSubmitting}
                            >
                              <DeleteOutline fontSize="small" />
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="admin-breakfasts__option-section">
                    <label className="admin-breakfasts__form-label">Options</label>
                    <div className="admin-breakfasts__option-grid">
                      <select
                        name="group_id"
                        value={newOption.group_id || ''}
                        onChange={handleOptionChange}
                        className="admin-breakfasts__form-select"
                      >
                        <option value="">Select Option Group</option>
                        {editingBreakfast.optionGroups.map(group => (
                          <option key={group.id} value={group.id}>{group.title}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        name="option_type"
                        value={newOption.option_type}
                        onChange={handleOptionChange}
                        placeholder="Option Type (e.g., Coffee)"
                        className="admin-breakfasts__form-input"
                      />
                      <input
                        type="text"
                        name="option_name"
                        value={newOption.option_name}
                        onChange={handleOptionChange}
                        placeholder="Option Name (e.g., Espresso)"
                        className="admin-breakfasts__form-input"
                      />
                      <input
                        type="number"
                        name="additional_price"
                        step="0.01"
                        min="0"
                        value={newOption.additional_price}
                        onChange={handleOptionChange}
                        placeholder="Additional Price"
                        className="admin-breakfasts__form-input"
                      />
                      <button
                        type="button"
                        onClick={handleAddOption}
                        className="admin-breakfasts__primary-button"
                        disabled={isSubmitting}
                      >
                        <AddCircleOutline fontSize="small" />
                        Add Option
                      </button>
                    </div>
                    {editingBreakfast.options.map(opt => (
                      <div key={opt.id} className="admin-breakfasts__option-item">
                        <span>{opt.group_title}: {opt.option_type}: {opt.option_name}</span>
                        <span>${(parseFloat(opt.additional_price) || 0).toFixed(2)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(opt.id)}
                          className="admin-breakfasts__danger-button"
                          disabled={isSubmitting}
                        >
                          <DeleteOutline fontSize="small" />
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="admin-breakfasts__button-group">
              <button
                type="submit"
                className="admin-breakfasts__primary-button"
                disabled={isSubmitting || formErrors.name || formErrors.price}
              >
                <Save fontSize="small" />
                {isSubmitting ? 'Saving...' : editingBreakfast.id ? 'Update Breakfast' : 'Add Breakfast'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="admin-breakfasts__secondary-button"
                disabled={isSubmitting}
              >
                <Cancel fontSize="small" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {breakfasts.length === 0 && !editingBreakfast ? (
        <div className="admin-breakfasts__empty-state">
          <Coffee className="admin-breakfasts__empty-state-icon" />
          <h3>No breakfasts found</h3>
          <p>Add a new breakfast to get started.</p>
        </div>
      ) : (
        <div className="admin-breakfasts__items-grid">
          {breakfasts.map(breakfast => (
            <div key={breakfast.id} className="admin-breakfasts__item-card">
              {breakfast.image_url ? (
                <div className="admin-breakfasts__image-container">
                  <img
                    src={breakfast.image_url}
                    alt={breakfast.name}
                    className="admin-breakfasts__item-image"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      console.error('Error loading breakfast image:', breakfast.image_url);
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="admin-breakfasts__placeholder-image" style={{ display: 'none' }}>
                    <Coffee size={40} color="#ff8c42" />
                  </div>
                </div>
              ) : (
                <div className="admin-breakfasts__no-image">No Image Available</div>
              )}
              <h3 className="admin-breakfasts__item-title">{breakfast.name}</h3>
              <div className="admin-breakfasts__price-container">
                <span className="admin-breakfasts__sale-price">${parseFloat(breakfast.price).toFixed(2)}</span>
              </div>
              <div className="admin-breakfasts__item-meta">
                <span
                  className={`admin-breakfasts__badge ${
                    breakfast.availability ? 'admin-breakfasts__available-badge' : 'admin-breakfasts__unavailable-badge'
                  }`}
                >
                  {breakfast.availability ? 'Available' : 'Unavailable'}
                </span>
                {breakfast.category_id && categories.find(cat => cat.id === breakfast.category_id) && (
                  <span className="admin-breakfasts__badge admin-breakfasts__category-badge">
                    {categories.find(cat => cat.id === breakfast.category_id).name}
                  </span>
                )}
              </div>
              {breakfast.description && (
                <p className="admin-breakfasts__item-description">{breakfast.description}</p>
              )}
              {breakfast.optionGroups.length > 0 && (
                <div className="admin-breakfasts__options-list">
                  <strong>Option Groups:</strong>
                  {breakfast.optionGroups.map(group => (
                    <div key={group.id} className="admin-breakfasts__option-item-display">
                      {group.title} {group.is_required ? '(Required)' : '(Optional)'}, Max: {group.max_selections || 'Unlimited'}
                    </div>
                  ))}
                </div>
              )}
              {breakfast.options.length > 0 && (
                <div className="admin-breakfasts__options-list">
                  <strong>Options:</strong>
                  {breakfast.options.map(opt => (
                    <div key={opt.id} className="admin-breakfasts__option-item-display">
                      {opt.group_title}: {opt.option_type}: {opt.option_name} (+${(parseFloat(opt.additional_price) || 0).toFixed(2)})
                    </div>
                  ))}
                </div>
              )}
              {Array.isArray(breakfast.reusable_option_groups) && breakfast.reusable_option_groups.length > 0 && (
                <div className="admin-breakfasts__options-list">
                  <strong>Reusable Option Groups:</strong>
                  {breakfast.reusable_option_groups.map(groupId => {
                    const group = reusableOptionGroups.find(g => g.id === groupId);
                    return group ? (
                      <div key={groupId} className="admin-breakfasts__option-item-display">
                        {group.title} {group.is_required ? '(Required)' : '(Optional)'}, Max: {group.max_selections || 'Unlimited'}
                        {editingBreakfast?.id === breakfast.id && (
                          <button
                            type="button"
                            onClick={() => handleRemoveReusableOptionGroup(group.id)}
                            className="admin-breakfasts__danger-button"
                            disabled={isSubmitting}
                          >
                            <DeleteOutline fontSize="small" />
                            Remove
                          </button>
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
              )}
              <div className="admin-breakfasts__button-group">
                <button
                  className="admin-breakfasts__primary-button"
                  onClick={() => handleEdit(breakfast)}
                >
                  <Edit fontSize="small" />
                  Edit
                </button>
                <button
                  className="admin-breakfasts__danger-button"
                  onClick={() => handleDelete(breakfast.id)}
                  disabled={isSubmitting}
                >
                  <DeleteOutline fontSize="small" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminBreakfasts;
