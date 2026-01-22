import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';

function BannerManagement() {
  const [banners, setBanners] = useState([]);
  const [form, setForm] = useState({ id: null, link: '', is_enabled: true, image: null });
  const [userId, setUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    // If image_url is a full Cloudinary URL, use it directly; otherwise, prepend the API base URL
    return imageUrl.startsWith('http')
      ? `${imageUrl}?v=${Date.now()}`
      : `${import.meta.env.VITE_API_URL || 'https://lacoupole-back.onrender.com'}${imageUrl}?v=${Date.now()}`;
  };

  useEffect(() => {
    const fetchUserAndBanners = async () => {
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

        const bannersResponse = await api.getBanners({ user_id: currentUser.id });
        console.log('Banners data:', bannersResponse.data); // Debug log
        setBanners(bannersResponse.data || []);
      } catch (error) {
        console.error('Error validating session or fetching banners:', error);
        toast.error(error.response?.data?.error || 'Failed to load banners');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndBanners();

    // Periodically validate session and refresh banners to ensure admin access and data consistency
    const sessionValidationInterval = setInterval(() => {
      fetchUserAndBanners();
    }, 600000); // 600,000 ms = 10 minutes

    // Clean up interval on component unmount
    return () => clearInterval(sessionValidationInterval);
  }, []);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !isAdmin) {
      toast.error('User not authenticated or lacks admin access. Please log in again.');
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('link', form.link);
    formData.append('is_enabled', form.is_enabled);
    if (form.image) {
      formData.append('image', form.image);
    }

    try {
      console.log('Submitting banner with user_id:', userId); // Debug log
      if (form.id) {
        await api.updateBanner(form.id, formData);
        toast.success('Banner updated successfully');
      } else {
        await api.addBanner(formData);
        toast.success('Banner created successfully');
      }

      const response = await api.getBanners({ user_id: userId });
      setBanners(response.data || []);
      setForm({ id: null, link: '', is_enabled: true, image: null });
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error(error.response?.data?.error || 'Failed to save banner');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (banner) => {
    if (!isAdmin) {
      toast.error('Admin access required');
      return;
    }
    setForm({
      id: banner.id,
      link: banner.link,
      is_enabled: banner.is_enabled,
      image: null,
    });
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      toast.error('Admin access required');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this banner?')) return;

    try {
      await api.deleteBanner(id, { user_id: userId });
      setBanners(banners.filter((banner) => banner.id !== id));
      toast.success('Banner deleted successfully');
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.error(error.response?.data?.error || 'Failed to delete banner');
    }
  };

  const toggleEnable = async (banner) => {
    if (!isAdmin) {
      toast.error('Admin access required');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('link', banner.link);
      formData.append('is_enabled', !banner.is_enabled);

      await api.updateBanner(banner.id, formData);
      setBanners(
        banners.map((b) =>
          b.id === banner.id ? { ...b, is_enabled: !b.is_enabled } : b
        )
      );
      toast.success(`Banner ${banner.is_enabled ? 'disabled' : 'enabled'} successfully`);
    } catch (error) {
      console.error('Error toggling banner status:', error);
      toast.error(error.response?.data?.error || 'Failed to update banner status');
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

  return (
    <Box sx={{ padding: '24px', maxWidth: '800px', margin: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: 'var(--text-color)' }}>
        Banner Management
      </Typography>
      <Paper sx={{ p: 3, mb: 3, borderRadius: '12px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 500, color: 'var(--text-color)' }}>
          {form.id ? 'Edit Banner' : 'Add Banner'}
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Banner Link"
            name="link"
            value={form.link}
            onChange={handleInputChange}
            fullWidth
            sx={{ mb: 2 }}
            required
            disabled={loading || !isAdmin}
          />
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 1, color: 'var(--text-color)' }}>
              Banner Image
            </Typography>
            <input
              type="file"
              name="image"
              accept="image/jpeg,image/png"
              onChange={handleInputChange}
              disabled={loading || !isAdmin}
            />
            {form.id && banners.find((b) => b.id === form.id)?.image_url && (
              <Box sx={{ mt: 1 }}>
                <img
                  src={getImageUrl(banners.find((b) => b.id === form.id).image_url)}
                  alt="Current Banner"
                  style={{ maxWidth: '150px', height: 'auto', borderRadius: '8px', objectFit: 'cover' }}
                />
              </Box>
            )}
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                name="is_enabled"
                checked={form.is_enabled}
                onChange={(e) => setForm((prev) => ({ ...prev, is_enabled: e.target.checked }))}
                disabled={loading || !isAdmin}
              />
            }
            label="Enabled"
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !isAdmin}
              sx={{
                background: 'var(--primary-color)',
                color: '#fff',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                '&:hover': { background: 'var(--secondary-color)' },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : form.id ? 'Update Banner' : 'Add Banner'}
            </Button>
            {form.id && (
              <Button
                variant="outlined"
                onClick={() => setForm({ id: null, link: '', is_enabled: true, image: null })}
                disabled={loading || !isAdmin}
                sx={{
                  borderColor: 'var(--text-color)',
                  color: 'var(--text-color)',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                Cancel Edit
              </Button>
            )}
          </Box>
        </form>
      </Paper>
      <Paper sx={{ p: 3, borderRadius: '12px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 500, color: 'var(--text-color)' }}>
          Banners
        </Typography>
        {banners.length === 0 ? (
          <Typography>No banners available.</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Image</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Link</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Enabled</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {banners.map((banner) => (
                <TableRow key={banner.id}>
                  <TableCell>{banner.id}</TableCell>
                  <TableCell>
                    {banner.image_url ? (
                      <img
                        src={getImageUrl(banner.image_url)}
                        alt="Banner"
                        style={{ maxWidth: '100px', height: 'auto', borderRadius: '8px', objectFit: 'cover' }}
                        onError={() => toast.error(`Failed to load image for banner ${banner.id}`)}
                      />
                    ) : (
                      <Typography color="textSecondary">No image</Typography>
                    )}
                  </TableCell>
                  <TableCell>{banner.link}</TableCell>
                  <TableCell>{banner.is_enabled ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <Button
                      onClick={() => handleEdit(banner)}
                      variant="contained"
                      size="small"
                      sx={{
                        mr: 1,
                        background: '#2196F3',
                        '&:hover': { background: '#1976D2' },
                        textTransform: 'none',
                      }}
                      disabled={!isAdmin}
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(banner.id)}
                      variant="contained"
                      size="small"
                      sx={{
                        mr: 1,
                        background: '#d32f2f',
                        '&:hover': { background: '#b71c1c' },
                        textTransform: 'none',
                      }}
                      disabled={!isAdmin}
                    >
                      Delete
                    </Button>
                    <Button
                      onClick={() => toggleEnable(banner)}
                      variant="contained"
                      size="small"
                      sx={{
                        background: banner.is_enabled ? '#FF9800' : '#4CAF50',
                        '&:hover': { background: banner.is_enabled ? '#F57C00' : '#388E3C' },
                        textTransform: 'none',
                      }}
                      disabled={!isAdmin}
                    >
                      {banner.is_enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}

export default BannerManagement;
