import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Input,
} from '@mui/material';

function ThemeManagement() {
  const [theme, setTheme] = useState({
    primary_color: '#ff6b35',
    secondary_color: '#ff8c42',
    background_color: '#faf8f5',
    text_color: '#1f2937',
    logo_url: null,
    favicon_url: '/favicon.ico',
    site_title: 'Café Local',
    currency: '$',
  });
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);

  // Function to construct image URLs with cache-busting
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    // If image_url is a full Cloudinary URL, use it directly; otherwise, prepend the API base URL
    return imageUrl.startsWith('http')
      ? `${imageUrl}?v=${Date.now()}`
      : `${import.meta.env.VITE_API_URL || 'https://lacoupole-back.onrender.com'}${imageUrl}?v=${Date.now()}`;
  };

  // Apply theme to CSS custom properties
  const applyTheme = (themeData) => {
    document.documentElement.style.setProperty('--primary-color', themeData.primary_color);
    document.documentElement.style.setProperty('--secondary-color', themeData.secondary_color);
    document.documentElement.style.setProperty('--background-color', themeData.background_color);
    document.documentElement.style.setProperty('--text-color', themeData.text_color);

    // Update favicon with full URL and cache-busting
    let favicon = document.querySelector("link[rel*='icon']");
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    const faviconUrl = themeData.favicon_url
      ? getImageUrl(themeData.favicon_url)
      : '/favicon.ico';
    favicon.href = faviconUrl;

    // Update document title
    document.title = themeData.site_title || 'Café Local';
  };

  useEffect(() => {
    const fetchUserAndTheme = async () => {
      try {
        const response = await api.get('/check-auth');
        const currentUser = response.data;
        console.log('Session validation:', currentUser); // Debug log
        if (!currentUser || !currentUser.id) {
          toast.error('User not authenticated. Please log in again.');
          return;
        }
        if (currentUser.role !== 'admin') {
          toast.error('Admin access required');
          return;
        }
        setUserId(currentUser.id);
        setIsAdmin(true);

        const themeResponse = await api.getTheme();
        console.log('Theme data:', themeResponse.data); // Debug log
        setTheme(themeResponse.data);
        applyTheme(themeResponse.data); // Apply theme on load
      } catch (error) {
        console.error('Error validating session or fetching theme:', error);
        toast.error(error.response?.data?.error || 'Failed to load theme');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndTheme();

    // Periodically validate session and refresh theme to keep backend awake
    const sessionValidationInterval = setInterval(() => {
      fetchUserAndTheme();
    }, 600000); // 600,000 ms = 10 minutes

    // Clean up interval on component unmount
    return () => clearInterval(sessionValidationInterval);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTheme((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (name === 'logo') {
      setLogoFile(files[0] || null);
    } else if (name === 'favicon') {
      setFaviconFile(files[0] || null);
    }
  };

  const handleThemeSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !isAdmin) {
      toast.error('User not authenticated or lacks admin access. Please log in again.');
      return;
    }
    setLoading(true);

    try {
      await api.updateTheme(theme);
      toast.success('Theme colors updated successfully');
      applyTheme(theme); // Apply updated theme
    } catch (error) {
      console.error('Error updating theme:', error);
      toast.error(error.response?.data?.error || 'Failed to update theme');
    } finally {
      setLoading(false);
    }
  };

  const handleBrandingSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !isAdmin) {
      toast.error('User not authenticated or lacks admin access. Please log in again.');
      return;
    }
    setLoading(true);

    try {
      const formData = new FormData();
      if (logoFile) formData.append('logo', logoFile);
      if (faviconFile) formData.append('favicon', faviconFile);
      if (theme.site_title) formData.append('site_title', theme.site_title);

      const response = await api.updateBranding(formData);
      const updatedTheme = { ...theme, ...response.data };
      setTheme(updatedTheme);
      applyTheme(updatedTheme);
      setLogoFile(null);
      setFaviconFile(null);
      toast.success('Branding updated successfully');
    } catch (error) {
      console.error('Error updating branding:', error);
      toast.error(error.response?.data?.error || 'Failed to update branding');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ padding: '20px', textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: 'red' }}>
          Admin access required
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ padding: '24px', maxWidth: '600px', margin: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: 'var(--text-color)' }}>
        Theme Management
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3, borderRadius: '12px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 500, color: 'var(--text-color)' }}>
          Colors & Currency
        </Typography>
        <form onSubmit={handleThemeSubmit}>
          <TextField
            label="Primary Color"
            name="primary_color"
            type="color"
            value={theme.primary_color}
            onChange={handleInputChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Secondary Color"
            name="secondary_color"
            type="color"
            value={theme.secondary_color}
            onChange={handleInputChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Background Color"
            name="background_color"
            type="color"
            value={theme.background_color}
            onChange={handleInputChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Text Color"
            name="text_color"
            type="color"
            value={theme.text_color}
            onChange={handleInputChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Currency Symbol"
            name="currency"
            type="text"
            value={theme.currency}
            onChange={handleInputChange}
            fullWidth
            placeholder="e.g., $, €, £, DT, ₹"
            helperText="Enter your currency symbol or abbreviation (max 10 characters)"
            inputProps={{ maxLength: 10 }}
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              background: 'var(--primary-color)',
              color: '#fff',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { background: 'var(--secondary-color)' },
            }}
            fullWidth
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Save Theme & Currency'}
          </Button>
        </form>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: '12px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 500, color: 'var(--text-color)' }}>
          Branding
        </Typography>
        <form onSubmit={handleBrandingSubmit}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 1, color: 'var(--text-color)' }}>
              Logo
            </Typography>
            {theme.logo_url ? (
              <Box sx={{ mb: 1 }}>
                <img
                  src={getImageUrl(theme.logo_url)}
                  alt="Logo"
                  style={{ maxWidth: '150px', maxHeight: '100px', borderRadius: '8px', objectFit: 'cover' }}
                  onError={() => toast.error('Failed to load logo image')}
                />
              </Box>
            ) : (
              <Typography color="textSecondary" sx={{ mb: 1 }}>
                No logo uploaded
              </Typography>
            )}
            <Input
              type="file"
              name="logo"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              fullWidth
              sx={{ mb: 2 }}
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 1, color: 'var(--text-color)' }}>
              Favicon
            </Typography>
            {theme.favicon_url ? (
              <Box sx={{ mb: 1 }}>
                <img
                  src={getImageUrl(theme.favicon_url)}
                  alt="Favicon"
                  style={{ maxWidth: '32px', maxHeight: '32px', borderRadius: '8px', objectFit: 'cover' }}
                  onError={() => toast.error('Failed to load favicon image')}
                />
              </Box>
            ) : (
              <Typography color="textSecondary" sx={{ mb: 1 }}>
                No favicon uploaded
              </Typography>
            )}
            <Input
              type="file"
              name="favicon"
              accept="image/jpeg,image/png,image/x-icon"
              onChange={handleFileChange}
              fullWidth
              sx={{ mb: 2 }}
            />
          </Box>
          <TextField
            label="Site Title"
            name="site_title"
            value={theme.site_title}
            onChange={handleInputChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading || (!logoFile && !faviconFile && !theme.site_title)}
            sx={{
              background: 'var(--primary-color)',
              color: '#fff',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { background: 'var(--secondary-color)' },
            }}
            fullWidth
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Save Branding'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}

export default ThemeManagement;
