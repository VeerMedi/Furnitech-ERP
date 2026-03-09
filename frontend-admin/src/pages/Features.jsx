import React, { useEffect, useState } from 'react';
import { featureAPI } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';

const Features = () => {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
  });

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const response = await featureAPI.getAll();
      setFeatures(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch features:', error);
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFeature) {
        await featureAPI.update(editingFeature._id, formData);
      } else {
        await featureAPI.create(formData);
      }
      setShowModal(false);
      resetForm();
      fetchFeatures();
    } catch (error) {
      console.error('Failed to save feature:', error);
    }
  };

  const handleEdit = (feature) => {
    setEditingFeature(feature);
    setFormData({
      name: feature.name,
      description: feature.description || '',
      code: feature.code,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this feature?')) {
      try {
        await featureAPI.delete(id);
        fetchFeatures();
      } catch (error) {
        console.error('Failed to delete feature:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      code: '',
    });
    setEditingFeature(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Features</h1>
          <p className="text-muted-foreground mt-1">Manage system features</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          + Add Feature
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Card key={feature._id}>
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">{feature.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                </div>
              </div>
              
              <div className="pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Feature Code</p>
                <code className="text-sm font-mono bg-accent px-2 py-1 rounded">{feature.code}</code>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => handleEdit(feature)} className="flex-1">
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(feature._id)} className="flex-1">
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-2xl font-semibold">
                {editingFeature ? 'Edit Feature' : 'Add Feature'}
              </h2>
              
              <Input
                label="Feature Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              
              <Input
                label="Feature Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., CRM, INVENTORY"
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-[var(--radius)] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  rows="3"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1">
                  {editingFeature ? 'Update' : 'Create'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowModal(false); resetForm(); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Features;
