// src/pages/MenuManagement.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Container, Row, Col, Card, Button, Form, Table, Alert } from 'react-bootstrap';

const MenuManagement = () => {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    availability: true,
    dietary_tags: '',
    image: null,
  });
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, catsRes] = await Promise.all([
          axios.get('/api/menu-items'),
          axios.get('/api/categories'),
        ]);
        setMenuItems(itemsRes.data);
        setCategories(catsRes.data);
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      }
    };
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('user_id', user.id);
    formData.append('name', form.name);
    formData.append('description', form.description);
    formData.append('price', form.price);
    formData.append('category_id', form.category_id);
    formData.append('availability', form.availability);
    formData.append('dietary_tags', form.dietary_tags);
    if (form.image) formData.append('image', form.image);

    try {
      if (editingId) {
        await axios.put(`/api/menu-items/${editingId}`, formData);
      } else {
        await axios.post('/api/menu-items', formData);
      }
      setForm({ name: '', description: '', price: '', category_id: '', availability: true, dietary_tags: '', image: null });
      setEditingId(null);
      const { data } = await axios.get('/api/menu-items');
      setMenuItems(data);
    } catch (err) {
      setError('Failed to save menu item');
      console.error(err);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/categories', { user_id: user.id, name: categoryForm.name });
      setCategoryForm({ name: '' });
      const { data } = await axios.get('/api/categories');
      setCategories(data);
    } catch (err) {
      setError('Failed to save category');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/menu-items/${id}`, { data: { user_id: user.id } });
      setMenuItems(menuItems.filter((item) => item.id !== id));
    } catch (err) {
      setError('Failed to delete menu item');
      console.error(err);
    }
  };

  if (user?.role !== 'admin') {
    return <div>Access denied</div>;
  }

  return (
    <Container className="py-4">
      <h2>Menu Management</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>{editingId ? 'Edit Menu Item' : 'Add Menu Item'}</Card.Title>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Price</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    label="Available"
                    checked={form.availability}
                    onChange={(e) => setForm({ ...form, availability: e.target.checked })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Dietary Tags (comma-separated)</Form.Label>
                  <Form.Control
                    type="text"
                    value={form.dietary_tags}
                    onChange={(e) => setForm({ ...form, dietary_tags: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Image</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
                  />
                </Form.Group>
                <Button type="submit" variant="primary">
                  {editingId ? 'Update' : 'Add'} Item
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Add Category</Card.Title>
              <Form onSubmit={handleCategorySubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Category Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    required
                  />
                </Form.Group>
                <Button type="submit" variant="primary">
                  Add Category
                </Button>
              </Form>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <Card.Title>Menu Items</Card.Title>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>${item.price}</td>
                      <td>{item.category_name || 'N/A'}</td>
                      <td>
                        <Button
                          variant="info"
                          size="sm"
                          className="me-2"
                          onClick={() =>
                            setForm({
                              name: item.name,
                              description: item.description || '',
                              price: item.price,
                              category_id: item.category_id || '',
                              availability: item.availability,
                              dietary_tags: item.dietary_tags,
                              image: null,
                            }) & setEditingId(item.id)
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default MenuManagement;