import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildsService } from '../../services/buildsService';
import type { Build } from '../../types';

export default function BuildList() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBuildName, setNewBuildName] = useState('');
  const [newBuildDesc, setNewBuildDesc] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadBuilds();
  }, []);

  const loadBuilds = async () => {
    try {
      const data = await buildsService.getUserBuilds();
      setBuilds(data);
    } catch (error) {
      console.error('Failed to load builds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const build = await buildsService.createBuild({
        name: newBuildName,
        description: newBuildDesc,
      });
      navigate(`/builds/${build.id}`);
    } catch (error) {
      console.error('Failed to create build:', error);
    }
  };

  const handleDelete = async (buildId: number) => {
    if (confirm('Are you sure you want to delete this build?')) {
      try {
        await buildsService.deleteBuild(buildId);
        loadBuilds();
      } catch (error) {
        console.error('Failed to delete build:', error);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>My Builds</h2>
        <button onClick={() => setShowCreateModal(true)} style={{ padding: '10px 20px' }}>
          Create New Build
        </button>
      </div>

      {builds.length === 0 ? (
        <p>No builds yet. Create your first build!</p>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {builds.map((build) => (
            <div
              key={build.id}
              style={{
                border: '1px solid #ddd',
                padding: '20px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/builds/${build.id}`)}
            >
              <h3>{build.name}</h3>
              <p>{build.description}</p>
              <div style={{ marginTop: '10px' }}>
                <strong>Total Price:</strong> ${build.totalPrice.toFixed(2)} |{' '}
                <strong>Total Wattage:</strong> {build.totalWattage}W |{' '}
                <strong>Parts:</strong> {build.parts.length}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(build.id);
                }}
                style={{ marginTop: '10px', padding: '5px 15px', background: '#dc3545', color: 'white' }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
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
          onClick={() => setShowCreateModal(false)}
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
            <h3>Create New Build</h3>
            <form onSubmit={handleCreateBuild}>
              <div style={{ marginBottom: '15px' }}>
                <label>Build Name:</label>
                <input
                  type="text"
                  value={newBuildName}
                  onChange={(e) => setNewBuildName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label>Description:</label>
                <textarea
                  value={newBuildDesc}
                  onChange={(e) => setNewBuildDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '80px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ padding: '10px 20px' }}>
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '10px 20px', background: '#6c757d' }}
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
