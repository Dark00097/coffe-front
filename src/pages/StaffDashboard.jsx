import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  CircularProgress,
  Grid,
} from '@mui/material';
import { Receipt, CheckCircle, Cancel, Refresh, Assignment, ShoppingCart, AccessTime } from '@mui/icons-material';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import OrderCard from '../components/OrderCard';
import './css/StaffDashboard.css';

function StaffDashboard({ user, handleNewNotification, socket }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('day');
  const [approvedFilter, setApprovedFilter] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const orderRefs = useRef({});
  const hasScrolled = useRef(false);

  const getTimeAgo = useCallback((createdAt) => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffMs = now - orderTime;
    const diffMins = Math.round(diffMs / 60000);

    if (diffMs < 0) return "à l'instant";
    if (diffMins < 1) return "à l'instant";
    if (diffMins === 1) return 'il y a 1 min';
    if (diffMins < 60) return `il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'il y a 1 heure';
    if (diffHours < 24) return `il y a ${diffHours} heures`;
    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? 'il y a 1 jour' : `il y a ${diffDays} jours`;
  }, []);

  const processOrder = useCallback((order) => {
    if (!order?.id) {
      console.error('Invalid order data:', order);
      return null;
    }

    const normalizeField = (field) =>
      Array.isArray(field) ? field : typeof field === 'string' && field ? field.split(',') : [];

    return {
      ...order,
      approved: Number(order.approved || 0),
      status: order.status || 'en attente',
      item_ids: normalizeField(order.item_ids),
      item_names: normalizeField(order.item_names),
      unit_prices: normalizeField(order.unit_prices).map((price) => parseFloat(price) || 0),
      menu_quantities: normalizeField(order.menu_quantities).map((qty) => parseInt(qty, 10) || 0),
      supplement_ids: normalizeField(order.supplement_ids),
      supplement_names: normalizeField(order.supplement_names),
      supplement_prices: normalizeField(order.supplement_prices).map((price) => parseFloat(price) || 0),
      image_urls: normalizeField(order.image_urls),
      breakfast_ids: normalizeField(order.breakfast_ids),
      breakfast_names: normalizeField(order.breakfast_names),
      breakfast_quantities: normalizeField(order.breakfast_quantities).map((qty) => parseInt(qty, 10) || 0),
      breakfast_images: normalizeField(order.breakfast_images),
      breakfast_option_ids: normalizeField(order.breakfast_option_ids),
      breakfast_option_names: normalizeField(order.breakfast_option_names).map((names) =>
        typeof names === 'string' && names
          ? names.split('|').map((name) => name?.trim() || 'Option inconnue')
          : ['Option inconnue']
      ),
      breakfast_option_prices: normalizeField(order.breakfast_option_prices).map((prices) =>
        typeof prices === 'string' && prices
          ? prices.split('|').map((price) => parseFloat(price) || 0)
          : []
      ),
      timeAgo: getTimeAgo(order.created_at),
    };
  }, [getTimeAgo]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!user || !['admin', 'server'].includes(user.role)) {
        throw new Error("Vous n'avez pas la permission de voir les commandes");
      }

      const params = {};
      if (timeRange && timeRange !== 'all') params.time_range = timeRange;
      if (approvedFilter !== '') params.approved = approvedFilter;

      const res = await api.get('/orders', { params });
      const fetchedOrders = res.data.data
        .map(processOrder)
        .filter((order) => {
          if (!order) {
            console.warn('Filtered out invalid order');
            return false;
          }
          return true;
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setOrders(fetchedOrders);
      console.log('Commandes récupérées avec succès:', fetchedOrders.length);
    } catch (err) {
      console.error('Erreur lors de la récupération des commandes:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      const errorMessage = err.response?.data?.error || err.message || 'Échec du chargement des commandes';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user, timeRange, approvedFilter, processOrder]);

  const handleScrollAndExpand = useCallback(() => {
    const queryParams = new URLSearchParams(location.search);
    const scrollToOrderId = parseInt(queryParams.get('scrollTo'));
    const expandOrderId = parseInt(queryParams.get('expandOrder'));

    if (!isLoading && orders.length > 0 && !hasScrolled.current && !isNaN(scrollToOrderId) && orderRefs.current[scrollToOrderId]) {
      const orderExists = orders.some((order) => order.id === scrollToOrderId);
      if (orderExists) {
        orderRefs.current[scrollToOrderId].scrollIntoView({ behavior: 'smooth', block: 'start' });
        hasScrolled.current = true;
        setTimeout(() => {
          queryParams.delete('scrollTo');
          queryParams.delete('expandOrder');
          navigate(`/staff?${queryParams.toString()}`, { replace: true });
        }, 1000);
      } else {
        toast.warn(`Commande #${scrollToOrderId} non trouvée dans la vue actuelle`);
        queryParams.delete('scrollTo');
        queryParams.delete('expandOrder');
        navigate(`/staff?${queryParams.toString()}`, { replace: true });
      }
    }
  }, [isLoading, orders, location, navigate]);

  useEffect(() => {
    handleScrollAndExpand();
  }, [handleScrollAndExpand]);

  const handleNewOrder = useCallback(
    (order) => {
      console.log('handleNewOrder déclenché avec la commande:', order);
      if (!order?.id) {
        console.error('Données de nouvelle commande invalides:', order);
        toast.warn('Données de commande reçues invalides');
        return;
      }

      const normalizedOrder = { ...order, approved: Number(order.approved || 0), status: order.status || 'en attente' };
      console.log('Commande normalisée:', normalizedOrder);

      const now = new Date();
      const orderTime = new Date(normalizedOrder.created_at);
      const diffMs = now - orderTime;
      const diffHours = diffMs / (1000 * 60 * 60);
      const matchesTimeRange =
        timeRange === 'all' ||
        (timeRange === 'day' && diffHours < 24 && orderTime >= new Date().setHours(0, 0, 0, 0)) ||
        (timeRange === 'hour' && diffHours < 1);
      const matchesApproved =
        approvedFilter === '' ||
        (approvedFilter === '1' && normalizedOrder.approved === 1) ||
        (approvedFilter === '0' && normalizedOrder.approved === 0);

      console.log('Vérification des filtres:', { matchesTimeRange, matchesApproved, timeRange, approvedFilter });

      if (matchesTimeRange && matchesApproved) {
        setOrders((prev) => {
          if (prev.some((o) => o.id === normalizedOrder.id)) {
            console.log('Commande déjà existante, ignorée:', normalizedOrder.id);
            return prev;
          }
          const enrichedOrder = processOrder(normalizedOrder);
          if (!enrichedOrder) {
            console.error('Échec du traitement de la commande:', normalizedOrder);
            return prev;
          }
          console.log("Ajout de la nouvelle commande à l'état:", enrichedOrder);
          handleNewNotification({
            id: `order_${normalizedOrder.id}`,
            type: 'order',
            message: `Nouvelle commande #${normalizedOrder.id} reçue`,
            reference_id: normalizedOrder.id.toString(),
            is_read: 1,
            created_at: new Date().toISOString(),
          });
          toast.info(`Nouvelle commande #${normalizedOrder.id} reçue !`, { autoClose: 5000 });
          const newOrders = [enrichedOrder, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          console.log('État des commandes mis à jour:', newOrders.length);
          return newOrders;
        });
      } else {
        console.log('Commande filtrée:', { orderId: order.id, matchesTimeRange, matchesApproved });
      }
    },
    [timeRange, approvedFilter, handleNewNotification, processOrder]
  );

  const handleOrderUpdate = useCallback(
    ({ orderId, status, orderDetails }) => {
      console.log('StaffDashboard a reçu une mise à jour de commande:', { orderId, status, orderDetails });
      if (!orderId) {
        console.error('Données de mise à jour de commande invalides:', { orderId, status, orderDetails });
        return;
      }
      setOrders((prev) => {
        const updatedOrders = prev
          .map((order) =>
            order.id === parseInt(orderId)
              ? processOrder({ ...order, status, ...orderDetails, approved: Number(orderDetails.approved || 0) })
              : order
          )
          .filter((order) => order !== null)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return updatedOrders;
      });
      toast.info(`Commande ${orderId} mise à jour à ${status}`);
    },
    [processOrder]
  );

  const handleOrderApproved = useCallback(
    ({ orderId, status, orderDetails }) => {
      console.log('StaffDashboard a reçu une commande approuvée:', { orderId, status, orderDetails });
      if (!orderId) {
        console.error('Données de commande approuvée invalides:', { orderId, orderDetails });
        return;
      }
      setOrders((prev) => {
        const updatedOrders = prev
          .map((order) =>
            order.id === parseInt(orderId)
              ? processOrder({
                  ...order,
                  status: status || 'en préparation',
                  ...orderDetails,
                  approved: 1,
                })
              : order
          )
          .filter((order) => order !== null)
          .filter((order) => (
            approvedFilter === '' ||
            (approvedFilter === '1' && order.approved === 1) ||
            (approvedFilter === '0' && order.approved === 0)
          ))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return updatedOrders;
      });
      toast.info(`Commande #${orderId} approuvée`);
      if (socket && socket.connected) {
        socket.emit('orderApproved', {
          orderId,
          status: status || 'en préparation',
          orderDetails: processOrder({
            ...orderDetails,
            approved: 1,
            status: status || 'en préparation',
          }),
        });
      } else {
        console.warn("Socket non connecté, impossible d'émettre l'événement orderApproved");
        toast.warn('Les mises à jour en temps réel peuvent être retardées en raison de problèmes de connexion');
      }
    },
    [approvedFilter, processOrder, socket]
  );

  const handleOrderCancelled = useCallback(
    ({ orderId, status, orderDetails }) => {
      console.log('StaffDashboard a reçu une commande annulée:', { orderId, status, orderDetails });
      if (!orderId) {
        console.error('Données de commande annulée invalides:', { orderId, orderDetails });
        return;
      }
      setOrders((prev) => {
        const updatedOrders = prev
          .map((order) =>
            order.id === parseInt(orderId)
              ? processOrder({
                  ...order,
                  status: status || 'annulée',
                  ...orderDetails,
                  approved: 0,
                })
              : order
          )
          .filter((order) => order !== null)
          .filter((order) => (
            approvedFilter === '' ||
            (approvedFilter === '1' && order.approved === 1) ||
            (approvedFilter === '0' && order.approved === 0)
          ))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return updatedOrders;
      });
      toast.info(`Commande #${orderId} annulée`);
      if (socket && socket.connected) {
        socket.emit('orderCancelled', {
          orderId,
          status: status || 'annulée',
          orderDetails: processOrder({
            ...orderDetails,
            approved: 0,
            status: status || 'annulée',
          }),
        });
      } else {
        console.warn("Socket non connecté, impossible d'émettre l'événement orderCancelled");
        toast.warn('Les mises à jour en temps réel peuvent être retardées en raison de problèmes de connexion');
      }
    },
    [approvedFilter, processOrder, socket]
  );

  useEffect(() => {
    if (!user || !handleNewNotification || !socket) {
      setError('Utilisateur, gestionnaire de notifications ou socket manquant');
      setIsLoading(false);
      return;
    }

    fetchOrders();

    socket.on('newOrder', handleNewOrder);
    socket.on('orderUpdate', handleOrderUpdate);
    socket.on('orderApproved', handleOrderApproved);
    socket.on('orderCancelled', handleOrderCancelled);

    return () => {
      socket.off('newOrder', handleNewOrder);
      socket.off('orderUpdate', handleOrderUpdate);
      socket.off('orderApproved', handleOrderApproved);
      socket.off('orderCancelled', handleOrderCancelled);
      console.log('Nettoyage des écouteurs de socket de StaffDashboard');
    };
  }, [user, handleNewNotification, socket, fetchOrders, handleNewOrder, handleOrderUpdate, handleOrderApproved, handleOrderCancelled]);

  const approveOrder = useCallback(
    async (orderId) => {
      if (!orderId || isNaN(orderId)) {
        console.error('ID de commande invalide:', orderId);
        toast.error('ID de commande invalide');
        return;
      }
      try {
        const response = await api.approveOrder(orderId, {});
        const orderDetails = response.data.order || { approved: 1, status: 'en préparation' };
        handleOrderApproved({ orderId, status: 'en préparation', orderDetails });
      } catch (error) {
        console.error("Erreur lors de l'approbation de la commande:", error);
        toast.error(error.response?.data?.error || "Échec de l'approbation de la commande");
      }
    },
    [handleOrderApproved]
  );

  const cancelOrder = useCallback(
    async (orderId, { restoreStock = false }) => {
      if (!orderId || isNaN(orderId)) {
        console.error('ID de commande invalide:', orderId);
        toast.error('ID de commande invalide');
        return;
      }
      try {
        const response = await api.cancelOrder(orderId, { restoreStock });
        const orderDetails = response.data.order || { approved: 0, status: 'annulée' };
        handleOrderCancelled({ orderId, status: 'annulée', orderDetails });
      } catch (error) {
        console.error("Erreur lors de l'annulation de la commande:", error);
        toast.error(error.response?.data?.error || "Échec de l'annulation de la commande");
      }
    },
    [handleOrderCancelled]
  );

  const queryParams = new URLSearchParams(location.search);
  const expandOrderId = parseInt(queryParams.get('expandOrder'));

  const memoizedOrders = useMemo(() => orders, [orders]);

  const orderStats = useMemo(() => {
    const totalOrders = memoizedOrders.length;
    const approvedOrders = memoizedOrders.filter((order) => order.approved === 1).length;
    const cancelledOrders = memoizedOrders.filter((order) => order.status === 'annulée').length;
    const notApprovedOrders = memoizedOrders.filter((order) => order.approved === 0 && order.status !== 'annulée').length;
    return { totalOrders, approvedOrders, notApprovedOrders, cancelledOrders };
  }, [memoizedOrders]);

  return (
    <Box className="staff-dashboard-container" role="main">
      <Box className="staff-dashboard-header">
        <Box className="staff-dashboard-header-content">
          <Typography variant="h4" className="staff-dashboard-title">
            <Assignment className="staff-dashboard-title-icon" />
            Tableau de bord du personnel
          </Typography>
          <Typography className="staff-dashboard-subtitle">
            Gérer et approuver les commandes en temps réel, {user?.name || 'Personnel'}
          </Typography>
        </Box>
      </Box>

      <Box className="staff-dashboard-metrics">
        <Box className="staff-dashboard-info">
          <Typography className="staff-dashboard-info-item">
            <Receipt />
            Total des commandes
            <span>{orderStats.totalOrders}</span>
          </Typography>
          <Typography className="staff-dashboard-info-item">
            <CheckCircle />
            Approuvées
            <span>{orderStats.approvedOrders}</span>
          </Typography>
          <Typography className="staff-dashboard-info-item">
            <AccessTime />
            En attente
            <span>{orderStats.notApprovedOrders}</span>
          </Typography>
          <Typography className="staff-dashboard-info-item">
            <Cancel />
            Annulées
            <span>{orderStats.cancelledOrders}</span>
          </Typography>
        </Box>
      </Box>

      <Box className="staff-dashboard-filter-section">
        <Box className="staff-dashboard-filter-header">
          <Typography className="staff-dashboard-filter-title">
            <Assignment />
            Filtres
          </Typography>
        </Box>
        <Grid container spacing={2} className="staff-dashboard-filters">
          <Grid item xs={12} sm={6} md={4} className="staff-dashboard-filter-item">
            <FormControl fullWidth className="staff-dashboard-filter-select">
              <InputLabel id="time-range-label">Plage temporelle</InputLabel>
              <Select
                labelId="time-range-label"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                label="Plage temporelle"
              >
                <MenuItem value="hour">Dernière heure</MenuItem>
                <MenuItem value="day">Aujourd'hui</MenuItem>
                <MenuItem value="all">Toutes les commandes</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4} className="staff-dashboard-filter-item">
            <FormControl fullWidth className="staff-dashboard-filter-select">
              <InputLabel id="approval-status-label">Statut d'approbation</InputLabel>
              <Select
                labelId="approval-status-label"
                value={approvedFilter}
                onChange={(e) => setApprovedFilter(e.target.value)}
                label="Statut d'approbation"
              >
                <MenuItem value="">Toutes</MenuItem>
                <MenuItem value="1">Approuvées</MenuItem>
                <MenuItem value="0">Non approuvées</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={4} className="staff-dashboard-filter-item">
            <Button
              variant="contained"
              className="staff-dashboard-refresh-button"
              onClick={fetchOrders}
              fullWidth
            >
              <Refresh />
              Rafraîchir
            </Button>
          </Grid>
        </Grid>
      </Box>

      {isLoading ? (
        <Box className="staff-dashboard-loading">
          <CircularProgress />
          <Typography className="staff-dashboard-loading-text">Chargement des commandes...</Typography>
        </Box>
      ) : error ? (
        <Box className="staff-dashboard-error">
          <Typography className="staff-dashboard-error-text">
            <Cancel className="staff-dashboard-error-icon" />
            {error}
          </Typography>
          <Button
            variant="contained"
            className="staff-dashboard-retry-button"
            onClick={fetchOrders}
          >
            <Refresh />
            Réessayer
          </Button>
        </Box>
      ) : memoizedOrders.length === 0 ? (
        <Box className="staff-dashboard-empty">
          <ShoppingCart className="staff-dashboard-empty-icon" />
          <Typography className="staff-dashboard-empty-text">
            Aucune commande à afficher.
          </Typography>
        </Box>
      ) : (
        <>
          <Typography className="staff-dashboard-order-count">
            Affichage de {memoizedOrders.length} commande{memoizedOrders.length !== 1 ? 's' : ''}
          </Typography>
          <Grid container spacing={2} className="staff-dashboard-orders-grid">
            {memoizedOrders.map((order) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={6}
                lg={4}
                xl={3}
                key={order.id}
                className="staff-dashboard-order-card"
                ref={(el) => (orderRefs.current[order.id] = el)}
              >
                <OrderCard
                  order={order}
                  onApproveOrder={approveOrder}
                  onCancelOrder={cancelOrder}
                  timeAgo={order.timeAgo}
                  isExpanded={order.id === expandOrderId}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
}

StaffDashboard.propTypes = {
  user: PropTypes.shape({
    role: PropTypes.string,
    name: PropTypes.string,
  }),
  handleNewNotification: PropTypes.func.isRequired,
  socket: PropTypes.shape({
    on: PropTypes.func.isRequired,
    off: PropTypes.func.isRequired,
    emit: PropTypes.func.isRequired,
    connected: PropTypes.bool,
  }).isRequired,
};

export default StaffDashboard;
