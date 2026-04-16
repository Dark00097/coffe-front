import { Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { api } from './services/api';
import { initSocket, getSocket, refreshSocketAuth } from './services/socket';
import { v4 as uuidv4 } from 'uuid';
import { TransitionProvider } from './contexts/TransitionContext';
import { API_ORIGIN } from './config/runtime';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AddMenuItem from './pages/AddMenuItem';
import Categories from './pages/Categories';
import CategoryMenu from './pages/CategoryMenu';
import CategoryList from './pages/CategoryList';
import ManageMenuItems from './pages/ManageMenuItems';
import ManageSupplements from './pages/ManageSupplements';
import ProductDetails from './pages/ProductDetails';
import TableManagement from './pages/TableManagement';
import OrderManagement from './pages/OrderManagement';
import UserManagement from './pages/UserManagement';
import PromotionManagement from './pages/PromotionManagement';
import Reservations from './pages/Reservations';
import AdminTableReservations from './pages/AdminTableReservations';
import StaffTableReservations from './pages/StaffTableReservations';
import OrderWaiting from './pages/OrderWaiting';
import BannerManagement from './pages/BannerManagement';
import AdminBreakfasts from './pages/AdminBreakfasts';
import BreakfastMenu from './pages/BreakfastMenu';
import ThemeManagement from './pages/ThemeManagement';
import ReusableOptionGroups from './pages/ReusableOptionGroups';
import AdminAddStock from './pages/Stock/AdminAddStock';
import AddStockToMenuItems from './pages/Stock/AddStockToMenuItems';
import StockDashboard from './pages/Stock/StockDashboard';
import OrderBuilder from './pages/OrderBuilder';
import Header from './components/Header';
import Footer from './components/Footer';
import CartModal from './components/CartModal';

function App() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('local');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [promotionId, setPromotionId] = useState('');
  const [promotions, setPromotions] = useState([]);
  const [reusableOptionGroups, setReusableOptionGroups] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [error, setError] = useState(null);
  const [latestOrderId, setLatestOrderId] = useState(null);
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [theme, setTheme] = useState(null);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [isThemeReady, setIsThemeReady] = useState(false);

  const defaultTheme = {
    primary_color: '#ff6b35',
    secondary_color: '#ff8c42',
    background_color: '#faf8f5',
    text_color: '#1f2937',
    logo_url: null,
    favicon_url: '/Uploads/favicon.ico',
    site_title: 'Café Local',
  };

  const handleNewNotification = (notification) => {
    if (!notification.id) {
      console.warn('Received notification without ID:', notification, { timestamp: new Date().toISOString() });
      return;
    }
    toast.info(notification.message, { autoClose: 5000 });
  };

  const applyTheme = (themeData) => {
    const isAbsoluteUrl = (url) => /^https?:\/\//i.test(url || '');

    document.documentElement.style.setProperty('--primary-color', themeData.primary_color);
    document.documentElement.style.setProperty('--secondary-color', themeData.secondary_color);
    document.documentElement.style.setProperty('--background-color', themeData.background_color);
    document.documentElement.style.setProperty('--text-color', themeData.text_color);

    let favicon = document.querySelector("link[rel*='icon']");
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    const baseApiUrl = API_ORIGIN;
    const faviconUrl = themeData.favicon_url
      ? (isAbsoluteUrl(themeData.favicon_url)
          ? themeData.favicon_url
          : `${baseApiUrl}/public${themeData.favicon_url}`)
      : `${baseApiUrl}${defaultTheme.favicon_url}`;
    favicon.href = `${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;

    document.title = themeData.site_title || defaultTheme.site_title;
  };

  useEffect(() => {
    const initializeApp = async () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      let storedDeviceId;
      try {
        storedDeviceId = localStorage.getItem('deviceId');
        if (!storedDeviceId || !uuidRegex.test(storedDeviceId)) {
          storedDeviceId = uuidv4();
          localStorage.setItem('deviceId', storedDeviceId);
          console.log('Generated new deviceId:', storedDeviceId, { timestamp: new Date().toISOString() });
        } else {
          console.log('Reusing existing deviceId:', storedDeviceId, { timestamp: new Date().toISOString() });
        }
      } catch (err) {
        console.warn('localStorage access failed, generating temporary deviceId:', err.message, { timestamp: new Date().toISOString() });
        storedDeviceId = uuidv4();
      }
      setDeviceId(storedDeviceId);
      api.defaults.headers.common['X-Device-Id'] = storedDeviceId;

      let fallbackSessionId;
      try {
        fallbackSessionId = localStorage.getItem('sessionId');
        if (!fallbackSessionId) {
          fallbackSessionId = `guest-${uuidv4()}`;
          localStorage.setItem('sessionId', fallbackSessionId);
        }
      } catch (err) {
        console.warn('localStorage access failed, generating temporary sessionId:', err.message, { timestamp: new Date().toISOString() });
        fallbackSessionId = `guest-${uuidv4()}`;
      }
      setSessionId(fallbackSessionId);
      api.defaults.headers.common['X-Session-Id'] = fallbackSessionId;

      const ensureGuestSession = (preferredSessionId = fallbackSessionId) => {
        const nextGuestSessionId =
          typeof preferredSessionId === 'string' &&
          preferredSessionId.trim() &&
          preferredSessionId.startsWith('guest-')
            ? preferredSessionId.trim()
            : `guest-${uuidv4()}`;

        try {
          localStorage.setItem('sessionId', nextGuestSessionId);
        } catch (err) {
          console.warn('Failed to set sessionId in localStorage:', err.message, { timestamp: new Date().toISOString() });
        }

        fallbackSessionId = nextGuestSessionId;
        setSessionId(nextGuestSessionId);
        api.defaults.headers.common['X-Session-Id'] = nextGuestSessionId;
        api.defaults.headers.common['X-Device-Id'] = storedDeviceId;
        refreshSocketAuth({ token: null, sessionId: nextGuestSessionId });

        return nextGuestSessionId;
      };

      const socketCleanup = initSocket(
        () => {},
        () => {},
        () => {},
        () => {},
        () => {},
        (data) => {
          if (socket && socket.connected) {
            console.log('Broadcasting orderApproved event:', data, { timestamp: new Date().toISOString() });
            socket.emit('orderApproved', data);
          } else {
            console.warn('Socket not connected, cannot broadcast orderApproved:', data, { timestamp: new Date().toISOString() });
          }
        },
        () => {},
        handleNewNotification
      );
      const socketInstance = getSocket();
      setSocket(socketInstance);
      setIsSocketReady(true);

      socketInstance.on('connect', () => {
        console.log('Socket connected in App.jsx', { sessionId: fallbackSessionId, deviceId: storedDeviceId, timestamp: new Date().toISOString() });
      });
      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error in App.jsx:', error.message, { timestamp: new Date().toISOString() });
        toast.warn('Real-time updates unavailable. Retrying connection...');
      });
      socketInstance.on('reconnect', (attempt) => {
        console.log('Socket reconnected in App.jsx after attempt:', attempt, { timestamp: new Date().toISOString() });
      });

      const checkAuth = async () => {
        try {
          const token = localStorage.getItem('jwt_token');
          if (!token || typeof token !== 'string' || token === 'null' || token === 'undefined') {
            console.warn('No valid token found during auth check', { timestamp: new Date().toISOString() });
            localStorage.removeItem('jwt_token');
            delete api.defaults.headers.common['Authorization'];
            setUser(null);
            ensureGuestSession(fallbackSessionId);
            return;
          }
          console.log('Checking auth with token:', token.substring(0, 10) + '...', { deviceId: storedDeviceId, timestamp: new Date().toISOString() });
          const res = await api.get('/check-auth');
          setUser(res.data);
          const authSessionId = `user-${res.data.id}-${uuidv4()}`;
          setSessionId(authSessionId);
          try {
            localStorage.setItem('sessionId', authSessionId);
          } catch (err) {
            console.warn('Failed to set sessionId in localStorage:', err.message, { timestamp: new Date().toISOString() });
          }
          api.defaults.headers.common['X-Session-Id'] = authSessionId;
          api.defaults.headers.common['X-Device-Id'] = storedDeviceId;
          refreshSocketAuth({ token: localStorage.getItem('jwt_token'), sessionId: authSessionId });
        } catch (err) {
          console.error('Error checking auth:', err.response?.data || err.message, { timestamp: new Date().toISOString() });
          localStorage.removeItem('jwt_token');
          delete api.defaults.headers.common['Authorization'];
          setUser(null);
          ensureGuestSession(fallbackSessionId);
        }
      };

      const fetchPromotions = async () => {
        try {
          console.log('Fetching promotions with deviceId:', storedDeviceId, { timestamp: new Date().toISOString() });
          const response = await api.get('/promotions');
          setPromotions(response.data || []);
        } catch (error) {
          console.error('Error fetching promotions:', error.response?.data || error.message, { timestamp: new Date().toISOString() });
          toast.error(error.response?.data?.error || 'Failed to load promotions');
          setPromotions([]);
        }
      };

      const fetchReusableOptionGroups = async () => {
        try {
          console.log('Fetching reusable option groups with deviceId:', storedDeviceId, { timestamp: new Date().toISOString() });
          const response = await api.get('/option-groups/reusable');
          setReusableOptionGroups(response.data || []);
        } catch (error) {
          console.error('Error fetching reusable option groups:', error.response?.data || error.message, { timestamp: new Date().toISOString() });
          toast.error(error.response?.data?.error || 'Failed to load reusable option groups');
          setReusableOptionGroups([]);
        }
      };

      const fetchTheme = async () => {
        try {
          console.log('Fetching theme with deviceId:', storedDeviceId, { timestamp: new Date().toISOString() });
          const response = await api.getTheme();
          setTheme(response.data);
          applyTheme(response.data);
        } catch (error) {
          console.error('Error fetching theme:', error.response?.data || error.message, { timestamp: new Date().toISOString() });
          toast.error(error.response?.data?.error || 'Failed to load theme, applying default theme');
          setTheme(defaultTheme);
          applyTheme(defaultTheme);
        } finally {
          setIsThemeReady(true);
        }
      };

      await Promise.all([checkAuth(), fetchPromotions(), fetchReusableOptionGroups(), fetchTheme()]).catch((err) => {
        console.error('Initialization error:', err, { timestamp: new Date().toISOString() });
        toast.error('Failed to initialize app');
      });

      return () => {
        socketInstance.off('connect');
        socketInstance.off('connect_error');
        socketInstance.off('reconnect');
        socketCleanup();
      };
    };

    initializeApp();
  }, []);

  const handleLogin = (user, token) => {
    if (!user || !token || typeof token !== 'string' || token === 'null' || token === 'undefined') {
      console.error('Invalid login data:', { user, token }, { timestamp: new Date().toISOString() });
      toast.error('Invalid login data received from server');
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('sessionId');
      delete api.defaults.headers.common['X-Session-Id'];
      delete api.defaults.headers.common['Authorization'];
      const newSessionId = `guest-${uuidv4()}`;
      try {
        localStorage.setItem('sessionId', newSessionId);
      } catch (err) {
        console.warn('Failed to set sessionId in localStorage:', err.message, { timestamp: new Date().toISOString() });
      }
      setSessionId(newSessionId);
      api.defaults.headers.common['X-Session-Id'] = newSessionId;
      api.defaults.headers.common['X-Device-Id'] = deviceId;
      navigate('/login');
      return;
    }
    setUser(user);
    try {
      localStorage.setItem('jwt_token', token);
    } catch (err) {
      console.warn('Failed to set jwt_token in localStorage:', err.message, { timestamp: new Date().toISOString() });
    }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const authSessionId = `user-${user.id}-${uuidv4()}`;
    setSessionId(authSessionId);
    try {
      localStorage.setItem('sessionId', authSessionId);
    } catch (err) {
      console.warn('Failed to set sessionId in localStorage:', err.message, { timestamp: new Date().toISOString() });
    }
    api.defaults.headers.common['X-Session-Id'] = authSessionId;
    api.defaults.headers.common['X-Device-Id'] = deviceId;
    refreshSocketAuth({ token, sessionId: authSessionId });
    console.log('Login successful, setting token:', token.substring(0, 10) + '...', 'sessionId:', authSessionId, 'deviceId:', deviceId, { timestamp: new Date().toISOString() });
    navigate(user.role === 'admin' ? '/admin' : '/staff');
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout');
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('sessionId');
      delete api.defaults.headers.common['Authorization'];
      delete api.defaults.headers.common['X-Session-Id'];
    const guestSessionId = `guest-${uuidv4()}`;
    setSessionId(guestSessionId);
      try {
        localStorage.setItem('sessionId', guestSessionId);
      } catch (err) {
        console.warn('Failed to set sessionId in localStorage:', err.message, { timestamp: new Date().toISOString() });
      }
    api.defaults.headers.common['X-Session-Id'] = guestSessionId;
    api.defaults.headers.common['X-Device-Id'] = deviceId;
    refreshSocketAuth({ token: null, sessionId: guestSessionId });
    setUser(null);
      setCart([]);
      setDeliveryAddress('');
      setPromotionId('');
      setIsCartOpen(false);
      toast.success('Successfully logged out');
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error.response?.data || error.message, { timestamp: new Date().toISOString() });
      toast.error('Logout failed');
    }
  };

  const addToCart = (item) => {
    if (!item || (!item.item_id && !item.breakfast_id)) {
      console.error('Invalid item:', item, { timestamp: new Date().toISOString() });
      toast.error('Cannot add item to cart');
      return;
    }

    setCart((prev) => {
      if (item.item_id) {
        const itemKey = `${item.item_id}_${item.supplement_id || 'no-supplement'}`;
        const existingItem = prev.find(
          (cartItem) => `${cartItem.item_id}_${cartItem.supplement_id || 'no-supplement'}` === itemKey
        );
        if (existingItem) {
          return prev.map((cartItem) =>
            cartItem.cartItemId === existingItem.cartItemId
              ? {
                  ...cartItem,
                  quantity: cartItem.quantity + (item.quantity || 1),
                }
              : cartItem
          );
        }
        return [
          ...prev,
          {
            cartItemId: uuidv4(),
            item_id: item.item_id,
            quantity: item.quantity || 1,
            unit_price: parseFloat(item.unit_price || item.sale_price || item.regular_price || 0),
            name: item.name || 'Unknown Item',
            image_url: item.image_url || null,
            supplement_id: item.supplement_id || null,
            supplement_name: item.supplement_name || null,
            supplement_price: parseFloat(item.supplement_price || 0),
          },
        ];
      }

      if (item.breakfast_id) {
        const optionIds = item.option_ids ? item.option_ids.sort().join('-') : 'no-options';
        const itemKey = `${item.breakfast_id}_${optionIds}`;
        const existingItem = prev.find(
          (cartItem) =>
            cartItem.breakfast_id === item.breakfast_id &&
            (cartItem.option_ids ? cartItem.option_ids.sort().join('-') : 'no-options') === optionIds
        );
        if (existingItem) {
          return prev.map((cartItem) =>
            cartItem.cartItemId === existingItem.cartItemId
              ? {
                  ...cartItem,
                  quantity: cartItem.quantity + (item.quantity || 1),
                }
              : cartItem
          );
        }
        return [
          ...prev,
          {
            cartItemId: uuidv4(),
            breakfast_id: item.breakfast_id,
            quantity: item.quantity || 1,
            unit_price: parseFloat(item.unit_price || item.sale_price || item.regular_price || 0),
            name: item.name || 'Unknown Breakfast',
            image_url: item.image_url || null,
            option_ids: item.option_ids || [],
            options: item.options || [],
          },
        ];
      }

      return prev;
    });
    setIsCartOpen(true);
    toast.success(`${item.name || 'Item'} added to cart`);
  };

  const updateQuantity = (cartItemId, quantity, supplement = null, options = null) => {
    if (quantity < 1) {
      setCart((prev) => prev.filter((cartItem) => cartItem.cartItemId !== cartItemId));
    } else {
      setCart((prev) => {
        const targetItem = prev.find((cartItem) => cartItem.cartItemId === cartItemId);
        if (!targetItem) return prev;

        if (targetItem.item_id) {
          const newSupplementId = supplement?.supplement_id || targetItem.supplement_id || 'no-supplement';
          const itemKey = `${targetItem.item_id}_${newSupplementId}`;
          const existingItem = prev.find(
            (cartItem) =>
              cartItem.cartItemId !== cartItemId &&
              `${cartItem.item_id}_${cartItem.supplement_id || 'no-supplement'}` === itemKey
          );

          if (existingItem && supplement) {
            return prev
              .filter((cartItem) => cartItem.cartItemId !== cartItemId)
              .map((cartItem) =>
                cartItem.cartItemId === existingItem.cartItemId
                  ? {
                      ...cartItem,
                      quantity: cartItem.quantity + quantity,
                      supplement_id: supplement.supplement_id,
                      supplement_name: supplement.supplement_name,
                      supplement_price: parseFloat(supplement.supplement_price || 0),
                    }
                  : cartItem
              );
          }

          return prev.map((cartItem) =>
            cartItem.cartItemId === cartItemId
              ? {
                  ...cartItem,
                  quantity,
                  ...(supplement && {
                    supplement_id: supplement.supplement_id,
                    supplement_name: supplement.supplement_name,
                    supplement_price: parseFloat(supplement.supplement_price || 0),
                  }),
                }
              : cartItem
          );
        }

        if (targetItem.breakfast_id) {
          const newOptionIds = options?.option_ids ? options.option_ids.sort().join('-') : targetItem.option_ids.sort().join('-');
          const itemKey = `${targetItem.breakfast_id}_${newOptionIds}`;
          const existingItem = prev.find(
            (cartItem) =>
              cartItem.cartItemId !== cartItemId &&
              cartItem.breakfast_id === targetItem.breakfast_id &&
              (cartItem.option_ids ? cartItem.option_ids.sort().join('-') : 'no-options') === newOptionIds
          );

          if (existingItem && options) {
            return prev
              .filter((cartItem) => cartItem.cartItemId !== cartItemId)
              .map((cartItem) =>
                cartItem.cartItemId === existingItem.cartItemId
                  ? {
                      ...cartItem,
                      quantity: cartItem.quantity + quantity,
                      option_ids: options.option_ids,
                      options: options.options,
                    }
                  : cartItem
              );
          }

          return prev.map((cartItem) =>
            cartItem.cartItemId === cartItemId
              ? {
                  ...cartItem,
                  quantity,
                  ...(options && {
                    option_ids: options.option_ids,
                    options: options.options,
                  }),
                }
              : cartItem
          );
        }

        return prev;
      });
    }
  };

  const clearCart = () => {
    setCart([]);
    setDeliveryAddress('');
    setPromotionId('');
    setIsCartOpen(false);
  };

  useEffect(() => {
    const handleError = (event) => {
      console.error('Global error:', event.message || 'Unknown error', { timestamp: new Date().toISOString() });
      const path = window.location.pathname;
      const isAdminOrStaff = path.startsWith('/admin') || path.startsWith('/staff');
      if (isAdminOrStaff) {
        toast.error('Une erreur est survenue : ' + (event.message || 'Erreur inconnue'));
      }
      setError('Une erreur inattendue est survenue. Veuillez actualiser la page.');
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>{error}</div>;
  }

  if (!isThemeReady) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }} />;
  }

  // Helper flags to control layout chrome
  const isAdminRoute = window.location.pathname.startsWith('/admin') || 
                       window.location.pathname.startsWith('/staff');
  const isLoginRoute = window.location.pathname === '/login';
  const isFullWidthRoute = window.location.pathname.startsWith('/product/') ||
                          window.location.pathname.startsWith('/order-waiting/');

  const containerMaxWidth = isFullWidthRoute || isLoginRoute ? '100%' : '100%';
  const containerPadding = isFullWidthRoute ? '0' : (isAdminRoute ? '12px' : '0');

  return (
    <TransitionProvider>
      <div style={{ 
        maxWidth: containerMaxWidth, 
        margin: '0 auto', 
        padding: containerPadding, 
        minHeight: '100vh',
        width: '100%',
        overflowX: 'hidden'
      }}>
        <Header
          cart={cart}
          setIsCartOpen={setIsCartOpen}
          user={user}
          handleLogout={handleLogout}
          theme={theme}
        />
        <Routes>
          <Route path="/" element={<Home addToCart={addToCart} />} />
          <Route path="/categories" element={<CategoryList />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/staff" element={<StaffDashboard user={user} handleNewNotification={handleNewNotification} socket={socket} />} />
          <Route path="/admin/add-menu-item" element={<AddMenuItem />} />
          <Route path="/admin/categories" element={<Categories />} />
          <Route path="/admin/manage-menu-items" element={<ManageMenuItems />} />
          <Route path="/admin/supplements" element={<ManageSupplements />} />
          <Route path="/admin/tables" element={<TableManagement />} />
          <Route path="/admin/orders" element={<OrderManagement />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/promotions" element={<PromotionManagement />} />
          <Route path="/admin/banners" element={<BannerManagement />} />
          <Route path="/admin/breakfasts" element={<AdminBreakfasts reusableOptionGroups={reusableOptionGroups} />} />
          <Route path="/admin/reusable-option-groups" element={<ReusableOptionGroups />} />
          <Route path="/admin/orders/new" element={<OrderBuilder user={user} />} />
          <Route path="/admin/table-reservations" element={<AdminTableReservations />} />
          <Route path="/admin/theme" element={<ThemeManagement />} />
          <Route path="/admin/stock/add" element={<AdminAddStock />} />
          <Route path="/admin/stock/assign" element={<AddStockToMenuItems />} />
          <Route path="/admin/stock/dashboard" element={<StockDashboard />} />
          <Route path="/staff/table-reservations" element={<StaffTableReservations />} />
          <Route path="/staff/orders/new" element={<OrderBuilder user={user} />} />
          <Route path="/category/:id" element={<CategoryMenu addToCart={addToCart} />} />
          <Route path="/product/:id" element={<ProductDetails addToCart={addToCart} latestOrderId={latestOrderId} />} />
          <Route
            path="/order-waiting/:orderId"
            element={isSocketReady ? <OrderWaiting sessionId={sessionId} socket={socket} /> : <div>Chargement de la connexion temps reel...</div>}
          />
          <Route path="/breakfast" element={<BreakfastMenu addToCart={addToCart} reusableOptionGroups={reusableOptionGroups} />} />
          <Route path="/breakfast/:id" element={<BreakfastMenu addToCart={addToCart} reusableOptionGroups={reusableOptionGroups} />} />
          <Route path="*" element={<div style={{ textAlign: 'center', color: '#666' }}>404 - Page introuvable</div>} />
        </Routes>
        <CartModal
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          updateQuantity={updateQuantity}
          orderType={orderType}
          setOrderType={setOrderType}
          deliveryAddress={deliveryAddress}
          setDeliveryAddress={setDeliveryAddress}
          promotionId={promotionId}
          setPromotionId={setPromotionId}
          promotions={promotions}
          clearCart={clearCart}
          sessionId={sessionId}
          socket={socket}
        />
        <Footer />
        {isAdminRoute && (
          <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
        )}
      </div>
    </TransitionProvider>
  );
}

export default App;
