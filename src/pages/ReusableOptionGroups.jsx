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
  Coffee
} from '@mui/icons-material';
import './css/AdminBreakfasts.css'; // Reuse existing styles for consistency

function ReusableOptionGroups() {
  const [reusableOptionGroups, setReusableOptionGroups] = useState([]);
  const [newReusableOptionGroup, setNewReusableOptionGroup] = useState({ title: '', is_required: true, max_selections: '1', options: [] });
  const [editingReusableOptionGroup, setEditingReusableOptionGroup] = useState(null);
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);
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
        setUserId(authRes.data.id);
        const reusableGroupsRes = await api.getReusableOptionGroups();
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

  const handleReusableOptionGroupChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log('Input change:', name, value); // Debug log for input changes
    setNewReusableOptionGroup(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
              name === 'max_selections' ? (value === '' ? '1' : String(parseInt(value) || 1)) : value.trim()
    }));
  };

  const handleEditReusableOptionGroupChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingReusableOptionGroup(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
              name === 'max_selections' ? (value === '' ? '1' : String(parseInt(value) || 1)) : value.trim()
    }));
  };

  const handleAddOptionToReusableGroup = (isEditing = false) => {
    const target = isEditing ? setEditingReusableOptionGroup : setNewReusableOptionGroup;
    target(prev => ({
      ...prev,
      options: [...prev.options, { option_type: '', option_name: '', additional_price: '' }]
    }));
  };

  const handleEditOptionInReusableGroup = (index, field, value, isEditing = false) => {
    const target = isEditing ? setEditingReusableOptionGroup : setNewReusableOptionGroup;
    target(prev => {
      const newOptions = [...prev.options];
      newOptions[index][field] = field === 'additional_price' ? (value === '' ? '' : parseFloat(value) || 0) : value.trim();
      return { ...prev, options: newOptions };
    });
  };

  const handleRemoveOptionFromReusableGroup = (index, isEditing = false) => {
    const target = isEditing ? setEditingReusableOptionGroup : setNewReusableOptionGroup;
    target(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const validateOptionGroup = (group) => {
    if (!group.title || !group.title.trim()) {
      toast.error('Reusable option group title is required');
      return false;
    }
    const maxSelections = parseInt(group.max_selections) || 1;
    if (maxSelections < 0) {
      toast.error('Max selections must be a non-negative number');
      return false;
    }
    if (!group.options || group.options.length === 0) {
      toast.error('At least one option is required');
      return false;
    }
    for (const [index, option] of group.options.entries()) {
      if (!option.option_type?.trim()) {
        toast.error(`Option type is required for option ${index + 1}`);
        return false;
      }
      if (!option.option_name?.trim()) {
        toast.error(`Option name is required for option ${index + 1}`);
        return false;
      }
      if (option.additional_price !== '' && (isNaN(parseFloat(option.additional_price)) || parseFloat(option.additional_price) < 0)) {
        toast.error(`Additional price for option ${index + 1} must be a non-negative number`);
        return false;
      }
    }
    return true;
  };

  const handleAddReusableOptionGroup = async () => {
    console.log('Submitting new reusable option group:', newReusableOptionGroup); // Debug log
    if (!validateOptionGroup(newReusableOptionGroup)) {
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        user_id: String(userId),
        title: newReusableOptionGroup.title.trim(),
        is_required: newReusableOptionGroup.is_required,
        max_selections: String(parseInt(newReusableOptionGroup.max_selections) || 1),
        options: newReusableOptionGroup.options.map(opt => ({
          option_type: opt.option_type.trim(),
          option_name: opt.option_name.trim(),
          additional_price: opt.additional_price === '' ? 0 : parseFloat(opt.additional_price)
        }))
      };
      console.log('Submitting payload:', payload); // Debug log
      await api.createReusableOptionGroup(payload);
      toast.success('Reusable option group added');
      setNewReusableOptionGroup({ title: '', is_required: true, max_selections: '1', options: [] });
      setIsAddingNewGroup(false);
      const reusableGroupsRes = await api.getReusableOptionGroups();
      setReusableOptionGroups(reusableGroupsRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add reusable option group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditReusableOptionGroup = (group) => {
    setEditingReusableOptionGroup({
      id: group.id,
      title: group.title,
      is_required: group.is_required,
      max_selections: String(group.max_selections),
      options: group.options.map(opt => ({
        option_type: opt.option_type,
        option_name: opt.option_name,
        additional_price: opt.additional_price === 0 ? '' : String(opt.additional_price)
      }))
    });
    setIsAddingNewGroup(false);
  };

  const handleUpdateReusableOptionGroup = async (groupId) => {
    console.log('Submitting updated reusable option group:', editingReusableOptionGroup); // Debug log
    if (!validateOptionGroup(editingReusableOptionGroup)) {
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        user_id: String(userId),
        title: editingReusableOptionGroup.title.trim(),
        is_required: editingReusableOptionGroup.is_required,
        max_selections: String(parseInt(editingReusableOptionGroup.max_selections) || 1),
        options: editingReusableOptionGroup.options.map(opt => ({
          option_type: opt.option_type.trim(),
          option_name: opt.option_name.trim(),
          additional_price: opt.additional_price === '' ? 0 : parseFloat(opt.additional_price)
        }))
      };
      console.log('Submitting payload:', payload); // Debug log
      await api.updateReusableOptionGroup(groupId, payload);
      toast.success('Reusable option group updated');
      setEditingReusableOptionGroup(null);
      const reusableGroupsRes = await api.getReusableOptionGroups();
      setReusableOptionGroups(reusableGroupsRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update reusable option group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveReusableOptionGroup = async (groupId) => {
    if (!window.confirm('Remove this reusable option group? This will remove it from all associated breakfasts.')) return;
    try {
      setIsSubmitting(true);
      await api.deleteReusableOptionGroup(groupId, { user_id: String(userId) });
      toast.success('Reusable option group removed');
      const reusableGroupsRes = await api.getReusableOptionGroups();
      setReusableOptionGroups(reusableGroupsRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove reusable option group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNewReusableOptionGroup({ title: '', is_required: true, max_selections: '1', options: [] });
    setEditingReusableOptionGroup(null);
    setIsAddingNewGroup(false);
  };

  if (isLoading) {
    return (
      <div className="admin-breakfasts__container">
        <div className="admin-breakfasts__loading">
          <Coffee className="admin-breakfasts__loading-icon" />
          Loading reusable option groups...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-breakfasts__container">
      <div className="admin-breakfasts__header">
        <h1 className="admin-breakfasts__header-title">
          <Coffee />
          Manage Reusable Option Groups
        </h1>
        <p className="admin-breakfasts__header-subtitle">
          Create, update, and manage reusable option groups for breakfast items
        </p>
        <button 
          className="admin-breakfasts__back-button"
          onClick={() => navigate('/admin/breakfasts')}
        >
          <ArrowBack />
          Back to Breakfasts
        </button>
      </div>

      <div className="admin-breakfasts__controls-section">
        <button
          className="admin-breakfasts__primary-button"
          onClick={() => {
            setNewReusableOptionGroup({ title: '', is_required: true, max_selections: '1', options: [] });
            setIsAddingNewGroup(true);
          }}
        >
          <AddCircleOutline />
          Add New Reusable Option Group
        </button>
      </div>

      {(isAddingNewGroup || editingReusableOptionGroup) && (
        <div className="admin-breakfasts__item-card-editing">
          <h3>{editingReusableOptionGroup ? 'Edit Reusable Option Group' : 'Add Reusable Option Group'}</h3>
          <div className="admin-breakfasts__form-section">
            <div className="admin-breakfasts__form-group">
              <label className="admin-breakfasts__form-label">Group Title *</label>
              <input
                type="text"
                name="title"
                value={editingReusableOptionGroup ? editingReusableOptionGroup.title : newReusableOptionGroup.title}
                onChange={editingReusableOptionGroup ? handleEditReusableOptionGroupChange : handleReusableOptionGroupChange}
                placeholder="Enter group title (e.g., Beverage)"
                className="admin-breakfasts__form-input"
                required
              />
            </div>
            <div className="admin-breakfasts__form-group">
              <div className="admin-breakfasts__checkbox-container">
                <input
                  type="checkbox"
                  name="is_required"
                  checked={editingReusableOptionGroup ? editingReusableOptionGroup.is_required : newReusableOptionGroup.is_required}
                  onChange={editingReusableOptionGroup ? handleEditReusableOptionGroupChange : handleReusableOptionGroupChange}
                  className="admin-breakfasts__checkbox"
                />
                <label className="admin-breakfasts__form-label">Required</label>
              </div>
            </div>
            <div className="admin-breakfasts__form-group">
              <label className="admin-breakfasts__form-label">Max Selections</label>
              <input
                type="number"
                name="max_selections"
                min="0"
                value={editingReusableOptionGroup ? editingReusableOptionGroup.max_selections : newReusableOptionGroup.max_selections}
                onChange={editingReusableOptionGroup ? handleEditReusableOptionGroupChange : handleReusableOptionGroupChange}
                placeholder="Max Selections"
                className="admin-breakfasts__form-input"
                required
              />
            </div>
            <div className="admin-breakfasts__option-section">
              <label className="admin-breakfasts__form-label">Options *</label>
              <button
                type="button"
                onClick={() => handleAddOptionToReusableGroup(!!editingReusableOptionGroup)}
                className="admin-breakfasts__primary-button"
                disabled={isSubmitting}
              >
                <AddCircleOutline fontSize="small" />
                Add Option
              </button>
              {(editingReusableOptionGroup ? editingReusableOptionGroup.options : newReusableOptionGroup.options).map((opt, index) => (
                <div key={index} className="admin-breakfasts__option-grid">
                  <input
                    type="text"
                    value={opt.option_type}
                    onChange={(e) => handleEditOptionInReusableGroup(index, 'option_type', e.target.value, !!editingReusableOptionGroup)}
                    placeholder="Option Type (e.g., Coffee)"
                    className="admin-breakfasts__form-input"
                    required
                  />
                  <input
                    type="text"
                    value={opt.option_name}
                    onChange={(e) => handleEditOptionInReusableGroup(index, 'option_name', e.target.value, !!editingReusableOptionGroup)}
                    placeholder="Option Name (e.g., Espresso)"
                    className="admin-breakfasts__form-input"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={opt.additional_price}
                    onChange={(e) => handleEditOptionInReusableGroup(index, 'additional_price', e.target.value, !!editingReusableOptionGroup)}
                    placeholder="Additional Price"
                    className="admin-breakfasts__form-input"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOptionFromReusableGroup(index, !!editingReusableOptionGroup)}
                    className="admin-breakfasts__danger-button"
                    disabled={isSubmitting}
                  >
                    <DeleteOutline fontSize="small" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="admin-breakfasts__button-group">
              <button
                type="button"
                onClick={editingReusableOptionGroup ? () => handleUpdateReusableOptionGroup(editingReusableOptionGroup.id) : handleAddReusableOptionGroup}
                className="admin-breakfasts__primary-button"
                disabled={isSubmitting}
              >
                <Save fontSize="small" />
                {editingReusableOptionGroup ? 'Update Group' : 'Add Group'}
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
          </div>
        </div>
      )}

      <div className="admin-breakfasts__section">
        <h2 className="admin-breakfasts__section-title">Reusable Option Groups</h2>
        {reusableOptionGroups.length === 0 ? (
          <div className="admin-breakfasts__empty-state">
            <Coffee className="admin-breakfasts__empty-state-icon" />
            <h3>No reusable option groups found</h3>
            <p>Add a new reusable option group to get started.</p>
          </div>
        ) : (
          <div className="admin-breakfasts__items-grid">
            {reusableOptionGroups.map(group => (
              <div key={group.id} className="admin-breakfasts__item-card">
                <h3 className="admin-breakfasts__item-title">{group.title}</h3>
                <p>{group.is_required ? '(Required)' : '(Optional)'}, Max: {group.max_selections || 'Unlimited'}</p>
                {group.options.length > 0 && (
                  <div className="admin-breakfasts__options-list">
                    <strong>Options:</strong>
                    {group.options.map(opt => (
                      <div key={opt.id} className="admin-breakfasts__option-item-display">
                        {opt.option_type}: {opt.option_name} (+${(parseFloat(opt.additional_price) || 0).toFixed(2)})
                      </div>
                    ))}
                  </div>
                )}
                <div className="admin-breakfasts__button-group">
                  <button
                    className="admin-breakfasts__primary-button"
                    onClick={() => handleEditReusableOptionGroup(group)}
                  >
                    <Edit fontSize="small" />
                    Edit
                  </button>
                  <button
                    className="admin-breakfasts__danger-button"
                    onClick={() => handleRemoveReusableOptionGroup(group.id)}
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
    </div>
  );
}

export default ReusableOptionGroups;
