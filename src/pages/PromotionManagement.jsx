import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

function PromotionManagement() {
  const [user, setUser] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    discount_percentage: '',
    item_id: '',
    start_date: '',
    end_date: '',
    active: true,
  });
  const [editingId, setEditingId] = useState(null);
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
        toast.error('Please log in');
        navigate('/login');
      }
    };

    const fetchData = async () => {
      try {
        const [promoRes, itemsRes] = await Promise.all([
          api.get('/promotions'),
          api.get('/menu-items'),
        ]);
        setPromotions(promoRes.data || []);
        setMenuItems(itemsRes.data || []);
      } catch (err) {
        console.error('Failed to load data:', err);
        toast.error(err.response?.data?.error || 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
    fetchData();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.discount_percentage || !form.start_date || !form.end_date) {
      toast.error('All required fields must be filled');
      return;
    }
    const discount = parseFloat(form.discount_percentage);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      toast.error('Discount must be between 0% and 100%');
      return;
    }
    if (new Date(form.start_date) > new Date(form.end_date)) {
      toast.error('End date must be after start date');
      return;
    }
    if (editingId && (!Number.isInteger(parseInt(editingId)) || parseInt(editingId) < 1)) {
      toast.error('Invalid promotion ID');
      return;
    }
    try {
      const payload = {
        user_id: user.id,
        name: form.name,
        description: form.description,
        discount_percentage: discount,
        item_id: form.item_id || null,
        start_date: form.start_date,
        end_date: form.end_date,
        active: form.active,
      };
      if (editingId) {
        await api.put(`/promotions/${parseInt(editingId)}`, payload);
        toast.success('Promotion updated successfully');
      } else {
        await api.post('/promotions', payload);
        toast.success('Promotion created successfully');
      }
      setForm({
        name: '',
        description: '',
        discount_percentage: '',
        item_id: '',
        start_date: '',
        end_date: '',
        active: true,
      });
      setEditingId(null);
      const res = await api.get('/promotions');
      setPromotions(res.data || []);
    } catch (err) {
      console.error('Error saving promotion:', err);
      toast.error(err.response?.data?.error || 'Failed to save promotion');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) return;
    if (!Number.isInteger(id) || id < 1) {
      toast.error('Invalid promotion ID');
      return;
    }
    try {
      await api.delete(`/promotions/${id}`, { data: { user_id: user.id } });
      setPromotions(promotions.filter(promo => promo.id !== id));
      toast.success('Promotion deleted successfully');
    } catch (err) {
      console.error('Error deleting promotion:', err);
      toast.error(err.response?.data?.error || 'Failed to delete promotion');
    }
  };

  const handleEdit = (promo) => {
    if (!promo.id || !Number.isInteger(promo.id) || promo.id < 1) {
      toast.error('Invalid promotion ID');
      return;
    }
    setForm({
      name: promo.name,
      description: promo.description || '',
      discount_percentage: promo.discount_percentage,
      item_id: promo.item_id || '',
      start_date: promo.start_date ? promo.start_date.split('T')[0] : '',
      end_date: promo.end_date ? promo.end_date.split('T')[0] : '',
      active: promo.active,
    });
    setEditingId(promo.id);
  };

  if (isLoading || !user) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Promotion Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit Promotion' : 'Add Promotion'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="mt-1 block w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 block w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label htmlFor="discount_percentage" className="block text-sm font-medium text-gray-700">Discount Percentage</label>
              <input
                id="discount_percentage"
                type="number"
                value={form.discount_percentage}
                onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })}
                required
                min="0"
                max="100"
                className="mt-1 block w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label htmlFor="item_id" className="block text-sm font-medium text-gray-700">Menu Item (Optional)</label>
              <select
                id="item_id"
                value={form.item_id}
                onChange={(e) => setForm({ ...form, item_id: e.target.value })}
                className="mt-1 block w-full border rounded-md p-2"
              >
                <option value="">None</option>
                {menuItems.length > 0 ? (
                  menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))
                ) : (
                  <option disabled>No menu items available</option>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
                className="mt-1 block w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
                className="mt-1 block w-full border rounded-md p-2"
              />
            </div>
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="mr-2"
                />
                Active
              </label>
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              {editingId ? 'Update' : 'Add'} Promotion
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setForm({
                    name: '',
                    description: '',
                    discount_percentage: '',
                    item_id: '',
                    start_date: '',
                    end_date: '',
                    active: true,
                  });
                  setEditingId(null);
                }}
                className="ml-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            )}
          </form>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Promotions</h2>
          {promotions.length === 0 ? (
            <p>No promotions available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b">Name</th>
                    <th className="py-2 px-4 border-b">Discount (%)</th>
                    <th className="py-2 px-4 border-b">Item</th>
                    <th className="py-2 px-4 border-b">Active</th>
                    <th className="py-2 px-4 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((promo) => (
                    <tr key={promo.id}>
                      <td className="py-2 px-4 border-b">{promo.name}</td>
                      <td className="py-2 px-4 border-b">{promo.discount_percentage}</td>
                      <td className="py-2 px-4 border-b">{promo.item_name || 'All'}</td>
                      <td className="py-2 px-4 border-b">{promo.active ? 'Yes' : 'No'}</td>
                      <td className="py-2 px-4 border-b">
                        <button
                          onClick={() => handleEdit(promo)}
                          className="bg-blue-500 text-white px-3 py-1 rounded mr-2 hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(promo.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PromotionManagement;