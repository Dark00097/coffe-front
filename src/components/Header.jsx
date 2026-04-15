import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { getSocket } from '../services/socket';
import { toast } from 'react-toastify';
import { useState, useEffect, useCallback, memo } from 'react';
import { debounce } from 'lodash';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Button,
  ListSubheader,
  Collapse,
  useMediaQuery,
  Slide,
  Badge,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Work as WorkIcon,
  Logout as LogoutIcon,
  Restaurant as RestaurantIcon,
  LocalOffer as PromotionIcon,
  Group as GroupIcon,
  TableBar as TableIcon,
  Receipt as OrderIcon,
  Category as CategoryIcon,
  Home as HomeIcon,
  ExpandLess,
  ExpandMore,
  ChevronRight as ChevronRightIcon,
  ShoppingCart as ShoppingCartIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  Image as ImageIcon,
  Palette as PaletteIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { lazy, Suspense } from 'react';
import './css/Header.css';

const NotificationBell = lazy(() => import('./NotificationBell'));

const Header = memo(
  ({ cart, setIsCartOpen, user, handleLogout, theme: customTheme }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [categories, setCategories] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSection, setExpandedSection] = useState('');
    const socket = getSocket();

    const adminLinks = [
      { to: '/admin', label: 'Dashboard', icon: <AdminPanelSettingsIcon />, primary: true },
      { to: '/admin/add-menu-item', label: 'Add Menu Item', icon: <AddCircleOutlineIcon /> },
      { to: '/admin/manage-menu-items', label: 'Menu Items', icon: <RestaurantIcon /> },
      { to: '/admin/supplements', label: 'Manage Supplements', icon: <RestaurantIcon /> },
      { to: '/admin/breakfasts', label: 'Breakfasts', icon: <RestaurantIcon /> },
      { to: '/admin/promotions', label: 'Promotions', icon: <PromotionIcon /> },
      { to: '/admin/users', label: 'Staff Management', icon: <GroupIcon /> },
      { to: '/admin/tables', label: 'Table Management', icon: <TableIcon /> },
      { to: '/admin/orders/new', label: 'Create Order', icon: <OrderIcon />, primary: true },
      { to: '/admin/orders', label: 'Order Management', icon: <OrderIcon /> },
      { to: '/admin/categories', label: 'Categories', icon: <CategoryIcon /> },
      { to: '/admin/table-reservations', label: 'Table Reservations', icon: <TableIcon /> },
      { to: '/admin/banners', label: 'Banner Management', icon: <ImageIcon /> },
      { to: '/admin/theme', label: 'Theme Management', icon: <PaletteIcon /> },
    ];

    const stockManagementLinks = [
      { to: '/admin/stock/add', label: 'Add Stock', icon: <InventoryIcon /> },
      { to: '/admin/stock/assign', label: 'Assign Stock', icon: <InventoryIcon /> },
      { to: '/admin/stock/dashboard', label: 'Stock Dashboard', icon: <InventoryIcon /> },
    ];

    const staffLinks = [
      { to: '/staff', label: 'Staff Dashboard', icon: <WorkIcon />, primary: true },
      { to: '/staff/orders/new', label: 'Create Order', icon: <OrderIcon /> },
      { to: '/staff/table-reservations', label: 'Table Reservations', icon: <TableIcon /> },
    ];

    const publicLinks = [
      { to: '/', label: 'All Products', icon: <HomeIcon />, primary: true },
      ...categories.map((category) => ({
        to: `/category/${category.id}`,
        label: category.name,
        icon: <RestaurantIcon />,
      })),
    ];

    const fetchNotifications = async () => {
      try {
        const res = await api.getNotifications({ is_read: 0 });
        setNotifications(
          res.data.map((n) => ({
            ...n,
            is_read: Number(n.is_read),
            created_at: new Date(n.created_at),
          }))
        );
      } catch (err) {
        console.error('Error fetching notifications:', err);
        toast.error('Failed to load notifications');
      }
    };

    const handleNewNotification = useCallback(
      (notification) => {
        if (notification.clearAll) {
          setNotifications([]);
          return;
        }
        if (!notification.id) {
          console.warn('Invalid notification received:', notification);
          return;
        }
        setNotifications((prev) => {
          const exists = prev.find((n) => n.id === notification.id);
          const updated = exists
            ? prev.map((n) =>
                n.id === notification.id
                  ? {
                      ...n,
                      ...notification,
                      is_read: Number(notification.is_read),
                      created_at: new Date(notification.created_at),
                    }
                  : n
              )
            : [
                {
                  ...notification,
                  is_read: Number(notification.is_read || 0),
                  created_at: new Date(notification.created_at),
                },
                ...prev,
              ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          if (!notification.is_read) {
            console.log('New unread notification added:', notification);
            toast.info(notification.message, { autoClose: 3000 });
          }
          return updated;
        });
      },
      []
    );

    const debouncedSearch = useCallback(
      debounce((query) => {
        if (query.trim()) {
          navigate(`/search?q=${encodeURIComponent(query)}`);
          setSearchQuery('');
          setIsMobileMenuOpen(false);
          setIsDesktopMenuOpen(false);
        }
      }, 300),
      [navigate]
    );

    const handleSearch = (e) => {
      e.preventDefault();
      debouncedSearch(searchQuery);
    };

    useEffect(() => {
      let mounted = true;

      const fetchCategories = async () => {
        try {
          const res = await api.get('/categories');
          if (mounted) setCategories(res.data || []);
        } catch (error) {
          if (mounted) {
            toast.error(error.response?.data?.error || 'Failed to fetch categories');
            setCategories([]);
          }
        }
      };

      if (!user || !['admin', 'server'].includes(user?.role)) {
        fetchCategories();
      } else {
        fetchNotifications();
      }

      return () => {
        mounted = false;
      };
    }, [user, handleNewNotification]);

    const renderDesktopNavItems = useCallback(() => {
      const links = user?.role === 'admin' ? adminLinks : user?.role === 'server' ? staffLinks : publicLinks.slice(0, 4);
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
          {user?.role === 'admin' && (
            <>
              {links.map((link) => (
                <Button
                  key={link.to}
                  component={Link}
                  to={link.to}
                  startIcon={link.icon}
                  variant={link.primary ? 'contained' : 'text'}
                  fullWidth
                  sx={{
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: link.primary ? 600 : 500,
                    padding: '12px 16px',
                    justifyContent: 'flex-start',
                    backgroundColor: link.primary ? 'var(--primary-color)' : 'transparent',
                    color: link.primary ? 'var(--text-color)' : '#1a1a1a',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: link.primary ? 'var(--secondary-color)' : 'rgba(0, 0, 0, 0.05)',
                      transform: 'translateX(4px)',
                    },
                  }}
                  onClick={() => setIsDesktopMenuOpen(false)}
                >
                  {link.label}
                </Button>
              ))}
              <Divider sx={{ my: 1 }} />
              <Button
                onClick={() => setExpandedSection(expandedSection === 'stock' ? '' : 'stock')}
                startIcon={<InventoryIcon />}
                endIcon={expandedSection === 'stock' ? <ExpandLess /> : <ExpandMore />}
                fullWidth
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 500,
                  padding: '12px 16px',
                  justifyContent: 'space-between',
                  backgroundColor: 'transparent',
                  color: '#1a1a1a',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  },
                }}
              >
                Stock Management
              </Button>
              <Collapse in={expandedSection === 'stock'} timeout={200}>
                <Box sx={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {stockManagementLinks.map((link) => (
                    <Button
                      key={link.to}
                      component={Link}
                      to={link.to}
                      startIcon={link.icon}
                      variant="text"
                      fullWidth
                      sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 500,
                        padding: '10px 16px',
                        justifyContent: 'flex-start',
                        backgroundColor: 'transparent',
                        color: '#1a1a1a',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.05)',
                          transform: 'translateX(4px)',
                        },
                      }}
                      onClick={() => setIsDesktopMenuOpen(false)}
                    >
                      {link.label}
                    </Button>
                  ))}
                </Box>
              </Collapse>
            </>
          )}
          {user?.role !== 'admin' && links.map((link) => (
            <Button
              key={link.to}
              component={Link}
              to={link.to}
              startIcon={link.icon}
              variant={link.primary ? 'contained' : 'text'}
              fullWidth
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: link.primary ? 600 : 500,
                padding: '12px 16px',
                justifyContent: 'flex-start',
                backgroundColor: link.primary ? 'var(--primary-color)' : 'transparent',
                color: link.primary ? 'var(--text-color)' : '#1a1a1a',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: link.primary ? 'var(--secondary-color)' : 'rgba(0, 0, 0, 0.05)',
                  transform: 'translateX(4px)',
                },
              }}
              onClick={() => setIsDesktopMenuOpen(false)}
            >
              {link.label}
            </Button>
          ))}
        </Box>
      );
    }, [user?.role, categories, expandedSection]);

    const renderMenuSection = useCallback(
      (title, links, isPrimary = false) => (
        <Box className="header-menu-section" key={title}>
          <ListSubheader 
            sx={{ 
              backgroundColor: 'transparent', 
              color: '#666', 
              fontSize: '11px', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              paddingLeft: '20px', 
              paddingBottom: '8px',
              letterSpacing: '0.5px'
            }}
          >
            {title}
          </ListSubheader>
          {links.map((link) => (
            <NavItem key={link.to} link={link} isPrimary={isPrimary} onClick={() => setIsMobileMenuOpen(false)} />
          ))}
        </Box>
      ),
      []
    );

    const renderMobileMenuContent = useCallback(() => {
      const isAdmin = user?.role === 'admin';
      const isStaff = user?.role === 'server';

      return (
        <Box className="header-drawer-content" sx={{ backgroundColor: 'var(--background-color)' }}>
          {(!isAdmin && !isStaff) && (
            <Box className="header-search-box" sx={{ margin: '16px 16px 8px 16px' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#999' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    backgroundColor: '#f5f5f5',
                    border: 'none',
                    '& fieldset': { border: 'none' },
                    '&:hover': { backgroundColor: '#efefef' },
                    '&.Mui-focused': { 
                      backgroundColor: '#fff',
                      boxShadow: '0 0 0 2px var(--primary-color)',
                    },
                  },
                }}
              />
            </Box>
          )}

          <Box className="header-menu-container" sx={{ paddingBottom: '100px', overflowY: 'auto' }}>
            {isAdmin ? (
              <>
                {renderMenuSection('Administrative Panel', adminLinks.filter((link) => link.primary))}
                <ListItemButton
                  onClick={() => setExpandedSection(expandedSection === 'management' ? '' : 'management')}
                  sx={{ 
                    margin: '4px 12px', 
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                  }}
                >
                  <ListItemIcon sx={{ color: 'var(--primary-color)', minWidth: '40px' }}>
                    <CategoryIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Management Tools"
                    primaryTypographyProps={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}
                  />
                  {expandedSection === 'management' ? <ExpandLess sx={{ color: '#999' }} /> : <ExpandMore sx={{ color: '#999' }} />}
                </ListItemButton>
                <Collapse in={expandedSection === 'management'} timeout={200}>
                  <Box sx={{ paddingLeft: '12px' }}>
                    {renderMenuSection('Tools', adminLinks.filter((link) => !link.primary))}
                  </Box>
                </Collapse>
                <ListItemButton
                  onClick={() => setExpandedSection(expandedSection === 'stock' ? '' : 'stock')}
                  sx={{ 
                    margin: '4px 12px', 
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                  }}
                >
                  <ListItemIcon sx={{ color: 'var(--primary-color)', minWidth: '40px' }}>
                    <InventoryIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Stock Management"
                    primaryTypographyProps={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}
                  />
                  {expandedSection === 'stock' ? <ExpandLess sx={{ color: '#999' }} /> : <ExpandMore sx={{ color: '#999' }} />}
                </ListItemButton>
                <Collapse in={expandedSection === 'stock'} timeout={200}>
                  <Box sx={{ paddingLeft: '12px' }}>
                    {renderMenuSection('Stock Tools', stockManagementLinks)}
                  </Box>
                </Collapse>
              </>
            ) : isStaff ? (
              renderMenuSection('Staff Portal', staffLinks)
            ) : (
              renderMenuSection('Menu', publicLinks)
            )}
          </Box>

          <Box 
            className="header-user-section" 
            sx={{ 
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              width: isMobile ? '260px' : '280px',
              padding: '20px', 
              backgroundColor: '#fff', 
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
              boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
            }}
          >
            {user && (
              <Box className="header-user-info" sx={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Avatar sx={{ width: '44px', height: '44px', backgroundColor: 'var(--primary-color)', fontSize: '18px', fontWeight: 600 }}>
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, color: '#1a1a1a', marginBottom: '2px', fontSize: '15px' }}
                  >
                    {user.name || 'User'}
                  </Typography>
                  <Chip
                    label={`${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`}
                    size="small"
                    sx={{ 
                      backgroundColor: 'var(--primary-color)', 
                      color: 'var(--text-color)', 
                      fontSize: '11px', 
                      fontWeight: 600,
                      height: '22px'
                    }}
                  />
                </Box>
              </Box>
            )}
            {user ? (
              <Button
                fullWidth
                variant="outlined"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{
                  borderRadius: '12px',
                  borderColor: 'rgba(0, 0, 0, 0.2)',
                  color: '#1a1a1a',
                  textTransform: 'none',
                  fontWeight: 600,
                  padding: '10px',
                  transition: 'all 0.2s ease',
                  '&:hover': { 
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    borderColor: 'rgba(0, 0, 0, 0.3)',
                  },
                }}
              >
                Sign Out
              </Button>
            ) : (
              <Button
                fullWidth
                variant="contained"
                startIcon={<PersonIcon />}
                onClick={() => {
                  navigate('/login');
                  setIsMobileMenuOpen(false);
                  setIsDesktopMenuOpen(false);
                }}
                sx={{
                  borderRadius: '12px',
                  backgroundColor: 'var(--primary-color)',
                  color: 'var(--text-color)',
                  textTransform: 'none',
                  fontWeight: 600,
                  padding: '10px',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': { 
                    backgroundColor: 'var(--secondary-color)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  },
                }}
              >
                Staff Login
              </Button>
            )}
          </Box>
        </Box>
      );
    }, [user, searchQuery, expandedSection, categories, handleLogout, navigate, isMobile]);

    return (
      <>
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            background: `linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)`,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            color: 'var(--text-color)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Toolbar sx={{ 
            minHeight: { xs: '64px', md: '68px' }, 
            padding: { xs: '0 12px', md: '0 20px' }, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}>
            <IconButton
              edge="start"
              onClick={() => (isMobile ? setIsMobileMenuOpen(true) : setIsDesktopMenuOpen(true))}
              sx={{ 
                width: { xs: '44px', md: '44px' }, 
                height: { xs: '44px', md: '44px' }, 
                borderRadius: '12px', 
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.2s ease',
                '&:hover': { 
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  transform: 'scale(1.05)',
                }
              }}
            >
              <MenuIcon sx={{ color: 'var(--text-color)' }} />
            </IconButton>

            <Box
              component={Link}
              to={user?.role === 'admin' ? '/admin' : user?.role === 'server' ? '/staff' : '/'}
              sx={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                color: 'var(--text-color)',
                height: '48px',
                transition: 'all 0.2s ease',
                '&:hover': { 
                  transform: 'translateX(-50%) scale(1.05)',
                },
              }}
            >
              {customTheme?.logo_url ? (
                <img
                  src={customTheme.logo_url}
                  alt="Café Logo"
                  style={{ 
                    maxHeight: '48px', 
                    maxWidth: '140px',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                  }}
                  onError={(e) => {
                    console.error('Error loading logo image:', customTheme.logo_url);
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<span style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 18px;"><svg style="width: 24px; height: 24px;" viewBox="0 0 24 24"><path fill="currentColor" d="M8.1,13.34L3.91,9.16C2.35,7.59 2.35,5.06 3.91,3.5L10.93,10.5L8.1,13.34M14.88,11.53C14.58,11.24 14.58,10.76 14.88,10.47L18.59,6.76C18.88,6.47 19.36,6.47 19.65,6.76L22.47,9.59L14.88,11.53M8.83,15.17L6.24,17.76C4.78,19.22 2.39,19.22 0.93,17.76L3.74,14.95L8.83,15.17M17.05,14.88L14.24,17.69C13.94,17.99 13.94,18.47 14.24,18.76L17.05,21.57C17.35,21.87 17.83,21.87 18.12,21.57L21.88,17.81L17.05,14.88Z" /></svg>Café Local</span>';
                  }}
                />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: { xs: '18px', md: '20px' } }}>
                  <RestaurantIcon sx={{ fontSize: '24px', color: 'var(--text-color)' }} />
                  Café Local
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {['admin', 'server'].includes(user?.role) && (
                <Suspense fallback={<Box sx={{ width: '44px', height: '44px' }} />}>
                  <NotificationBell
                    user={user}
                    navigate={navigate}
                    notifications={notifications}
                    handleNewNotification={handleNewNotification}
                    socket={socket}
                  />
                </Suspense>
              )}
              {(!user?.role || !['admin', 'server'].includes(user?.role)) && (
                <IconButton
                  onClick={() => setIsCartOpen(true)}
                  sx={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '12px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease',
                    '&:hover': { 
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                      transform: 'scale(1.05)',
                    }
                  }}
                >
                  <Badge
                    badgeContent={(cart || []).reduce((acc, item) => acc + (item.quantity || 0), 0)}
                    max={99}
                    sx={{
                      '& .MuiBadge-badge': {
                        backgroundColor: '#fff',
                        color: 'var(--primary-color)',
                        fontSize: '11px',
                        fontWeight: 700,
                        minWidth: '20px',
                        height: '20px',
                        borderRadius: '10px',
                        border: '2px solid var(--primary-color)',
                      },
                    }}
                  >
                    <ShoppingCartIcon sx={{ color: 'var(--text-color)', fontSize: '24px' }} />
                  </Badge>
                </IconButton>
              )}
            </Box>
          </Toolbar>
        </AppBar>

        <Drawer
          anchor="left"
          open={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          sx={{
            '& .MuiDrawer-paper': {
              width: '260px',
              backgroundColor: 'var(--background-color)',
              boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12)',
            },
            '& .MuiBackdrop-root': { backgroundColor: 'rgba(0, 0, 0, 0.4)' },
          }}
        >
          <Slide direction="right" in={isMobileMenuOpen} timeout={250}>
            <Box>
              <Box sx={{ 
                padding: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                borderBottom: '1px solid rgba(0, 0, 0, 0.08)', 
                backgroundColor: '#fff',
                minHeight: '76px'
              }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    height: '48px',
                  }}
                >
                  {customTheme?.logo_url ? (
                    <img
                      src={customTheme.logo_url}
                      alt="Café Logo"
                      style={{ 
                        maxHeight: '48px', 
                        maxWidth: '180px',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                      }}
                      onError={(e) => {
                        console.error('Error loading logo image:', customTheme.logo_url);
                        e.target.src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '18px', color: 'var(--primary-color)' }}>
                      <RestaurantIcon sx={{ fontSize: '24px' }} />
                      Café Local
                    </Box>
                  )}
                </Box>
                <IconButton
                  onClick={() => setIsMobileMenuOpen(false)}
                  sx={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '12px', 
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s ease',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)' }
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              {renderMobileMenuContent()}
            </Box>
          </Slide>
        </Drawer>

        <Drawer
          anchor="left"
          open={isDesktopMenuOpen}
          onClose={() => setIsDesktopMenuOpen(false)}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: '320px',
              backgroundColor: 'var(--background-color)',
              boxShadow: '4px 0 24px rgba(0, 0, 0, 0.12)',
            },
            '& .MuiBackdrop-root': { backgroundColor: 'rgba(0, 0, 0, 0.4)' },
          }}
        >
          <Slide direction="right" in={isDesktopMenuOpen} timeout={250}>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ 
                padding: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                borderBottom: '1px solid rgba(0, 0, 0, 0.08)', 
                backgroundColor: '#fff',
                minHeight: '88px'
              }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    height: '56px',
                  }}
                >
                  {customTheme?.logo_url ? (
                    <img
                      src={customTheme.logo_url}
                      alt="Café Logo"
                      style={{ 
                        maxHeight: '56px', 
                        maxWidth: '220px',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                      }}
                      onError={(e) => {
                        console.error('Error loading logo image:', customTheme.logo_url);
                        e.target.src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '20px', color: 'var(--primary-color)' }}>
                      <RestaurantIcon sx={{ fontSize: '28px' }} />
                      Café Local
                    </Box>
                  )}
                </Box>
                <IconButton
                  onClick={() => setIsDesktopMenuOpen(false)}
                  sx={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '12px', 
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s ease',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.08)' }
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
              
              <Box sx={{ 
                flex: 1, 
                overflowY: 'auto', 
                backgroundColor: 'var(--background-color)',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '4px',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  },
                },
              }}>
                {renderDesktopNavItems()}
              </Box>

              <Box sx={{ 
                padding: '20px', 
                backgroundColor: '#fff', 
                borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
              }}>
                {user && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <Avatar sx={{ width: '48px', height: '48px', backgroundColor: 'var(--primary-color)', fontSize: '20px', fontWeight: 600 }}>
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 600, color: '#1a1a1a', marginBottom: '4px', fontSize: '16px' }}
                      >
                        {user.name || 'User'}
                      </Typography>
                      <Chip
                        label={`${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`}
                        size="small"
                        sx={{ 
                          backgroundColor: 'var(--primary-color)', 
                          color: 'var(--text-color)', 
                          fontSize: '12px', 
                          fontWeight: 600,
                          height: '24px'
                        }}
                      />
                    </Box>
                  </Box>
                )}
                {user ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<LogoutIcon />}
                    onClick={handleLogout}
                    sx={{
                      borderRadius: '12px',
                      borderColor: 'rgba(0, 0, 0, 0.2)',
                      color: '#1a1a1a',
                      textTransform: 'none',
                      fontWeight: 600,
                      padding: '12px',
                      transition: 'all 0.2s ease',
                      '&:hover': { 
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        borderColor: 'rgba(0, 0, 0, 0.3)',
                      },
                    }}
                  >
                    Sign Out
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<PersonIcon />}
                    onClick={() => {
                      navigate('/login');
                      setIsDesktopMenuOpen(false);
                    }}
                    sx={{
                      borderRadius: '12px',
                      backgroundColor: 'var(--primary-color)',
                      color: 'var(--text-color)',
                      textTransform: 'none',
                      fontWeight: 600,
                      padding: '12px',
                      boxShadow: 'none',
                      transition: 'all 0.2s ease',
                      '&:hover': { 
                        backgroundColor: 'var(--secondary-color)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      },
                    }}
                  >
                    Staff Login
                  </Button>
                )}
              </Box>
            </Box>
          </Slide>
        </Drawer>

        <Box sx={{ height: { xs: '64px', md: '68px' } }} />
      </>
    );
  },
  (prev, next) =>
    prev.cart?.length === next.cart?.length &&
    prev.setIsCartOpen === next.setIsCartOpen &&
    prev.user?.role === next.user?.role &&
    prev.user?.name === next.user?.name &&
    prev.handleLogout === next.handleLogout &&
    prev.theme?.logo_url === next.theme?.logo_url
);

