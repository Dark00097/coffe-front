import io from 'socket.io-client';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { API_ORIGIN } from '../config/runtime';

const API_URL = API_ORIGIN;

let socket = null;
let socketConnected = false;
let initialized = false;

export const initSocket = (
  onNewOrder = () => {},
  onOrderUpdate = () => {},
  onTableStatusUpdate = () => {},
  onReservationUpdate = () => {},
  onRatingUpdate = () => {},
  onOrderApproved = () => {},
  onOrderCancelled = () => {},
  onNewNotification = () => {}
) => {
  if (initialized) {
    console.log('Socket already initialized, returning existing listeners');
    return () => {};
  }
  initialized = true;

  socket = io(API_URL, {
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    auth: {
      token: localStorage.getItem('jwt_token') || null,
      sessionId: localStorage.getItem('sessionId') || null,
    },
  });

  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem('sessionId', sessionId);
    console.log('Generated new sessionId:', sessionId);
  }

  const isAuthenticated = !!localStorage.getItem('jwt_token');
  const socketSessionId = isAuthenticated ? sessionId : `guest-${sessionId}`;

  const joinData = {
    token: localStorage.getItem('jwt_token') || null,
    sessionId: socketSessionId,
  };

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    socketConnected = true;
    socket.emit('join-session', joinData);
    console.log('Emitted join-session with:', joinData);
    toast.info('Connected to real-time updates');
  });

  socket.on('join-confirmation', (data) => {
    console.log('Received join-confirmation:', data);
    if (data.room === 'staff-notifications') {
      console.log('Successfully joined staff-notifications room');
      toast.info('Joined staff notifications room');
    }
  });

  socket.on('auth-error', (data) => {
    console.error('Socket authentication error:', data?.message || 'Unknown error');
    socketConnected = false;
    toast.error(`Real-time updates failed: ${data?.message || 'Unknown error'}`);
  });

  socket.on('newOrder', (data) => {
    console.log('Received newOrder event:', data);
    if (!data?.id) {
      console.error('Invalid newOrder data:', data);
      toast.warn('Received invalid order data');
      return;
    }
    onNewOrder(data);
  });

  socket.on('orderUpdate', (data) => {
    console.log('Received orderUpdate:', data);
    if (!data?.orderId) {
      console.error('Invalid orderUpdate data:', data);
      toast.warn('Received invalid order update');
      return;
    }
    onOrderUpdate(data);
  });

  socket.on('tableStatusUpdate', (data) => {
    console.log('Received tableStatusUpdate:', data);
    if (!data?.tableId) {
      console.warn('Invalid tableStatusUpdate data:', data);
      toast.warn('Received invalid table status update');
      return;
    }
    onTableStatusUpdate(data);
  });

  socket.on('reservationUpdate', (data) => {
    console.log('Received reservationUpdate:', data);
    if (!data?.reservationId) {
      console.warn('Invalid reservationUpdate data:', data);
      toast.warn('Received invalid reservation update');
      return;
    }
    onReservationUpdate(data);
  });

  socket.on('ratingUpdate', (data) => {
    console.log('Received ratingUpdate:', data);
    if (!data?.rating?.id) {
      console.warn('Invalid ratingUpdate data:', data);
      toast.warn('Received invalid rating update');
      return;
    }
    onRatingUpdate(data);
  });

  socket.on('orderApproved', (data) => {
    console.log('Received orderApproved:', data);
    if (!data?.orderId) {
      console.error('Invalid orderApproved data:', data);
      toast.warn('Received invalid order approval data');
      return;
    }
    onOrderApproved(data);
  });

  socket.on('orderCancelled', (data) => {
    console.log('Received orderCancelled:', data);
    if (!data?.orderId) {
      console.error('Invalid orderCancelled data:', data);
      toast.warn('Received invalid order cancellation data');
      return;
    }
    onOrderCancelled(data);
  });

  socket.on('newNotification', (data) => {
    console.log('Received newNotification:', data);
    if (!data?.id) {
      console.error('Invalid newNotification data:', data);
      toast.warn('Received invalid notification data');
      return;
    }
    onNewNotification(data);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
    socketConnected = false;
    toast.warn('Real-time updates disconnected. Attempting to reconnect...');
  });

  socket.on('reconnect', (attempt) => {
    console.log('Socket reconnected after attempt:', attempt);
    socketConnected = true;
    const currentJoin = {
      token: socket.auth?.token || localStorage.getItem('jwt_token') || null,
      sessionId: socket.auth?.sessionId || joinData.sessionId,
    };
    socket.emit('join-session', currentJoin);
    console.log('Re-emitted join-session with:', currentJoin);
    toast.info('Reconnected to real-time updates');
  });

  socket.on('reconnect_error', (error) => {
    console.error('Socket reconnection error:', error.message);
    socketConnected = false;
    toast.error('Failed to reconnect to real-time updates');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    socketConnected = false;
    toast.error('Failed to connect to real-time updates: ' + error.message);
  });

  const cleanup = () => {
    socket.off('connect');
    socket.off('join-confirmation');
    socket.off('auth-error');
    socket.off('newOrder');
    socket.off('orderUpdate');
    socket.off('tableStatusUpdate');
    socket.off('reservationUpdate');
    socket.off('ratingUpdate');
    socket.off('orderApproved');
    socket.off('orderCancelled');
    socket.off('newNotification');
    socket.off('disconnect');
    socket.off('reconnect');
    socket.off('reconnect_error');
    socket.off('connect_error');
    socket.disconnect();
    socket = null;
    initialized = false;
    socketConnected = false;
    console.log('Socket cleaned up');
  };

  console.log('Socket initialized with sessionId:', socketSessionId);
  return cleanup;
};

export const refreshSocketAuth = ({ token, sessionId }) => {
  if (!socket) return;
  socket.auth = { ...(socket.auth || {}), token: token || null, sessionId };
  socket.emit('join-session', { token: token || null, sessionId });
  console.log('Socket auth refreshed and join-session emitted', { sessionId });
};

export const getSocket = () => socket;
export { socketConnected };
