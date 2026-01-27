import { useState, useEffect } from 'react';
import { partsService } from '../../services/partsService';
import type { PCPart } from '../../types';

const categories = ['CPU', 'Motherboard', 'RAM', 'GPU', 'Storage', 'PSU', 'Case'];

export default function AdminPanel() {
  const [parts, setParts] = useState<PCPart[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<PCPart | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'CPU',
    manufacturer: '',
    price: 0,
    powerConsumption: 0,
    imageUrl: '',
  });

  useEffect(() => {
    loadParts();
  }, []);

  const loadParts = async () => {
    try {
      const data = await partsService.getAllParts();
      setParts(data);
    } catch (error) {
      console.error('Failed to load parts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPart) {
        await partsService.updatePart(editingPart.id, formData);
      } else {
        await partsService.createPart(formData);
      }
      loadParts();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save part:', error);
    }
  };

  const handleEdit = (part: PCPart) => {
    setEditingPart(part);
    setFormData({
      name: part.name,
      category: part.category,
      manufacturer: part.manufacturer,
      price: part.price,
      powerConsumption: part.powerConsumption,
      imageUrl: part.imageUrl || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this part?')) {
      try {
        await partsService.deletePart(id);
        loadParts();
      } catch (error) {
        console.error('Failed to delete part:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingPart(null);
    setFormData({
      name: '',
      category: 'CPU',
      manufacturer: '',
      price: 0,
      powerConsumption: 0,
      imageUrl: '',
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>Admin - Manage Parts</h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          style={{ padding: '10px 20px', background: '#28a745', color: 'white' }}
        >
          Add New Part
        </button>
      </div>

      <div style={{ display: 'grid', gap: '15px' }}>
        {parts.map((part) => (
          <div key={part.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4>{part.name}</h4>
                <div style={{ color: '#666' }}>
                  {part.category} - {part.manufacturer}
                </div>
                <div style={{ marginTop: '5px' }}>
                  <strong>Price:</strong> ${part.price.toFixed(2)} |{' '}
                  <strong>Power:</strong> {part.powerConsumption}W
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleEdit(part)}
                  style={{ padding: '8px 16px', background: '#007bff', color: 'white' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(part.id)}
                  style={{ padding: '8px 16px', background: '#dc3545', color: 'white' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{editingPart ? 'Edit Part' : 'Add New Part'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label>Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label>Category:</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label>Manufacturer:</label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label>Price:</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label>Power Consumption (W):</label>
                <input
                  type="number"
                  value={formData.powerConsumption}
                  onChange={(e) => setFormData({ ...formData, powerConsumption: parseInt(e.target.value) })}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label>Image URL:</label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ padding: '10px 20px', background: '#28a745', color: 'white' }}>
                  {editingPart ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 20px', background: '#6c757d', color: 'white' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