const NavItem = memo(
  ({ link, isPrimary, onClick }) => (
    <ListItemButton
      component={Link}
      to={link.to}
      onClick={onClick}
      sx={{
        margin: '3px 12px',
        borderRadius: '12px',
        backgroundColor: isPrimary ? 'var(--primary-color)' : 'transparent',
        color: '#1a1a1a',
        padding: '12px 16px',
        transition: 'all 0.2s ease',
        '&:hover': { 
          backgroundColor: isPrimary ? 'var(--secondary-color)' : 'rgba(0, 0, 0, 0.04)',
          transform: 'translateX(4px)',
        },
      }}
    >
      <ListItemIcon sx={{ color: isPrimary ? 'var(--text-color)' : 'var(--primary-color)', minWidth: '40px' }}>
        {link.icon}
      </ListItemIcon>
      <ListItemText
        primary={link.label}
        primaryTypographyProps={{ fontSize: '15px', fontWeight: isPrimary ? 600 : 500, color: isPrimary ? 'var(--text-color)' : '#1a1a1a' }}
      />
      {!isPrimary && <ChevronRightIcon sx={{ color: '#C7C7CC', fontSize: '18px' }} />}
    </ListItemButton>
  ),
  (prev, next) => prev.link.to === next.link.to && prev.isPrimary === next.isPrimary
);

export default Header;


