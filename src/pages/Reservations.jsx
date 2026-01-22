import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { initSocket } from '../services/socket';
import { toast } from 'react-toastify';
import {
  TableRestaurant,
  Phone,
  Schedule,
  CheckCircle,
} from '@mui/icons-material';

function Reservations() {
  const [tables, setTables] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [reservation, setReservation] = useState({
    table_id: '',
    reservation_time: '',
    phone_number: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Utility function to format ISO 8601 to MySQL datetime (YYYY-MM-DD HH:MM:SS)
  const formatToMySQLDateTime = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };

  // Set default reservation time (30 minutes from now in CET)
  useEffect(() => {
    const now = new Date();
    const cetOffset = 1 * 60; // CET is UTC+1 (no DST in May 2025)
    const localOffset = now.getTimezoneOffset();
    const cetTime = new Date(now.getTime() + (cetOffset + localOffset) * 60 * 1000);
    const defaultTime = new Date(cetTime.getTime() + 30 * 60 * 1000);
    const formattedDefaultTime = defaultTime.toISOString().slice(0, 16);
    setReservation(prev => ({ ...prev, reservation_time: formattedDefaultTime }));
  }, []);

  useEffect(() => {
    let socketCleanup = () => {};

    const fetchTables = async () => {
      try {
        setLoading(true);
        const response = await api.getAvailableTables();
        const availableTables = response.data
          .map(table => ({
            ...table,
            reserved_until: table.reserved_until ? new Date(table.reserved_until).toISOString() : null,
          }))
          .filter(table => {
            const reservedUntil = table.reserved_until ? new Date(table.reserved_until) : null;
            return table.status === 'available' && (!reservedUntil || reservedUntil < new Date());
          });
        setTables(availableTables || []);
        setFilteredTables(availableTables || []);
        // Initialize Socket.IO
        socketCleanup = initSocket({
          onTableStatusUpdate: (data) => {
            setTables(prevTables =>
              prevTables.map(table =>
                table.id === data.table_id ? { ...table, status: data.status } : table
              )
            );
            toast.info(`Table ${data.table_id} status updated to ${data.status}`);
          },
        });
      } catch (error) {
        console.error('Error fetching tables:', error);
        toast.error(error.response?.data?.error || 'Failed to load tables');
        setError('Failed to load tables.');
      } finally {
        setLoading(false);
      }
    };

    fetchTables();

    return () => {
      socketCleanup();
    };
  }, []);

  useEffect(() => {
    if (reservation.reservation_time) {
      const selectedTime = new Date(reservation.reservation_time);
      // Add 15-minute buffer to assume reservation duration
      const bufferTime = new Date(selectedTime.getTime() + 15 * 60 * 1000);
      const availableAtTime = tables.filter(table => {
        const reservedUntil = table.reserved_until ? new Date(table.reserved_until) : null;
        return !reservedUntil || reservedUntil <= bufferTime;
      });
      setFilteredTables(availableAtTime);
      if (reservation.table_id && !availableAtTime.find(t => t.id === parseInt(reservation.table_id))) {
        setReservation({ ...reservation, table_id: '' });
        toast.warn('Selected table is not available at this time. Please choose another.');
      }
    } else {
      setFilteredTables(tables);
    }
  }, [reservation.reservation_time, tables]);

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^\+\d{10,15}$/;
    return phoneRegex.test(phone);
  };

  const handleReservation = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (!reservation.table_id || !reservation.reservation_time || !reservation.phone_number) {
        toast.error('All fields are required');
        return;
      }
      const reservationDate = new Date(reservation.reservation_time);
      if (reservationDate <= new Date()) {
        toast.error('Reservation time must be in the future');
        return;
      }
      if (!validatePhoneNumber(reservation.phone_number)) {
        toast.error('Phone number must be in international format (e.g., +1234567890)');
        return;
      }
      const selectedTable = tables.find(table => table.id === parseInt(reservation.table_id));
      if (!selectedTable) {
        toast.error('Selected table is no longer available');
        return;
      }
      const reservedUntil = selectedTable.reserved_until ? new Date(selectedTable.reserved_until) : null;
      if (selectedTable.status !== 'available' || (reservedUntil && reservedUntil > reservationDate)) {
        toast.error('Selected table is not available at the specified time');
        return;
      }
      const formattedReservationTime = formatToMySQLDateTime(reservation.reservation_time);
      await api.addReservation({
        ...reservation,
        reservation_time: formattedReservationTime,
      });
      toast.success('Reservation created successfully');
      setReservation({
        table_id: '',
        reservation_time: new Date(reservationDate.getTime() + 30 * 60 * 1000).toISOString().slice(0, 16),
        phone_number: '',
      });
      navigate('/');
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error(error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || 'Failed to create reservation');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = {
    container: {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f8fafc',
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    header: {
      textAlign: 'center',
      marginBottom: '24px',
    },
    title: {
      fontSize: '2rem',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },
    form: {
      maxWidth: '400px',
      width: '100%',
      padding: '24px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    formGroup: {
      marginBottom: '16px',
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontWeight: '500',
      color: '#374151',
      fontSize: '0.9rem',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '0.95rem',
      transition: 'border-color 0.2s',
      outline: 'none',
      backgroundColor: '#fff',
      boxSizing: 'border-box',
    },
    inputFocus: {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '0.95rem',
      outline: 'none',
      backgroundColor: '#fff',
      cursor: 'pointer',
      boxSizing: 'border-box',
    },
    buttonPrimary: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      padding: '10px 16px',
      borderRadius: '6px',
      fontSize: '0.95rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      justifyContent: 'center',
    },
    buttonDisabled: {
      backgroundColor: '#d1d5db',
      cursor: 'not-allowed',
    },
    error: {
      textAlign: 'center',
      color: '#ef4444',
      padding: '20px',
      fontSize: '1rem',
    },
    loading: {
      textAlign: 'center',
      color: '#64748b',
      padding: '20px',
      fontSize: '1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
    },
    noTables: {
      textAlign: 'center',
      color: '#64748b',
      padding: '20px',
      fontSize: '0.95rem',
    },
    disabledMessage: {
      textAlign: 'center',
      color: '#64748b',
      fontSize: '0.85rem',
      marginTop: '8px',
    },
    '@media (max-width: 600px)': {
      container: {
        padding: '16px',
      },
      form: {
        padding: '16px',
      },
      title: {
        fontSize: '1.5rem',
      },
    },
  };

  if (error) {
    return (
      <div style={styles.error}>
        <Cancel style={{ fontSize: '1.5rem', marginBottom: '8px' }} />
        Error: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <TableRestaurant style={{ fontSize: '2rem', marginBottom: '8px' }} />
        Loading tables...
      </div>
    );
  }

  const isFormValid = reservation.table_id && reservation.reservation_time && validatePhoneNumber(reservation.phone_number);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <TableRestaurant style={{ fontSize: '1.5rem' }} />
          Reserve a Table
        </h1>
      </div>
      <form onSubmit={handleReservation} style={styles.form}>
        <div style={styles.formGroup}>
          <label htmlFor="reservation_time" style={styles.label}>
            Reservation Time (CET)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Schedule style={{ color: '#64748b', fontSize: '1.2rem' }} />
            <input
              id="reservation_time"
              type="datetime-local"
              value={reservation.reservation_time}
              onChange={(e) => setReservation({ ...reservation, reservation_time: e.target.value })}
              style={styles.input}
              min={new Date().toISOString().slice(0, 16)}
              required
              onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
        <div style={styles.formGroup}>
          <label htmlFor="table_id" style={styles.label}>
            Select Table
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TableRestaurant style={{ color: '#64748b', fontSize: '1.2rem' }} />
            <select
              id="table_id"
              value={reservation.table_id}
              onChange={(e) => setReservation({ ...reservation, table_id: e.target.value })}
              style={styles.select}
              required
              disabled={!reservation.reservation_time}
            >
              <option value="">Select a Table</option>
              {filteredTables.length > 0 ? (
                filteredTables.map(table => (
                  <option key={table.id} value={table.id}>
                    {table.table_number} (Capacity: {table.capacity})
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No tables available
                </option>
              )}
            </select>
          </div>
          {!reservation.reservation_time && (
            <p style={styles.disabledMessage}>
              Please select a reservation time to enable table selection.
            </p>
          )}
        </div>
        <div style={styles.formGroup}>
          <label htmlFor="phone_number" style={styles.label}>
            WhatsApp Phone Number
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone style={{ color: '#64748b', fontSize: '1.2rem' }} />
            <input
              id="phone_number"
              type="tel"
              placeholder="e.g., +1234567890"
              value={reservation.phone_number}
              onChange={(e) => setReservation({ ...reservation, phone_number: e.target.value })}
              style={{
                ...styles.input,
                ...(reservation.phone_number && !validatePhoneNumber(reservation.phone_number) ? { borderColor: '#ef4444' } : {}),
              }}
              required
              onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={(e) => {
                e.target.style.borderColor = reservation.phone_number && !validatePhoneNumber(reservation.phone_number) ? '#ef4444' : '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          {reservation.phone_number && !validatePhoneNumber(reservation.phone_number) && (
            <p style={{ ...styles.disabledMessage, color: '#ef4444' }}>
              Please enter a valid phone number (e.g., +1234567890).
            </p>
          )}
        </div>
        <button
          type="submit"
          style={{
            ...styles.buttonPrimary,
            ...(submitting || !isFormValid ? styles.buttonDisabled : {}),
          }}
          disabled={submitting || !isFormValid}
          onMouseEnter={(e) => {
            if (!submitting && isFormValid) e.target.style.backgroundColor = '#2563eb';
          }}
          onMouseLeave={(e) => {
            if (!submitting && isFormValid) e.target.style.backgroundColor = '#3b82f6';
          }}
        >
          <CheckCircle style={{ fontSize: '1rem' }} />
          {submitting ? 'Reserving...' : 'Reserve Table'}
        </button>
      </form>
      {filteredTables.length === 0 && reservation.reservation_time && (
        <p style={styles.noTables}>
          No tables are available at the selected time. Please try a different time.
        </p>
      )}
    </div>
  );
}

export default Reservations;