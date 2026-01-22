import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import {
  AddCircleOutline,
  DeleteOutline,
  RestaurantMenu,
  AttachMoney,
  Close,
  Edit,
  Assignment,
  MenuBook
} from '@mui/icons-material';
import './css/ManageSupplements.css';

function ManageSupplements() {
  const [supplements, setSupplements] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [newSupplementName, setNewSupplementName] = useState('');
  const [newSupplementPrice, setNewSupplementPrice] = useState('');
  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  const [additionalPrice, setAdditionalPrice] = useState('');
  const [isLoading, setLoading] = useState(true);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isAssignFormOpen, setIsAssignFormOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [supplementsResponse, menuItemsResponse, userResponse] = await Promise.all([
          api.get('/supplements'),
          api.get('/menu-items'),
          api.get('/check-auth')
        ]);
        setSupplements(supplementsResponse.data || []);
        setMenuItems(menuItemsResponse.data || []);
        setUser(userResponse.data || null);
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddSupplement = async (e) => {
    e.preventDefault();
    if (!newSupplementName.trim() || !newSupplementPrice || isNaN(newSupplementPrice) || parseFloat(newSupplementPrice) < 0) {
      toast.error('Please provide a valid supplement name and price');
      return;
    }
    try {
      const response = await api.post('/supplements', {
        name: newSupplementName,
        price: parseFloat(newSupplementPrice)
      });
      setSupplements([...supplements, response.data]);
      setNewSupplementName('');
      setNewSupplementPrice('');
      setIsAddFormOpen(false);
      toast.success('Supplement added successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add supplement');
    }
  };

  const handleDeleteSupplement = async (supplementId) => {
    if (!user) {
      toast.error('You must be logged in to delete supplements');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this supplement?')) return;
    try {
      await api.delete(`/supplements/${supplementId}`, {
        data: { user_id: user.id }
      });
      setSupplements(supplements.filter(s => s.id !== supplementId));
      toast.success('Supplement deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete supplement');
    }
  };

  const handleAssignSupplement = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to assign supplements');
      return;
    }
    if (!selectedMenuItem || !additionalPrice || isNaN(additionalPrice) || parseFloat(additionalPrice) < 0) {
      toast.error('Please select a menu item and provide a valid additional price');
      return;
    }
    try {
      const selectedSupplement = supplements.find(s => s.id === parseInt(selectedMenuItem.split('-')[1]));
      const menuItemId = parseInt(selectedMenuItem.split('-')[0]);
      await api.post(`/menu-items/${menuItemId}/supplements`, {
        supplement_id: selectedSupplement.id,
        name: selectedSupplement.name,
        additional_price: parseFloat(additionalPrice),
        user_id: user.id
      });
      const updatedSupplements = await api.get('/supplements');
      setSupplements(updatedSupplements.data || []);
      setSelectedMenuItem('');
      setAdditionalPrice('');
      setIsAssignFormOpen(false);
      toast.success('Supplement assigned successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign supplement');
    }
  };

  const handleRemoveAssignment = async (menuItemId, supplementId) => {
    if (!user) {
      toast.error('You must be logged in to remove supplement assignments');
      return;
    }
    if (!window.confirm('Are you sure you want to remove this supplement assignment?')) return;
    try {
      await api.delete(`/menu-items/${menuItemId}/supplements/${supplementId}`, {
        data: { user_id: user.id }
      });
      const updatedSupplements = await api.get('/supplements');
      setSupplements(updatedSupplements.data || []);
      toast.success('Supplement assignment removed successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove supplement assignment');
    }
  };

  return (
    <div className="manage-supplements-container">
      <div className="manage-supplements-header">
        <div className="manage-supplements-title-section">
          <MenuBook className="manage-supplements-title-icon" />
          <h1 className="manage-supplements-title">Supplement Management</h1>
        </div>
        <div className="manage-supplements-button-group">
          <button 
            className="manage-supplements-primary-button" 
            onClick={() => setIsAddFormOpen(true)}
          >
            <AddCircleOutline fontSize="small" />
            Add Supplement
          </button>
          <button 
            className="manage-supplements-primary-button" 
            onClick={() => setIsAssignFormOpen(true)}
          >
            <Assignment fontSize="small" />
            Assign to Menu
          </button>
        </div>
      </div>

      {isAddFormOpen && (
        <div className="manage-supplements-form-container">
          <h3 className="manage-supplements-form-title">
            <AddCircleOutline fontSize="small" />
            Add New Supplement
          </h3>
          <form className="manage-supplements-form" onSubmit={handleAddSupplement}>
            <div className="manage-supplements-input-group">
              <label className="manage-supplements-label">Supplement Name</label>
              <input
                type="text"
                placeholder="Enter supplement name..."
                value={newSupplementName}
                onChange={(e) => setNewSupplementName(e.target.value)}
                className="manage-supplements-input"
                required
              />
            </div>
            <div className="manage-supplements-input-group">
              <label className="manage-supplements-label">Base Price ($)</label>
              <input
                type="number"
                placeholder="0.00"
                value={newSupplementPrice}
                onChange={(e) => setNewSupplementPrice(e.target.value)}
                className="manage-supplements-input"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="manage-supplements-form-actions">
              <button type="submit" className="manage-supplements-primary-button">
                <AddCircleOutline fontSize="small" />
                Add Supplement
              </button>
              <button 
                type="button" 
                className="manage-supplements-secondary-button" 
                onClick={() => setIsAddFormOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isAssignFormOpen && (
        <div className="manage-supplements-form-container">
          <h3 className="manage-supplements-form-title">
            <Assignment fontSize="small" />
            Assign Supplement to Menu Item
          </h3>
          <form className="manage-supplements-form" onSubmit={handleAssignSupplement}>
            <div className="manage-supplements-input-group">
              <label className="manage-supplements-label">Menu Item & Supplement</label>
              <select
                value={selectedMenuItem}
                onChange={(e) => setSelectedMenuItem(e.target.value)}
                className="manage-supplements-select"
                required
              >
                <option value="">Select menu item and supplement...</option>
                {menuItems.map(item => 
                  supplements.map(supplement => (
                    <option key={`${item.id}-${supplement.id}`} value={`${item.id}-${supplement.id}`}>
                      {item.name} → {supplement.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="manage-supplements-input-group">
              <label className="manage-supplements-label">Additional Price ($)</label>
              <input
                type="number"
                placeholder="0.00"
                value={additionalPrice}
                onChange={(e) => setAdditionalPrice(e.target.value)}
                className="manage-supplements-input"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="manage-supplements-form-actions">
              <button type="submit" className="manage-supplements-primary-button">
                <Assignment fontSize="small" />
                Assign Supplement
              </button>
              <button 
                type="button" 
                className="manage-supplements-secondary-button" 
                onClick={() => setIsAssignFormOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="manage-supplements-table-container">
        <div className="manage-supplements-table-header">
          <h2 className="manage-supplements-table-header-title">
            <RestaurantMenu fontSize="small" />
            Supplements Overview
          </h2>
        </div>
        
        {isLoading ? (
          <div className="manage-supplements-loading">
            Loading supplements...
          </div>
        ) : supplements.length === 0 ? (
          <div className="manage-supplements-empty-state">
            <RestaurantMenu className="manage-supplements-empty-state-icon" />
            <div className="manage-supplements-empty-state-text">No supplements available</div>
            <div className="manage-supplements-empty-state-subtext">
              Create your first supplement to get started
            </div>
          </div>
        ) : (
          <div className="manage-supplements-table-wrapper">
            <table className="manage-supplements-table">
              <thead>
                <tr>
                  <th className="manage-supplements-th">Supplement</th>
                  <th className="manage-supplements-th">Base Price</th>
                  <th className="manage-supplements-th">Menu Assignments</th>
                  <th className="manage-supplements-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {supplements.map(supplement => (
                  <tr key={supplement.id}>
                    <td className="manage-supplements-td">
                      <div className="manage-supplements-supplement-name">{supplement.name}</div>
                    </td>
                    <td className="manage-supplements-td">
                      <div className="manage-supplements-price">
                        ${parseFloat(supplement.price).toFixed(2)}
                      </div>
                    </td>
                    <td className="manage-supplements-td">
                      {supplement.menu_items && supplement.menu_items.length > 0 ? (
                        <ul className="manage-supplements-assignment-list">
                          {supplement.menu_items.map(item => (
                            <li key={item.menu_item_id} className="manage-supplements-assignment-item">
                              <span className="manage-supplements-assignment-text">
                                {item.name} <strong>(+${parseFloat(item.additional_price).toFixed(2)})</strong>
                              </span>
                              <button
                                className="manage-supplements-remove-button"
                                onClick={() => handleRemoveAssignment(item.menu_item_id, supplement.id)}
                                title="Remove Assignment"
                              >
                                <Close fontSize="small" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="manage-supplements-no-assignments">
                          No assignments
                        </span>
                      )}
                    </td>
                    <td className="manage-supplements-td">
                      <button
                        className="manage-supplements-delete-button"
                        onClick={() => handleDeleteSupplement(supplement.id)}
                        title="Delete Supplement"
                      >
                        <DeleteOutline fontSize="small" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageSupplements;