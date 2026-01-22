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
} from '@mui/icons-material';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import './css/StaffTableReservations.css';

function StaffTableReservations() {
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true);
        const authRes = await api.get('/check-auth');
        if (!authRes.data || authRes.data.role !== 'server') {
          toast.error('Staff access required');
          navigate('/login');
          return;
        }
        setUser(authRes.data);

        const response = await api.get('/reservations');
        const sortedReservations = (response.data || []).sort((a, b) => b.id - a.id);
        setReservations(sortedReservations);
        setFilteredReservations(sortedReservations);

        const socketCleanup = initSocket(
          () => {},
          () => {},
          (data) => {
            toast.info(`Table ${data.table_id} status updated to ${data.status}`);
          },
          (reservation) => {
            setReservations((prev) => {
              const updated = [
                reservation,
                ...prev.filter((r) => r.id !== reservation.id),
              ].sort((a, b) => b.id - a.id);
              setFilteredReservations(updated);
              return updated;
            });
            toast.success(
              `New reservation #${reservation.id} received for table ${reservation.table_number}`
            );
          },
          () => {}
        );

        return () => {
          if (typeof socketCleanup === 'function') {
            socketCleanup();
          }
        };
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

  const handleStatusChange = async (reservationId, newStatus) => {
    try {
      setIsLoading(true);
      await api.put(`/reservations/${reservationId}`, {
        status: newStatus,
        user_id: user.id,
      });
      setReservations((prev) =>
        prev.map((reservation) =>
          reservation.id === reservationId
            ? { ...reservation, status: newStatus }
            : reservation
        )
      );
      setFilteredReservations((prev) =>
        prev.map((reservation) =>
          reservation.id === reservationId
            ? { ...reservation, status: newStatus }
            : reservation
        )
      );
      toast.success(`Reservation #${reservationId} updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating reservation:', error);
      toast.error(
        error.response?.data?.errors?.[0]?.msg ||
          error.response?.data?.error ||
          'Failed to update reservation'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const refreshReservations = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/reservations');
      const sortedReservations = (response.data || []).sort((a, b) => b.id - a.id);
      setReservations(sortedReservations);
      setFilteredReservations(sortedReservations);
      toast.success('Reservations refreshed');
    } catch (error) {
      console.error('Error refreshing reservations:', error);
      toast.error('Failed to refresh reservations');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return <CheckCircle style={{ fontSize: '16px' }} />;
      case 'pending':
        return <Pending style={{ fontSize: '16px' }} />;
      case 'cancelled':
        return <Cancel style={{ fontSize: '16px' }} />;
      default:
        return <Pending style={{ fontSize: '16px' }} />;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'staff-reservations-status-confirmed';
      case 'pending':
        return 'staff-reservations-status-pending';
      case 'cancelled':
        return 'staff-reservations-status-cancelled';
      default:
        return 'staff-reservations-status-default';
    }
  };

  if (isLoading || !user) {
    return (
      <div className="staff-reservations-loading-container">
        <div className="staff-reservations-loading-content">
          <div className="staff-reservations-spinner"></div>
          <p className="staff-reservations-loading-text">Loading reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-reservations-container">
      <div className="staff-reservations-main-wrapper">
        <div className="staff-reservations-header">
          <div className="staff-reservations-header-content">
            <div className="staff-reservations-header-left">
              <div className="staff-reservations-icon-container">
                <Dashboard style={{ color: 'white', fontSize: '28px' }} />
              </div>
              <div className="staff-reservations-title-section">
                <h1 className="staff-reservations-title">Staff Table Reservations</h1>
                <p className="staff-reservations-subtitle">View and manage reservation statuses</p>
              </div>
            </div>
            <button
              onClick={refreshReservations}
              disabled={isLoading}
              className={`staff-reservations-refresh-button ${isLoading ? 'staff-reservations-refresh-button-disabled' : ''}`}
            >
              <Refresh
                style={{
                  fontSize: '18px',
                  ...(isLoading ? { animation: 'spin 1s linear infinite' } : {}),
                }}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="staff-reservations-stats-grid">
          <div className="staff-reservations-stat-card">
            <div className="staff-reservations-stat-content">
              <div className="staff-reservations-stat-info">
                <div className="staff-reservations-stat-label">Total Reservations</div>
                <div className="staff-reservations-stat-value" style={{ color: '#0f172a' }}>
                  {reservations.length}
                </div>
              </div>
              <TableRestaurant style={{ color: '#64748b', fontSize: '32px' }} />
            </div>
          </div>
          <div className="staff-reservations-stat-card">
            <div className="staff-reservations-stat-content">
              <div className="staff-reservations-stat-info">
                <div className="staff-reservations-stat-label">Confirmed</div>
                <div className="staff-reservations-stat-value" style={{ color: '#059669' }}>
                  {reservations.filter((r) => r.status?.toLowerCase() === 'confirmed').length}
                </div>
              </div>
              <CheckCircle style={{ color: '#059669', fontSize: '32px' }} />
            </div>
          </div>
          <div className="staff-reservations-stat-card">
            <div className="staff-reservations-stat-content">
              <div className="staff-reservations-stat-info">
                <div className="staff-reservations-stat-label">Pending</div>
                <div className="staff-reservations-stat-value" style={{ color: '#d97706' }}>
                  {reservations.filter((r) => r.status?.toLowerCase() === 'pending').length}
                </div>
              </div>
              <Pending style={{ color: '#d97706', fontSize: '32px' }} />
            </div>
          </div>
          <div className="staff-reservations-stat-card">
            <div className="staff-reservations-stat-content">
              <div className="staff-reservations-stat-info">
                <div className="staff-reservations-stat-label">Cancelled</div>
                <div className="staff-reservations-stat-value" style={{ color: '#dc2626' }}>
                  {reservations.filter((r) => r.status?.toLowerCase() === 'cancelled').length}
                </div>
              </div>
              <Cancel style={{ color: '#dc2626', fontSize: '32px' }} />
            </div>
          </div>
        </div>

        <div className="staff-reservations-filters-card">
          <div className="staff-reservations-filters-container">
            <div className="staff-reservations-search-container">
              <Search className="staff-reservations-search-icon" />
              <input
                type="text"
                placeholder="Search by ID, table number, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="staff-reservations-search-input"
              />
            </div>
            <div className="staff-reservations-filter-container">
              <FilterList style={{ color: '#6b7280', fontSize: '20px' }} />
              <div className="staff-reservations-select-wrapper">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="staff-reservations-select"
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <KeyboardArrowDown className="staff-reservations-select-icon" />
              </div>
            </div>
          </div>
        </div>

        {filteredReservations.length === 0 ? (
          <div className="staff-reservations-empty-state">
            <TableRestaurant className="staff-reservations-empty-icon" />
            <h3 className="staff-reservations-empty-title">No reservations found</h3>
            <p className="staff-reservations-empty-description">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Reservations will appear here once customers make bookings.'}
            </p>
          </div>
        ) : (
          <>
            <div className="staff-reservations-table-container">
              <table className="staff-reservations-table">
                <thead className="staff-reservations-table-header">
                  <tr>
                    <th className="staff-reservations-table-header-cell">Reservation</th>
                    <th className="staff-reservations-table-header-cell">Table</th>
                    <th className="staff-reservations-table-header-cell">Date & Time</th>
                    <th className="staff-reservations-table-header-cell">Contact</th>
                    <th className="staff-reservations-table-header-cell">Status</th>
                    <th className="staff-reservations-table-header-cell">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.id} className="staff-reservations-table-row">
                      <td className="staff-reservations-table-cell">
                        <div className="staff-reservations-reservation-id">#{reservation.id}</div>
                      </td>
                      <td className="staff-reservations-table-cell">
                        <div className="staff-reservations-table-cell-content">
                          <TableRestaurant style={{ color: '#9ca3af', fontSize: '18px' }} />
                          <span className="staff-reservations-table-number">
                            Table {reservation.table_number}
                          </span>
                        </div>
                      </td>
                      <td className="staff-reservations-table-cell">
                        <div className="staff-reservations-table-cell-content">
                          <Schedule style={{ color: '#9ca3af', fontSize: '18px' }} />
                          <div>
                            <div className="staff-reservations-date-time">
                              {new Date(reservation.reservation_time).toLocaleDateString()}
                            </div>
                            <div className="staff-reservations-date-time-secondary">
                              {new Date(reservation.reservation_time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="staff-reservations-table-cell">
                        <div className="staff-reservations-table-cell-content">
                          <Phone style={{ color: '#9ca3af', fontSize: '18px' }} />
                          <span className="staff-reservations-phone-number">{reservation.phone_number}</span>
                        </div>
                      </td>
                      <td className="staff-reservations-table-cell">
                        <span className={`staff-reservations-status-badge ${getStatusBadgeClass(reservation.status)}`}>
                          {getStatusIcon(reservation.status)}
                          {reservation.status || 'Pending'}
                        </span>
                      </td>
                      <td className="staff-reservations-table-cell">
                        <FormControl variant="outlined" size="small">
                          <InputLabel>Status</InputLabel>
                          <Select
                            value={reservation.status || 'pending'}
                            onChange={(e) =>
                              handleStatusChange(reservation.id, e.target.value)
                            }
                            label="Status"
                            disabled={isLoading}
                          >
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="confirmed">Confirmed</MenuItem>
                            <MenuItem value="cancelled">Cancelled</MenuItem>
                          </Select>
                        </FormControl>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="staff-reservations-mobile-cards">
              {filteredReservations.map((reservation) => (
                <div key={reservation.id} className="staff-reservations-mobile-card">
                  <div className="staff-reservations-mobile-card-header">
                    <div className="staff-reservations-mobile-card-id">#{reservation.id}</div>
                    <span className={`staff-reservations-status-badge ${getStatusBadgeClass(reservation.status)}`}>
                      {getStatusIcon(reservation.status)}
                      {reservation.status || 'Pending'}
                    </span>
                  </div>
                  <div className="staff-reservations-mobile-card-body">
                    <div className="staff-reservations-mobile-card-row">
                      <TableRestaurant style={{ color: '#9ca3af', fontSize: '20px' }} />
                      <span className="staff-reservations-mobile-card-label">
                        Table {reservation.table_number}
                      </span>
                    </div>
                    <div className="staff-reservations-mobile-card-row">
                      <Schedule style={{ color: '#9ca3af', fontSize: '20px' }} />
                      <div>
                        <div className="staff-reservations-mobile-card-label">
                          {new Date(reservation.reservation_time).toLocaleDateString()}
                        </div>
                        <div className="staff-reservations-mobile-card-value">
                          {new Date(reservation.reservation_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="staff-reservations-mobile-card-row">
                      <Phone style={{ color: '#9ca3af', fontSize: '20px' }} />
                      <span className="staff-reservations-mobile-card-label">{reservation.phone_number}</span>
                    </div>
                    <div className="staff-reservations-mobile-card-row">
                      <FormControl variant="outlined" size="small" fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={reservation.status || 'pending'}
                          onChange={(e) =>
                            handleStatusChange(reservation.id, e.target.value)
                          }
                          label="Status"
                          disabled={isLoading}
                        >
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="confirmed">Confirmed</MenuItem>
                          <MenuItem value="cancelled">Cancelled</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default StaffTableReservations;