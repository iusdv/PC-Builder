import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { buildsService } from '../../services/buildsService';
import { partsService } from '../../services/partsService';
import type { Build, PCPart, CompatibilityWarning } from '../../types';

const categories = ['CPU', 'Motherboard', 'RAM', 'GPU', 'Storage', 'PSU', 'Case'];

export default function BuildDetail() {
  const { id } = useParams<{ id: string }>();
  const [build, setBuild] = useState<Build | null>(null);
  const [warnings, setWarnings] = useState<CompatibilityWarning[]>([]);
  const [showAddPart, setShowAddPart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('CPU');
  const [availableParts, setAvailableParts] = useState<PCPart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadBuild();
      checkCompatibility();
    }
  }, [id]);

  useEffect(() => {
    if (showAddPart) {
      loadParts();
    }
  }, [selectedCategory, showAddPart]);

  const loadBuild = async () => {
    try {
      const data = await buildsService.getBuildById(Number(id));
      setBuild(data);
    } catch (error) {
      console.error('Failed to load build:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadParts = async () => {
    try {
      const parts = await partsService.getPartsByCategory(selectedCategory);
      setAvailableParts(parts);
    } catch (error) {
      console.error('Failed to load parts:', error);
    }
  };

  const checkCompatibility = async () => {
    try {
      const warnings = await buildsService.checkCompatibility(Number(id));
      setWarnings(warnings);
    } catch (error) {
      console.error('Failed to check compatibility:', error);
    }
  };

  const handleAddPart = async (partId: number) => {
    try {
      const updated = await buildsService.addPartToBuild(Number(id), {
        pcPartId: partId,
        quantity: 1,
      });
      setBuild(updated);
      setShowAddPart(false);
      checkCompatibility();
    } catch (error) {
      console.error('Failed to add part:', error);
    }
  };

  const handleRemovePart = async (partId: number) => {
    try {
      await buildsService.removePartFromBuild(Number(id), partId);
      loadBuild();
      checkCompatibility();
    } catch (error) {
      console.error('Failed to remove part:', error);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/shared/${build?.shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
  };

  const handleExport = () => {
    if (!build) return;
    const text = `
Build Name: ${build.name}
Description: ${build.description || 'N/A'}
Total Price: $${build.totalPrice.toFixed(2)}
Total Wattage: ${build.totalWattage}W

Parts:
${build.parts.map((bp) => `- ${bp.part.name} (${bp.part.category}) - $${bp.part.price} x${bp.quantity}`).join('\n')}
    `.trim();
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${build.name}.txt`;
    a.click();
  };

  if (loading) return <div>Loading...</div>;
  if (!build) return <div>Build not found</div>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2>{build.name}</h2>
        <p>{build.description}</p>
        <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
          <div>
            <strong>Total Price:</strong> ${build.totalPrice.toFixed(2)}
          </div>
          <div>
            <strong>Total Wattage:</strong> {build.totalWattage}W
          </div>
        </div>
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button onClick={handleShare} style={{ padding: '10px 20px' }}>
            Share Build
          </button>
          <button onClick={handleExport} style={{ padding: '10px 20px' }}>
            Export Build
          </button>
          <button onClick={() => setShowAddPart(true)} style={{ padding: '10px 20px', background: '#28a745' }}>
            Add Part
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>Compatibility Warnings</h3>
          {warnings.map((warning, index) => (
            <div key={index} style={{ marginTop: '10px' }}>
              <strong>{warning.type}:</strong> {warning.message} ({warning.severity})
            </div>
          ))}
        </div>
      )}

      <h3>Parts</h3>
      <div style={{ display: 'grid', gap: '15px' }}>
        {build.parts.length === 0 ? (
          <p>No parts added yet. Click "Add Part" to get started!</p>
        ) : (
          build.parts.map((bp) => (
            <div
              key={bp.part.id}
              style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4>{bp.part.name}</h4>
                  <div>
                    <span style={{ color: '#666' }}>{bp.part.category} - {bp.part.manufacturer}</span>
                  </div>
                  <div style={{ marginTop: '5px' }}>
                    <strong>Price:</strong> ${bp.part.price.toFixed(2)} x {bp.quantity} ={' '}
                    ${(bp.part.price * bp.quantity).toFixed(2)}
                  </div>
                  <div>
                    <strong>Power:</strong> {bp.part.powerConsumption}W x {bp.quantity} ={' '}
                    {bp.part.powerConsumption * bp.quantity}W
                  </div>
                </div>
                <button
                  onClick={() => handleRemovePart(bp.part.id)}
                  style={{ padding: '8px 16px', background: '#dc3545', color: 'white' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddPart && (
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
            padding: '20px',
          }}
          onClick={() => setShowAddPart(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '8px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Add Part</h3>
            <div style={{ marginBottom: '20px' }}>
              <label>Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gap: '15px' }}>
              {availableParts.map((part) => (
                <div
                  key={part.id}
                  style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4>{part.name}</h4>
                      <div style={{ color: '#666' }}>{part.manufacturer}</div>
                      <div style={{ marginTop: '5px' }}>
                        <strong>Price:</strong> ${part.price.toFixed(2)} |{' '}
                        <strong>Power:</strong> {part.powerConsumption}W
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddPart(part.id)}
                      style={{ padding: '8px 16px', background: '#28a745', color: 'white' }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowAddPart(false)}
              style={{ marginTop: '20px', padding: '10px 20px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
