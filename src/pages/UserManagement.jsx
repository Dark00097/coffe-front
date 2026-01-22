import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import './css/UserManagement.css';

function UserManagement() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', role: 'server' });
  const [editUser, setEditUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
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
        console.error('Auth check failed:', err.response?.data || err.message);
        toast.error(err.response?.data?.error || 'Please log in');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await api.get('/users');
        setUsers(res.data || []);
      } catch (err) {
        console.error('Failed to load users:', err.response?.data || err.message);
        toast.error(err.response?.data?.error || 'Failed to load users');
      }
    };

    checkAuth();
    fetchUsers();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      toast.error('Email and password are required');
      return;
    }
    try {
      await api.post('/staff', { user_id: user.id, ...form });
      setForm({ email: '', password: '', role: 'server' });
      const res = await api.get('/users');
      setUsers(res.data || []);
      toast.success('Staff added successfully');
    } catch (err) {
      console.error('Failed to add user:', err.response?.data || err.message);
      toast.error(err.response?.data?.error || 'Failed to add staff');
    }
  };

  const handleEdit = (u) => {
    setEditUser({ id: u.id, email: u.email, password: '', role: u.role });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editUser.email.trim()) {
      toast.error('Email is required');
      return;
    }
    try {
      await api.updateUser(editUser.id, { user_id: user.id, ...editUser });
      setEditUser(null);
      const res = await api.get('/users');
      setUsers(res.data || []);
      toast.success('User updated successfully');
    } catch (err) {
      console.error('Failed to update user:', err.response?.data || err.message);
      toast.error(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUser(id, { user_id: user.id });
      const res = await api.get('/users');
      setUsers(res.data || []);
      toast.success('User deleted successfully');
    } catch (err) {
      console.error('Failed to delete user:', err.response?.data || err.message);
      toast.error(err.response?.data?.error || 'Failed to delete user');
    }
  };

  if (isLoading || !user) {
    return (
      <div className="um-loading-container">
        <div className="um-loading-spinner"></div>
        <p className="um-loading-text">Loading...</p>
      </div>
    );
  }

  return (
    <div className="um-container">
      {/* Header */}
      <div className="um-header">
        <div className="um-header-content">
          <div className="um-header-icon">
            <PeopleIcon style={{ fontSize: 32, color: '#4f46e5' }} />
          </div>
          <div>
            <h1 className="um-title">User Management</h1>
            <p className="um-subtitle">Manage your restaurant staff and administrators</p>
          </div>
        </div>
      </div>

      <div className="um-content">
        {/* Add Staff Card */}
        <div className="um-card">
          <div className="um-card-header">
            <PersonAddIcon className="um-card-icon" />
            <h2 className="um-card-title">Add New Staff Member</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="um-form">
            <div className="um-input-group">
              <label className="um-label">
                <EmailIcon className="um-input-icon" />
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="um-input"
                placeholder="Enter email address"
              />
            </div>
            
            <div className="um-input-group">
              <label className="um-label">
                <LockIcon className="um-input-icon" />
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="um-input"
                placeholder="Enter password"
              />
            </div>
            
            <div className="um-input-group">
              <label className="um-label">
                <PersonIcon className="um-input-icon" />
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="um-select"
              >
                <option value="server">Server</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            
            <button type="submit" className="um-button um-primary-button">
              <PersonAddIcon className="um-button-icon" />
              Add Staff Member
            </button>
          </form>
        </div>

        {/* Staff List Card */}
        <div className="um-card">
          <div className="um-card-header">
            <PeopleIcon className="um-card-icon" />
            <h2 className="um-card-title">Current Staff ({users.length})</h2>
          </div>
          
          {users.length === 0 ? (
            <div className="um-empty-state">
              <PeopleIcon className="um-empty-icon" />
              <p className="um-empty-text">No staff members found</p>
              <p className="um-empty-subtext">Add your first staff member to get started</p>
            </div>
          ) : (
            <div className="um-staff-list">
              {users.map((u) => (
                <div key={u.id} className="um-staff-card">
                  <div className="um-staff-info">
                    <div className="um-staff-avatar">
                      {u.role === 'admin' ? (
                        <AdminPanelSettingsIcon className="um-avatar-icon" />
                      ) : (
                        <RestaurantIcon className="um-avatar-icon" />
                      )}
                    </div>
                    <div className="um-staff-details">
                      <h3 className="um-staff-email">{u.email}</h3>
                      <div className="um-staff-meta">
                        <span
                          className="um-role-badge"
                          style={{
                            backgroundColor: u.role === 'admin' ? '#dc2626' : '#059669',
                          }}
                        >
                          {u.role === 'admin' ? 'Administrator' : 'Server'}
                        </span>
                        <span className="um-date-text">
                          Joined {new Date(u.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="um-staff-actions">
                    <button
                      onClick={() => handleEdit(u)}
                      className="um-edit-button"
                      title="Edit user"
                    >
                      <EditIcon className="um-action-icon" />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="um-delete-button"
                      title="Delete user"
                    >
                      <DeleteIcon className="um-action-icon" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="um-modal-overlay">
          <div className="um-modal">
            <div className="um-modal-header">
              <h2 className="um-modal-title">Edit Staff Member</h2>
              <button
                onClick={() => setEditUser(null)}
                className="um-close-button"
              >
                <CloseIcon />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="um-modal-form">
              <div className="um-input-group">
                <label className="um-label">
                  <EmailIcon className="um-input-icon" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  required
                  className="um-input"
                />
              </div>
              
              <div className="um-input-group">
                <label className="um-label">
                  <LockIcon className="um-input-icon" />
                  Password
                </label>
                <input
                  type="password"
                  value={editUser.password}
                  onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                  className="um-input"
                  placeholder="Leave blank to keep unchanged"
                />
              </div>
              
              <div className="um-input-group">
                <label className="um-label">
                  <PersonIcon className="um-input-icon" />
                  Role
                </label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                  className="um-select"
                >
                  <option value="server">Server</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              
              <div className="um-modal-actions">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="um-button um-secondary-button"
                >
                  Cancel
                </button>
                <button type="submit" className="um-button um-primary-button">
                  <SaveIcon className="um-button-icon" />
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;