import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { initSocket } from '../services/socket';
import {
  Add,
  Edit,
  Delete,
  TableRestaurant,
  People,
  Schedule,
  CheckCircle,
  Cancel,
  Close,
  Save,
  GridView,
  ViewList,
  GroupAdd,
  DeleteSweep
} from '@mui/icons-material';
import './css/TableManagement.css';

function TableManagement() {
  const [tables, setTables] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newTable, setNewTable] = useState({ table_number: '', capacity: '' });
  const [editTable, setEditTable] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkAddForm, setShowBulkAddForm] = useState(false);
  const [showBulkDeleteForm, setShowBulkDeleteForm] = useState(false);
  const [bulkAdd, setBulkAdd] = useState({ start_number: '', end_number: '', capacity: '' });
  const [bulkDelete, setBulkDelete] = useState({ start_number: '', end_number: '' });
  const [viewMode, setViewMode] = useState('grid');
  const navigate = useNavigate();

  useEffect(() => {
    let socketCleanup = () => {};

    const checkAuth = async () => {
      try {
        const res = await api.get('/check-auth');
        if (res.data.role !== 'admin') {
          toast.error('Admin access required');
          navigate('/');
        } else {
          setUser(res.data);
          socketCleanup = initSocket({
            onTableStatusUpdate: (data) => {
              setTables((prevTables) => {
                if (data.status === 'deleted') {
                  return prevTables.filter(table => table.id !== data.table_id);
                }
                return prevTables.map((table) =>
                  table.id === data.table_id ? { ...table, status: data.status } : table
                );
              });
              toast.info(`Table ${data.table_id} ${data.status === 'deleted' ? 'deleted' : `status updated to ${data.status}`}`);
            }
          });
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        toast.error(err.response?.data?.error || 'Please log in');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchData = async () => {
      try {
        const res = await api.getTables();
        setTables(res.data || []);
      } catch (error) {
        console.error('Error fetching tables:', error);
        toast.error(error.response?.data?.error || 'Failed to fetch tables');
      }
    };

    checkAuth();
    fetchData();

    return () => {
      socketCleanup();
    };
  }, [navigate]);

  const addTable = async (e) => {
    e.preventDefault();
    try {
      if (!user || user.role !== 'admin') {
        toast.error('Admin access required');
        navigate('/login');
        return;
      }
      if (!newTable.table_number.trim() || !newTable.capacity) {
        toast.error('Table number and capacity are required');
        return;
      }
      const capacity = parseInt(newTable.capacity);
      if (isNaN(capacity) || capacity <= 0) {
        toast.error('Capacity must be a positive number');
        return;
      }
      await api.addTable({ user_id: user.id, ...newTable });
      toast.success('Table added successfully');
      setNewTable({ table_number: '', capacity: '' });
      setShowAddForm(false);
      const res = await api.getTables();
      setTables(res.data || []);
    } catch (error) {
      console.error('Error adding table:', error);
      toast.error(error.response?.data?.error || 'Failed to add table');
    }
  };

  const bulkAddTables = async (e) => {
    e.preventDefault();
    try {
      if (!user || user.role !== 'admin') {
        toast.error('Admin access required');
        navigate('/login');
        return;
      }
      const start = parseInt(bulkAdd.start_number);
      const end = parseInt(bulkAdd.end_number);
      const capacity = parseInt(bulkAdd.capacity);
      
      if (isNaN(start) || isNaN(end) || isNaN(capacity)) {
        toast.error('All fields must be valid numbers');
        return;
      }
      if (start > end) {
        toast.error('Start number must be less than or equal to end number');
        return;
      }
      if (capacity <= 0) {
        toast.error('Capacity must be a positive number');
        return;
      }
      if (end - start + 1 > 500) {
        toast.error('Cannot create more than 500 tables at once');
        return;
      }

      await api.bulkAddTables({ 
        user_id: user.id, 
        start_number: start, 
        end_number: end, 
        capacity 
      });
      toast.success(`Successfully added ${end - start + 1} tables`);
      setBulkAdd({ start_number: '', end_number: '', capacity: '' });
      setShowBulkAddForm(false);
      const res = await api.getTables();
      setTables(res.data || []);
    } catch (error) {
      console.error('Error adding bulk tables:', error);
      toast.error(error.response?.data?.error || 'Failed to add tables');
    }
  };

  const bulkDeleteTables = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to delete tables from ${bulkDelete.start_number} to ${bulkDelete.end_number}?`)) {
      return;
    }
    try {
      if (!user || user.role !== 'admin') {
        toast.error('Admin access required');
        navigate('/login');
        return;
      }
      const start = parseInt(bulkDelete.start_number);
      const end = parseInt(bulkDelete.end_number);
      
      if (isNaN(start) || isNaN(end)) {
        toast.error('All fields must be valid numbers');
        return;
      }
      if (start > end) {
        toast.error('Start number must be less than or equal to end number');
        return;
      }

      await api.bulkDeleteTables({ 
        user_id: user.id, 
        start_number: start, 
        end_number: end 
      });
      toast.success(`Successfully deleted tables`);
      setBulkDelete({ start_number: '', end_number: '' });
      setShowBulkDeleteForm(false);
      const res = await api.getTables();
      setTables(res.data || []);
    } catch (error) {
      console.error('Error deleting bulk tables:', error);
      toast.error(error.response?.data?.error || 'Failed to delete tables');
    }
  };

  const updateTable = async (e) => {
    e.preventDefault();
    try {
      if (!user || user.role !== 'admin') {
        toast.error('Admin access required');
        navigate('/login');
        return;
      }
      if (!editTable.table_number.trim() || !editTable.capacity) {
        toast.error('Table number and capacity are required');
        return;
      }
      const capacity = parseInt(editTable.capacity);
      if (isNaN(capacity) || capacity <= 0) {
        toast.error('Capacity must be a positive number');
        return;
      }
      await api.updateTable(editTable.id, {
        user_id: user.id,
        table_number: editTable.table_number,
        capacity,
        status: editTable.status,
        reserved_until: editTable.reserved_until || null,
      });
      toast.success('Table updated successfully');
      setEditTable(null);
      const res = await api.getTables();
      setTables(res.data || []);
    } catch (error) {
      console.error('Error updating table:', error);
      toast.error(error.response?.data?.error || 'Failed to update table');
    }
  };

  const deleteTable = async (id) => {
    if (!window.confirm('Are you sure you want to delete this table?')) {
      return;
    }
    try {
      if (!user || user.role !== 'admin') {
        toast.error('Admin access required');
        navigate('/login');
        return;
      }
      await api.deleteTable(id, { user_id: user.id });
      toast.success('Table deleted successfully');
      const res = await api.getTables();
      setTables(res.data || []);
    } catch (error) {
      console.error('Error deleting table:', error);
      toast.error(error.response?.data?.error || 'Failed to delete table');
    }
  };

  if (isLoading || !user) {
    return (
      <div className="table-management-loading">
        <div className="table-management-text-center">
          <TableRestaurant className="table-management-icon-medium" />
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-management">
      <div className="table-management-header">
        <h1 className="table-management-title">
          <TableRestaurant />
          Table Management
        </h1>
        <p className="table-management-subtitle">
          Manage restaurant tables
        </p>
      </div>

      <div className="table-management-view-toggle">
        <button
          onClick={() => setViewMode('grid')}
          className={`table-management-button-secondary ${viewMode === 'grid' ? 'table-management-button-active' : ''}`}
        >
          <GridView className="table-management-icon-small" />
          Grid
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`table-management-button-secondary ${viewMode === 'list' ? 'table-management-button-active' : ''}`}
        >
          <ViewList className="table-management-icon-small" />
          List
        </button>
      </div>

      <div className="table-management-card">
        <div className="table-management-card-header">
          <h2 className="table-management-card-title">
            Tables ({tables.length})
          </h2>
          <div className="table-management-bulk-actions">
            <button
              onClick={() => setShowBulkAddForm(true)}
              className="table-management-button-secondary"
            >
              <GroupAdd className="table-management-icon-small" />
              Bulk Add
            </button>
            <button
              onClick={() => setShowBulkDeleteForm(true)}
              className="table-management-button-secondary"
            >
              <DeleteSweep className="table-management-icon-small" />
              Bulk Delete
            </button>
          </div>
        </div>
        
        {tables.length === 0 ? (
          <div className="table-management-empty-state">
            <TableRestaurant className="table-management-empty-icon" />
            <h3 className="table-management-empty-title">No tables found</h3>
            <p className="table-management-empty-text">Add your first table to get started</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'table-management-table-grid' : 'table-management-table-list'}>
            {tables.map(table => (
              <div 
                key={table.id} 
                className="table-management-table-card"
              >
                <div className="table-management-table-card-header">
                  <h3 className="table-management-table-card-title">
                    <TableRestaurant className="table-management-icon-medium" />
                    {table.table_number}
                  </h3>
                  <div className={`table-management-status-badge ${table.status === 'available' ? 'table-management-status-available' : 'table-management-status-occupied'}`}>
                    {table.status === 'available' ? <CheckCircle className="table-management-icon-small" /> : <Cancel className="table-management-icon-small" />}
                    {table.status}
                  </div>
                </div>
                
                <div className="table-management-table-card-content">
                  <div className="table-management-table-card-info">
                    <People className="table-management-icon-small" />
                    <span>Capacity: {table.capacity}</span>
                  </div>
                  <div className="table-management-table-card-info">
                    <Schedule className="table-management-icon-small" />
                    <span>
                      {table.reserved_until ? 
                        `Reserved until: ${new Date(table.reserved_until).toLocaleDateString()}` : 
                        'Not reserved'
                      }
                    </span>
                  </div>
                </div>
                
                <div className="table-management-action-buttons">
                  <button
                    onClick={() => setEditTable(table)}
                    className="table-management-button-edit"
                  >
                    <Edit className="table-management-icon-small" />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTable(table.id)}
                    className="table-management-button-delete"
                  >
                    <Delete className="table-management-icon-small" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowAddForm(true)}
        className="table-management-add-button"
      >
        <Add className="table-management-icon-large" />
      </button>

      {showAddForm && (
        <div className="table-management-overlay" onClick={() => setShowAddForm(false)}>
          <div className="table-management-modal" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowAddForm(false)}
              className="table-management-close-button"
            >
              <Close />
            </button>
            
            <h2 className="table-management-modal-title">
              <Add />
              Add New Table
            </h2>
            
            <form onSubmit={addTable}>
              <div className="table-management-form-row">
                <div className="table-management-form-group">
                  <label className="table-management-label">Table Number</label>
                  <input
                    type="text"
                    value={newTable.table_number}
                    onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })}
                    placeholder="e.g., T001"
                    required
                    className="table-management-input"
                  />
                </div>
                <div className="table-management-form-group">
                  <label className="table-management-label">Capacity</label>
                  <input
                    type="number"
                    value={newTable.capacity}
                    onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
                    placeholder="4"
                    min="1"
                    required
                    className="table-management-input"
                  />
                </div>
              </div>
              
              <div className="table-management-form-actions">
                <button
                  type="submit"
                  className="table-management-button-primary"
                >
                  <Save />
                  Add Table
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="table-management-button-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkAddForm && (
        <div className="table-management-overlay" onClick={() => setShowBulkAddForm(false)}>
          <div className="table-management-modal" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowBulkAddForm(false)}
              className="table-management-close-button"
            >
              <Close />
            </button>
            
            <h2 className="table-management-modal-title">
              <GroupAdd />
              Bulk Add Tables
            </h2>
            
            <form onSubmit={bulkAddTables}>
              <div className="table-management-form-row">
                <div className="table-management-form-group">
                  <label className="table-management-label">Start Table Number</label>
                  <input
                    type="number"
                    value={bulkAdd.start_number}
                    onChange={(e) => setBulkAdd({ ...bulkAdd, start_number: e.target.value })}
                    placeholder="1"
                    min="1"
                    required
                    className="table-management-input"
                  />
                </div>
                <div className="table-management-form-group">
                  <label className="table-management-label">End Table Number</label>
                  <input
                    type="number"
                    value={bulkAdd.end_number}
                    onChange={(e) => setBulkAdd({ ...bulkAdd, end_number: e.target.value })}
                    placeholder="200"
                    min="1"
                    required
                    className="table-management-input"
                  />
                </div>
              </div>
              <div className="table-management-form-row">
                <div className="table-management-form-group">
                  <label className="table-management-label">Capacity</label>
                  <input
                    type="number"
                    value={bulkAdd.capacity}
                    onChange={(e) => setBulkAdd({ ...bulkAdd, capacity: e.target.value })}
                    placeholder="1"
                    min="1"
                    required
                    className="table-management-input"
                  />
                </div>
              </div>
              
              <div className="table-management-form-actions">
                <button
                  type="submit"
                  className="table-management-button-primary"
                >
                  <Save />
                  Add Tables
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkAddForm(false)}
                  className="table-management-button-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkDeleteForm && (
        <div className="table-management-overlay" onClick={() => setShowBulkDeleteForm(false)}>
          <div className="table-management-modal" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowBulkDeleteForm(false)}
              className="table-management-close-button"
            >
              <Close />
            </button>
            
            <h2 className="table-management-modal-title">
              <DeleteSweep />
              Bulk Delete Tables
            </h2>
            
            <form onSubmit={bulkDeleteTables}>
              <div className="table-management-form-row">
                <div className="table-management-form-group">
                  <label className="table-management-label">Start Table Number</label>
                  <input
                    type="number"
                    value={bulkDelete.start_number}
                    onChange={(e) => setBulkDelete({ ...bulkDelete, start_number: e.target.value })}
                    placeholder="1"
                    min="1"
                    required
                    className="table-management-input"
                  />
                </div>
                <div className="table-management-form-group">
                  <label className="table-management-label">End Table Number</label>
                  <input
                    type="number"
                    value={bulkDelete.end_number}
                    onChange={(e) => setBulkDelete({ ...bulkDelete, end_number: e.target.value })}
                    placeholder="200"
                    min="1"
                    required
                    className="table-management-input"
                  />
                </div>
              </div>
              
              <div className="table-management-form-actions">
                <button
                  type="submit"
                  className="table-management-button-primary"
                >
                  <DeleteSweep />
                  Delete Tables
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteForm(false)}
                  className="table-management-button-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTable && (
        <div className="table-management-overlay" onClick={() => setEditTable(null)}>
          <div className="table-management-modal" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setEditTable(null)}
              className="table-management-close-button"
            >
              <Close />
            </button>
            
            <h2 className="table-management-modal-title">
              <Edit />
              Edit Table
            </h2>
            
            <form onSubmit={updateTable}>
              <div className="table-management-form-row">
                <div className="table-management-form-group">
                  <label className="table-management-label">Table Number</label>
                  <input
                    type="text"
                    value={editTable.table_number}
                    onChange={(e) => setEditTable({ ...editTable, table_number: e.target.value })}
                    required
                    className="table-management-input"
                  />
                </div>
                <div className="table-management-form-group">
                  <label className="table-management-label">Capacity</label>
                  <input
                    type="number"
                    value={editTable.capacity}
                    onChange={(e) => setEditTable({ ...editTable, capacity: e.target.value })}
                    min="1"
                    required
                    className="table-management-input"
                  />
                </div>
              </div>
              
              <div className="table-management-form-row">
                <div className="table-management-form-group">
                  <label className="table-management-label">Status</label>
                  <select
                    value={editTable.status}
                    onChange={(e) => setEditTable({ ...editTable, status: e.target.value })}
                    className="table-management-select"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                  </select>
                </div>
                <div className="table-management-form-group">
                  <label className="table-management-label">Reserved Until</label>
                  <input
                    type="datetime-local"
                    value={editTable.reserved_until ? editTable.reserved_until.slice(0, 16) : ''}
                    onChange={(e) => setEditTable({ ...editTable, reserved_until: e.target.value })}
                    className="table-management-input"
                  />
                </div>
              </div>
              
              <div className="table-management-form-actions">
                <button
                  type="submit"
                  className="table-management-button-primary"
                >
                  <Save />
                  Update Table
                </button>
                <button
                  type="button"
                  onClick={() => setEditTable(null)}
                  className="table-management-button-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TableManagement;
