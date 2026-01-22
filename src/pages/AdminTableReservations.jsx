import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { initSocket } from '../services/socket';
import {
  TableRestaurant,
  Schedule,
  Phone,
  CheckCircle,
  Pending,
  Cancel,
  Search,
  FilterList,
  Refresh,
  Dashboard,
  KeyboardArrowDown,
  Add,
  Edit,
  Delete,
  Close,
} from '@mui/icons-material';
import './css/AdminTableReservations.css';

function AdminTableReservations() {
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [formData, setFormData] = useState({
    table_id: '',
    reservation_time: '',
    phone_number: '',
    status: 'pending',
  });
  const [formErrors, setFormErrors] = useState({});
  const navigate = useNavigate();

  const formatToMySQLDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(phone);
  };

  const validateForm = (data) => {
    const errors = {};
    if (!data.table_id) errors.table_id = 'Table is required';
    if (!data.reservation_time) errors.reservation_time = 'Reservation time is required';
    else if (new Date(data.reservation_time) <= new Date())
      errors.reservation_time = 'Reservation time must be in the future';
    if (!data.phone_number) errors.phone_number = 'Phone number is required';
    else if (!validatePhoneNumber(data.phone_number))
      errors.phone_number = 'Phone number must be in international format (e.g., +1234567890)';
    if (!data.status) errors.status = 'Status is required';
    return errors;
  };

  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        const authRes = await api.get('/check-auth');
        if (!authRes.data || authRes.data.role !== 'admin') {
          toast.error('Admin access required');
          navigate('/login');
          return;
        }
        setUser(authRes.data);

        const resResponse = await api.getReservations();
        setReservations(resResponse.data || []);

        const tableResponse = await api.getAvailableTables();
        setTables(tableResponse.data || []);

        const socketCleanup = initSocket({
          onTableStatusUpdate: (data) => {
            setTables((prev) =>
              prev.map((table) =>
                table.id === data.table_id ? { ...table, status: data.status } : table
              )
            );
            toast.info(`Table ${data.table_id} status updated to ${data.status}`);
          },
          onReservationUpdate: (reservation) => {
            setReservations((prev) => {
              const updated = [
                reservation,
                ...prev.filter((r) => r.id !== reservation.id),
              ].sort((a, b) => b.id - a.id);
              setFilteredReservations(updated);
              return updated;
            });
            toast.success(
              `Reservation #${reservation.id} updated for table ${reservation.table_number}`
            );
          },
        });

        return () => socketCleanup();
      } catch (err) {
        console.error('Initialization failed:', err);
        toast.error(err.response?.data?.error || 'Failed to load data');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [navigate]);

  useEffect(() => {
    let filtered = reservations;

    if (searchTerm) {
      filtered = filtered.filter(
        (reservation) =>
          reservation.id.toString().includes(searchTerm) ||
          reservation.table_number.toString().includes(searchTerm) ||
          reservation.phone_number.includes(searchTerm)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (reservation) => reservation.status.toLowerCase() === statusFilter
      );
    }

    setFilteredReservations(filtered);
  }, [searchTerm, statusFilter, reservations]);

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    const errors = validateForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setIsLoading(true);
      const formattedData = {
        ...formData,
        reservation_time: formatToMySQLDateTime(formData.reservation_time),
        user_id: user.id,
      };
      await api.addReservation(formattedData);
      toast.success('Reservation created successfully');
      setShowCreateModal(false);
      setFormData({
        table_id: '',
        reservation_time: '',
        phone_number: '',
        status: 'pending',
      });
      const response = await api.getReservations();
      setReservations(response.data || []);
    } catch (err) {
      console.error('Error creating reservation:', err);
      toast.error(
        err.response?.data?.errors?.[0]?.msg ||
          err.response?.data?.error ||
          'Failed to create reservation'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditReservation = async (e) => {
    e.preventDefault();
    const errors = validateForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setIsLoading(true);
      const formattedData = {
        ...formData,
        reservation_time: formatToMySQLDateTime(formData.reservation_time),
        user_id: user.id,
      };
      await api.updateReservation(selectedReservation.id, formattedData);
      toast.success('Reservation updated successfully');
      setShowEditModal(false);
      setSelectedReservation(null);
      setFormData({
        table_id: '',
        reservation_time: '',
        phone_number: '',
        status: 'pending',
      });
      const response = await api.getReservations();
      setReservations(response.data || []);
    } catch (err) {
      console.error('Error updating reservation:', err);
      toast.error(
        err.response?.data?.errors?.[0]?.msg ||
          err.response?.data?.error ||
          'Failed to update reservation'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to delete this reservation?')) return;

    try {
      setIsLoading(true);
      await api.deleteReservation(reservationId, { user_id: user.id });
      toast.success('Reservation deleted successfully');
      setReservations((prev) => prev.filter((r) => r.id !== reservationId));
      setFilteredReservations((prev) => prev.filter((r) => r.id !== reservationId));
    } catch (err) {
      console.error('Error deleting reservation:', err);
      toast.error(
        err.response?.data?.error || 'Failed to delete reservation'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (reservation) => {
    setSelectedReservation(reservation);
    setFormData({
      table_id: reservation.table_id.toString(),
      reservation_time: new Date(reservation.reservation_time)
        .toISOString()
        .slice(0, 16),
      phone_number: reservation.phone_number,
      status: reservation.status.toLowerCase(),
    });
    setShowEditModal(true);
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return <CheckCircle className="admin-table-reservations__status-icon" />;
      case 'pending':
        return <Pending className="admin-table-reservations__status-icon" />;
      case 'cancelled':
        return <Cancel className="admin-table-reservations__status-icon" />;
      default:
        return <Pending className="admin-table-reservations__status-icon" />;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'admin-table-reservations__status-badge admin-table-reservations__status-confirmed';
      case 'pending':
        return 'admin-table-reservations__status-badge admin-table-reservations__status-pending';
      case 'cancelled':
        return 'admin-table-reservations__status-badge admin-table-reservations__status-cancelled';
      default:
        return 'admin-table-reservations__status-badge admin-table-reservations__status-default';
    }
  };

  const refreshReservations = async () => {
    setIsLoading(true);
    try {
      const [resResponse, tableResponse] = await Promise.all([
        api.getReservations(),
        api.getAvailableTables(),
      ]);
      setReservations(resResponse.data || []);
      setTables(tableResponse.data || []);
      toast.success('Data refreshed');
    } catch (err) {
      console.error('Error refreshing data:', err);
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="admin-table-reservations__loading-container">
        <div className="admin-table-reservations__loading-content">
          <div className="admin-table-reservations__spinner"></div>
          <p className="admin-table-reservations__loading-text">Loading reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-table-reservations__container">
      <div className="admin-table-reservations__main-wrapper">
        <div className="admin-table-reservations__header">
          <div className="admin-table-reservations__header-content">
            <div className="admin-table-reservations__header-left">
              <div className="admin-table-reservations__icon-container">
                <Dashboard className="admin-table-reservations__dashboard-icon" />
              </div>
              <div className="admin-table-reservations__title-section">
                <h1 className="admin-table-reservations__title">Table Reservations</h1>
                <p className="admin-table-reservations__subtitle">Manage and track all restaurant reservations</p>
              </div>
            </div>
            <div className="admin-table-reservations__button-group">
              <button
                onClick={refreshReservations}
                disabled={isLoading}
                className={`admin-table-reservations__button admin-table-reservations__refresh-button ${isLoading ? 'admin-table-reservations__button-disabled' : ''}`}
              >
                <Refresh className={`admin-table-reservations__refresh-icon ${isLoading ? 'admin-table-reservations__refresh-icon--spinning' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => {
                  setFormData({
                    table_id: '',
                    reservation_time: new Date(
                      Date.now() + 30 * 60 * 1000
                    ).toISOString().slice(0, 16),
                    phone_number: '',
                    status: 'pending',
                  });
                  setShowCreateModal(true);
                }}
                disabled={isLoading}
                className={`admin-table-reservations__button admin-table-reservations__create-button ${isLoading ? 'admin-table-reservations__button-disabled' : ''}`}
              >
                <Add className="admin-table-reservations__add-icon" />
                <span>New Reservation</span>
              </button>
            </div>
          </div>
        </div>

        <div className="admin-table-reservations__stats-grid">
          <div className="admin-table-reservations__stat-card">
            <div className="admin-table-reservations__stat-content">
              <div className="admin-table-reservations__stat-info">
                <div className="admin-table-reservations__stat-label">Total Reservations</div>
                <div className="admin-table-reservations__stat-value admin-table-reservations__stat-value--total">
                  {reservations.length}
                </div>
              </div>
              <TableRestaurant className="admin-table-reservations__table-icon" />
            </div>
          </div>
          <div className="admin-table-reservations__stat-card">
            <div className="admin-table-reservations__stat-content">
              <div className="admin-table-reservations__stat-info">
                <div className="admin-table-reservations__stat-label">Confirmed</div>
                <div className="admin-table-reservations__stat-value admin-table-reservations__stat-value--confirmed">
                  {reservations.filter((r) => r.status?.toLowerCase() === 'confirmed').length}
                </div>
              </div>
              <CheckCircle className="admin-table-reservations__check-icon" />
            </div>
          </div>
          <div className="admin-table-reservations__stat-card">
            <div className="admin-table-reservations__stat-content">
              <div className="admin-table-reservations__stat-info">
                <div className="admin-table-reservations__stat-label">Pending</div>
                <div className="admin-table-reservations__stat-value admin-table-reservations__stat-value--pending">
                  {reservations.filter((r) => r.status?.toLowerCase() === 'pending').length}
                </div>
              </div>
              <Pending className="admin-table-reservations__pending-icon" />
            </div>
          </div>
          <div className="admin-table-reservations__stat-card">
            <div className="admin-table-reservations__stat-content">
              <div className="admin-table-reservations__stat-info">
                <div className="admin-table-reservations__stat-label">Cancelled</div>
                <div className="admin-table-reservations__stat-value admin-table-reservations__stat-value--cancelled">
                  {reservations.filter((r) => r.status?.toLowerCase() === 'cancelled').length}
                </div>
              </div>
              <Cancel className="admin-table-reservations__cancel-icon" />
            </div>
          </div>
        </div>

        <div className="admin-table-reservations__filters-card">
          <div className="admin-table-reservations__filters-container">
            <div className="admin-table-reservations__search-container">
              <Search className="admin-table-reservations__search-icon" />
              <input
                type="text"
                placeholder="Search by ID, table number, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="admin-table-reservations__search-input"
              />
            </div>
            <div className="admin-table-reservations__filter-container">
              <FilterList className="admin-table-reservations__filter-icon" />
              <div className="admin-table-reservations__select-wrapper">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="admin-table-reservations__select"
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <KeyboardArrowDown className="admin-table-reservations__select-icon" />
              </div>
            </div>
          </div>
        </div>

        {filteredReservations.length === 0 ? (
          <div className="admin-table-reservations__empty-state">
            <TableRestaurant className="admin-table-reservations__empty-icon" />
            <h3 className="admin-table-reservations__empty-title">No reservations found</h3>
            <p className="admin-table-reservations__empty-description">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Reservations will appear here once customers make bookings.'}
            </p>
          </div>
        ) : (
          <>
            <div className="admin-table-reservations__table-container">
              <table className="admin-table-reservations__table">
                <thead className="admin-table-reservations__table-header">
                  <tr>
                    <th className="admin-table-reservations__table-header-cell">Reservation</th>
                    <th className="admin-table-reservations__table-header-cell">Table</th>
                    <th className="admin-table-reservations__table-header-cell">Date & Time</th>
                    <th className="admin-table-reservations__table-header-cell">Contact</th>
                    <th className="admin-table-reservations__table-header-cell">Status</th>
                    <th className="admin-table-reservations__table-header-cell">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((reservation) => (
                    <tr
                      key={reservation.id}
                      className="admin-table-reservations__table-row"
                    >
                      <td className="admin-table-reservations__table-cell">
                        <div className="admin-table-reservations__reservation-id">#{reservation.id}</div>
                      </td>
                      <td className="admin-table-reservations__table-cell">
                        <div className="admin-table-reservations__table-cell-content">
                          <TableRestaurant className="admin-table-reservations__table-icon--small" />
                          <span className="admin-table-reservations__table-number">
                            Table {reservation.table_number}
                          </span>
                        </div>
                      </td>
                      <td className="admin-table-reservations__table-cell">
                        <div className="admin-table-reservations__table-cell-content">
                          <Schedule className="admin-table-reservations__schedule-icon" />
                          <div>
                            <div className="admin-table-reservations__date-time">
                              {new Date(reservation.reservation_time).toLocaleDateString()}
                            </div>
                            <div className="admin-table-reservations__date-time-secondary">
                              {new Date(reservation.reservation_time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="admin-table-reservations__table-cell">
                        <div className="admin-table-reservations__table-cell-content">
                          <Phone className="admin-table-reservations__phone-icon" />
                          <span className="admin-table-reservations__phone-number">{reservation.phone_number}</span>
                        </div>
                      </td>
                      <td className="admin-table-reservations__table-cell">
                        <span className={getStatusBadgeClass(reservation.status)}>
                          {getStatusIcon(reservation.status)}
                          {reservation.status || 'Pending'}
                        </span>
                      </td>
                      <td className="admin-table-reservations__table-cell">
                        <div className="admin-table-reservations__action-buttons">
                          <button
                            onClick={() => openEditModal(reservation)}
                            className="admin-table-reservations__action-button admin-table-reservations__edit-button"
                          >
                            <Edit className="admin-table-reservations__edit-icon" />
                          </button>
                          <button
                            onClick={() => handleDeleteReservation(reservation.id)}
                            className="admin-table-reservations__action-button admin-table-reservations__delete-button"
                          >
                            <Delete className="admin-table-reservations__delete-icon" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-table-reservations__mobile-cards">
              {filteredReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="admin-table-reservations__mobile-card"
                >
                  <div className="admin-table-reservations__mobile-card-header">
                    <div className="admin-table-reservations__mobile-card-id">#{reservation.id}</div>
                    <div className="admin-table-reservations__mobile-card-actions">
                      <span className={getStatusBadgeClass(reservation.status)}>
                        {getStatusIcon(reservation.status)}
                        {reservation.status || 'Pending'}
                      </span>
                      <button
                        onClick={() => openEditModal(reservation)}
                        className="admin-table-reservations__action-button admin-table-reservations__edit-button"
                      >
                        <Edit className="admin-table-reservations__edit-icon" />
                      </button>
                      <button
                        onClick={() => handleDeleteReservation(reservation.id)}
                        className="admin-table-reservations__action-button admin-table-reservations__delete-button"
                      >
                        <Delete className="admin-table-reservations__delete-icon" />
                      </button>
                    </div>
                  </div>
                  <div className="admin-table-reservations__mobile-card-body">
                    <div className="admin-table-reservations__mobile-card-row">
                      <TableRestaurant className="admin-table-reservations__table-icon--mobile" />
                      <span className="admin-table-reservations__mobile-card-label">
                        Table {reservation.table_number}
                      </span>
                    </div>
                    <div className="admin-table-reservations__mobile-card-row">
                      <Schedule className="admin-table-reservations__schedule-icon--mobile" />
                      <div>
                        <div className="admin-table-reservations__mobile-card-label">
                          {new Date(reservation.reservation_time).toLocaleDateString()}
                        </div>
                        <div className="admin-table-reservations__mobile-card-value">
                          {new Date(reservation.reservation_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="admin-table-reservations__mobile-card-row">
                      <Phone className="admin-table-reservations__phone-icon--mobile" />
                      <span className="admin-table-reservations__mobile-card-label">{reservation.phone_number}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {showCreateModal && (
          <div className="admin-table-reservations__modal-overlay">
            <div className="admin-table-reservations__modal">
              <div className="admin-table-reservations__modal-header">
                <h2 className="admin-table-reservations__modal-title">Create New Reservation</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="admin-table-reservations__close-button"
                >
                  <Close className="admin-table-reservations__close-icon" />
                </button>
              </div>
              <form onSubmit={handleCreateReservation}>
                <div className="admin-table-reservations__modal-body">
                  <div className="admin-table-reservations__form-group">
                    <label className="admin-table-reservations__label">Table</label>
                    <select
                      value={formData.table_id}
                      onChange={(e) =>
                        setFormData({ ...formData, table_id: e.target.value })
                      }
                      className={`admin-table-reservations__select ${formErrors.table_id ? 'admin-table-reservations__input-error' : ''}`}
                    >
                      <option value="">Select a Table</option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          Table {table.table_number} (Capacity: {table.capacity})
                        </option>
                      ))}
                    </select>
                    {formErrors.table_id && (
                      <span className="admin-table-reservations__error-text">{formErrors.table_id}</span>
                    )}
                  </div>
                  <div className="admin-table-reservations__form-group">
                    <label className="admin-table-reservations__label">Reservation Time (CET)</label>
                    <input
                      type="datetime-local"
                      value={formData.reservation_time}
                      onChange={(e) =>
                        setFormData({ ...formData, reservation_time: e.target.value })
                      }
                      className={`admin-table-reservations__input ${formErrors.reservation_time ? 'admin-table-reservations__input-error' : ''}`}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    {formErrors.reservation_time && (
                      <span className="admin-table-reservations__error-text">{formErrors.reservation_time}</span>
                    )}
                  </div>
                  <div className="admin-table-reservations__form-group">
                    <label className="admin-table-reservations__label">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g., +1234567890"
                      value={formData.phone_number}
                      onChange={(e) =>
                        setFormData({ ...formData, phone_number: e.target.value })
                      }
                      className={`admin-table-reservations__input ${formErrors.phone_number ? 'admin-table-reservations__input-error' : ''}`}
                    />
                    {formErrors.phone_number && (
                      <span className="admin-table-reservations__error-text">{formErrors.phone_number}</span>
                    )}
                  </div>
                  <div className="admin-table-reservations__form-group">
                    <label className="admin-table-reservations__label">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className={`admin-table-reservations__select ${formErrors.status ? 'admin-table-reservations__input-error' : ''}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    {formErrors.status && (
                      <span className="admin-table-reservations__error-text">{formErrors.status}</span>
                    )}
                  </div>
                </div>
                <div className="admin-table-reservations__modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="admin-table-reservations__cancel-button"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`admin-table-reservations__submit-button ${isLoading ? 'admin-table-reservations__submit-button-disabled' : ''}`}
                  >
                    Create Reservation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && selectedReservation && (
          <div className="admin-table-reservations__modal-overlay">
            <div className="admin-table-reservations__modal">
              <div className="admin-table-reservations__modal-header">
                <h2 className="admin-table-reservations__modal-title">Edit Reservation #{selectedReservation.id}</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="admin-table-reservations__close-button"
                >
                  <Close className="admin-table-reservations__close-icon" />
                </button>
              </div>
              <form onSubmit={handleEditReservation}>
                <div className="admin-table-reservations__modal-body">
                  <div className="admin-table-reservations__form-group">
                    <label className="admin-table-reservations__label">Table</label>
                    <select
                      value={formData.table_id}
                      onChange={(e) =>
                        setFormData({ ...formData, table_id: e.target.value })
                      }
                      className={`admin-table-reservations__select ${formErrors.table_id ? 'admin-table-reservations__input-error' : ''}`}
                    >
                      <option value="">Select a Table</option>
                      {tables.map((table) => (
                        <option key={table.id} value={table.id}>
                          Table {table.table_number} (Capacity: {table.capacity})
                        </option>
                      ))}
                    </select>
                    {formErrors.table_id && (
                      <span className="admin-table-reservations__error-text">{formErrors.table_id}</span>
                    )}
                  </div>
                  <div className="admin-table-reservations__form-group">
                    <label className="admin-table-reservations__label">Reservation Time (CET)</label>
                    <input
                      type="datetime-local"
                      value={formData.reservation_time}
                      onChange={(e) =>
                        setFormData({ ...formData, reservation_time: e.target.value })
                      }
                      className={`admin-table-reservations__input ${formErrors.reservation_time ? 'admin-table-reservations__input-error' : ''}`}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                    {formErrors.reservation_time && (
                      <span className="admin-table-reservations__error-text">{formErrors.reservation_time}</span>
                    )}
                  </div>
                  <div className="admin-table-reservations__form-group">
                    <label className="admin-table-reservations__label">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g., +1234567890"
                      value={formData.phone_number}
                      onChange={(e) =>
                        setFormData({ ...formData, phone_number: e.target.value })
                      }
                      className={`admin-table-reservations__input ${formErrors.phone_number ? 'admin-table-reservations__input-error' : ''}`}
                    />
                    {formErrors.phone_number && (
                      <span className="admin-table-reservations__error-text">{formErrors.phone_number}</span>
                    )}
                  </div>
                  <div className="admin-table-reservations__form-group">
                    <label className="admin-table-reservations__label">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                      className={`admin-table-reservations__select ${formErrors.status ? 'admin-table-reservations__input-error' : ''}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    {formErrors.status && (
                      <span className="admin-table-reservations__error-text">{formErrors.status}</span>
                    )}
                  </div>
                </div>
                <div className="admin-table-reservations__modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="admin-table-reservations__cancel-button"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`admin-table-reservations__submit-button ${isLoading ? 'admin-table-reservations__submit-button-disabled' : ''}`}
                  >
                    Update Reservation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminTableReservations;