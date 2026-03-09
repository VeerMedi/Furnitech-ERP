import React, { useEffect, useState } from 'react';
import { organizationAPI, featureAPI } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { Plus, X, Trash2, Settings as SettingsIcon, CheckCircle2, XCircle, Users, Edit2 } from 'lucide-react';

const Organizations = () => {
  const [organizations, setOrganizations] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [showAdminsModal, setShowAdminsModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [copyFromOrgId, setCopyFromOrgId] = useState('');
  const [editingAdminId, setEditingAdminId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    },
    subscriptionPlan: 'TRIAL',
    adminUser: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const [adminFormData, setAdminFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    fetchOrganizations();
    fetchFeatures();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      email: '',
      phone: '',
      address: { street: '', city: '', state: '', country: '', zipCode: '' },
      subscriptionPlan: 'TRIAL',
      adminUser: { firstName: '', lastName: '', email: '', phone: '', password: '' },
    });
    setAdminFormData({ firstName: '', lastName: '', email: '', phone: '', password: '' });
    setEditingAdminId(null);
  };

  const fetchOrganizations = async () => {
    try {
      const response = await organizationAPI.getAll();
      setOrganizations(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManageAdmins = (org) => {
    setSelectedOrg(org);
    setShowAdminsModal(true);
    resetForm();
  };

  const handleEditAdminClick = (admin) => {
    setEditingAdminId(admin._id);
    setAdminFormData({
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      phone: admin.phone || '',
      password: '', // Password stays blank unless user wants to change it
    });
  };

  const handleAddSecondaryAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingAdminId) {
        // Update existing secondary admin
        const payload = { ...adminFormData };
        if (!payload.password) delete payload.password; // Don't send empty password

        await organizationAPI.updateAdmin(selectedOrg._id, editingAdminId, payload);
        alert('Secondary admin updated successfully!');
      } else {
        // Add new secondary admin
        await organizationAPI.addAdmin(selectedOrg._id, adminFormData);
        alert('Secondary admin added successfully!');
      }

      setAdminFormData({ firstName: '', lastName: '', email: '', phone: '', password: '' });
      setEditingAdminId(null);
      fetchOrganizations();

      const refreshedOrgs = await organizationAPI.getAll();
      const updatedOrg = refreshedOrgs.data.data.find(o => o._id === selectedOrg._id);
      setSelectedOrg(updatedOrg);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSecondaryAdmin = async (email) => {
    if (!confirm('Are you sure you want to remove this admin?')) return;
    setLoading(true);
    try {
      await organizationAPI.removeAdmin(selectedOrg._id, email);
      alert('Admin removed successfully!');
      fetchOrganizations();
      const refreshedOrgs = await organizationAPI.getAll();
      const updatedOrg = refreshedOrgs.data.data.find(o => o._id === selectedOrg._id);
      setSelectedOrg(updatedOrg);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to remove admin');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatures = async () => {
    try {
      const response = await featureAPI.getAll();
      setFeatures(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch features:', error);
    }
  };

  const handleEdit = (org) => {
    setSelectedOrg(org);
    setFormData({
      name: org.name || '',
      slug: org.slug || '',
      email: org.email || '',
      phone: org.phone || '',
      address: {
        street: org.address?.street || '',
        city: org.address?.city || '',
        state: org.address?.state || '',
        country: org.address?.country || '',
        zipCode: org.address?.zipCode || '',
      },
      subscriptionPlan: org.subscriptionPlan || 'TRIAL',
      adminUser: {
        firstName: org.adminUser?.firstName || '',
        lastName: org.adminUser?.lastName || '',
        email: org.adminUser?.email || '',
        phone: org.adminUser?.phone || '',
        password: '', // Don't populate password
      },
    });
    setShowEditModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (showEditModal) {
        // Update existing organization
        const payload = { ...formData };
        if (!payload.adminUser.password) {
          delete payload.adminUser.password; // Don't send empty password
        }
        await organizationAPI.update(selectedOrg._id, payload);
        alert('Organization updated successfully!');
        setShowEditModal(false);
      } else {
        // Create new organization
        const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-');
        const payload = {
          ...formData,
          slug,
          seedData: true,
        };

        if (copyFromOrgId) {
          payload.copyFromOrg = copyFromOrgId;
        }

        const response = await organizationAPI.create(payload);

        const successMsg = copyFromOrgId
          ? `Organization "${formData.name}" created successfully!\n\nAll features and data copied.`
          : `Organization "${formData.name}" created successfully with initial data seeded.`;

        alert(successMsg);
        setShowCreateModal(false);
      }

      resetForm();
      setCopyFromOrgId('');
      fetchOrganizations();
    } catch (error) {
      console.error('Failed to save organization:', error);
      alert(error.response?.data?.message || 'Failed to save organization');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this organization?')) return;

    try {
      await organizationAPI.delete(id);
      fetchOrganizations();
    } catch (error) {
      console.error('Failed to delete organization:', error);
      alert('Failed to delete organization');
    }
  };

  const handleManageFeatures = (org) => {
    setSelectedOrg(org);
    setShowFeaturesModal(true);
  };

  const handleToggleFeature = async (featureId) => {
    if (!selectedOrg) return;

    try {
      const currentFeatures = selectedOrg.enabledFeatures || [];
      const featureIndex = currentFeatures.findIndex(f => {
        const fId = f.featureId?._id || f.featureId;
        return fId?.toString() === featureId.toString();
      });

      let updatedFeatures;
      if (featureIndex > -1) {
        // Remove feature
        updatedFeatures = currentFeatures.filter(f => {
          const fId = f.featureId?._id || f.featureId;
          return fId?.toString() !== featureId.toString();
        });
      } else {
        // Add feature with all sub-features enabled
        const feature = features.find(f => f._id === featureId);
        if (!feature) {
          console.error('Feature not found:', featureId);
          alert('Feature not found in the system');
          return;
        }

        updatedFeatures = [
          ...currentFeatures,
          {
            featureId: featureId,
            enabledSubFeatures: feature.subFeatures?.map(sf => sf.code) || [],
            enabledPermissions: feature.subFeatures?.map(sf => ({
              subFeatureCode: sf.code,
              actions: sf.permissions?.map(p => p.action) || [],
            })) || [],
          }
        ];
      }

      console.log('Updating features:', { orgId: selectedOrg._id, updatedFeatures });

      const response = await organizationAPI.updateFeatures(selectedOrg._id, {
        enabledFeatures: updatedFeatures
      });

      console.log('Update response:', response.data);

      // Update local state with response data
      if (response.data.success) {
        setSelectedOrg({
          ...selectedOrg,
          enabledFeatures: updatedFeatures
        });

        // Refresh organizations list
        await fetchOrganizations();

        // Show success message
        const actionMsg = featureIndex > -1 ? 'disabled' : 'enabled';
        alert(`Feature ${actionMsg} successfully!`);
      }
    } catch (error) {
      console.error('Failed to update features:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to update features';
      alert(`Error: ${errorMsg}`);
    }
  };



  const isFeatureEnabled = (featureId) => {
    if (!selectedOrg) return false;
    return selectedOrg.enabledFeatures?.some(f => {
      const fId = f.featureId?._id || f.featureId;
      return fId?.toString() === featureId.toString();
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Organizations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all organizations</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Organization
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {organizations.map((org) => (
          <Card key={org._id}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-foreground">{org.name}</h3>
                  {!org.isActive && (
                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-red-100 text-red-700">
                      INACTIVE
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-medium rounded-md ${org.subscriptionStatus === 'ACTIVE'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                    }`}>
                    {org.subscriptionStatus}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium rounded-md bg-secondary/10 text-secondary">
                    {org.subscriptionPlan}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p>Email: {org.email}</p>
                  <p>Phone: {org.phone}</p>
                  <p>Admin: {org.adminUser?.firstName} {org.adminUser?.lastName} ({org.adminUser?.email})</p>
                  <p>Features: {org.enabledFeatures?.length || 0} enabled</p>
                  <p>Created: {new Date(org.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(org)}
                >
                  <SettingsIcon className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleManageAdmins(org)}
                >
                  <Users className="w-4 h-4 mr-1" />
                  Admins
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleManageFeatures(org)}
                >
                  <SettingsIcon className="w-4 h-4 mr-1" />
                  Features
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(org._id)}
                  disabled={!org.isActive || org.subscriptionStatus === 'CANCELLED'}
                  className={(!org.isActive || org.subscriptionStatus === 'CANCELLED') ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {organizations.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <p className="text-muted-foreground">No organizations found</p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Organization
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Create/Edit Organization Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-foreground">
                {showEditModal ? 'Edit Organization' : 'Add New Organization'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Organization Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Organization Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="auto-generated"
                    disabled={showEditModal}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  <Input
                    label="Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">Subscription Plan</label>
                  <select
                    value={formData.subscriptionPlan}
                    onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm"
                  >
                    <option value="TRIAL">Trial</option>
                    <option value="BASIC">Basic</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
              </div>

              {!showEditModal && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Address</h3>
                  <Input
                    label="Street"
                    value={formData.address.street}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                    required
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="City"
                      value={formData.address.city}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                      required
                    />
                    <Input
                      label="State"
                      value={formData.address.state}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                      required
                    />
                    <Input
                      label="Zip Code"
                      value={formData.address.zipCode}
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value } })}
                      required
                    />
                  </div>
                  <Input
                    label="Country"
                    value={formData.address.country}
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                    required
                  />
                </div>
              )}

              {!showEditModal && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Data Configuration</h3>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      Copy from Existing Organization (Optional)
                    </label>
                    <select
                      value={copyFromOrgId}
                      onChange={(e) => setCopyFromOrgId(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm"
                    >
                      <option value="">Create with default data (roles, materials, machines)</option>
                      {organizations.map((org) => (
                        <option key={org._id} value={org._id}>
                          Copy from: {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Admin User</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={formData.adminUser.firstName}
                    onChange={(e) => setFormData({ ...formData, adminUser: { ...formData.adminUser, firstName: e.target.value } })}
                    required
                  />
                  <Input
                    label="Last Name"
                    value={formData.adminUser.lastName}
                    onChange={(e) => setFormData({ ...formData, adminUser: { ...formData.adminUser, lastName: e.target.value } })}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={formData.adminUser.email}
                    onChange={(e) => setFormData({ ...formData, adminUser: { ...formData.adminUser, email: e.target.value } })}
                    required
                  />
                  <Input
                    label="Phone"
                    value={formData.adminUser.phone}
                    onChange={(e) => setFormData({ ...formData, adminUser: { ...formData.adminUser, phone: e.target.value } })}
                    required
                  />
                  <Input
                    label={showEditModal ? "New Password (leave blank to keep current)" : "Password"}
                    type="password"
                    value={formData.adminUser.password}
                    onChange={(e) => setFormData({ ...formData, adminUser: { ...formData.adminUser, password: e.target.value } })}
                    required={!showEditModal}
                    placeholder="Min 8 characters"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (showEditModal ? 'Updating...' : 'Creating...') : (showEditModal ? 'Update Organization' : 'Create Organization')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Features Modal */}
      {showFeaturesModal && selectedOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Manage Features</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedOrg.name}</p>
              </div>
              <button onClick={() => setShowFeaturesModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {features.map((feature) => {
                const enabled = isFeatureEnabled(feature._id);
                return (
                  <div
                    key={feature._id}
                    className="p-4 rounded-lg border border-border hover:border-muted-foreground transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-foreground">{feature.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                        {feature.subFeatures && feature.subFeatures.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {feature.subFeatures.map((sf) => (
                              <span
                                key={sf.code}
                                className="px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground"
                              >
                                {sf.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Toggle Switch */}
                      <button
                        onClick={() => handleToggleFeature(feature._id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${enabled ? 'bg-primary' : 'bg-gray-300'
                          }`}
                        role="switch"
                        aria-checked={enabled}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}

              {features.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No features available</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4">
              <Button onClick={() => setShowFeaturesModal(false)} className="w-full">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Manage Admins Modal */}
      {showAdminsModal && selectedOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Manage Admins</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedOrg.name}</p>
              </div>
              <button onClick={() => setShowAdminsModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Existing Admins List */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Current Administrators</h3>

                {/* Primary Admin (Pinned) */}
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {selectedOrg.adminUser.firstName} {selectedOrg.adminUser.lastName}
                        </p>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded uppercase">Primary</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedOrg.adminUser.email}</p>
                    </div>
                  </div>
                </div>

                {/* Secondary Admins */}
                {selectedOrg.secondaryAdmins?.map((admin) => (
                  <div key={admin.email} className={`p-4 rounded-lg border transition-colors ${editingAdminId === admin._id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-foreground">{admin.firstName} {admin.lastName}</p>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditAdminClick(admin)}
                          className="text-primary hover:text-primary/80 p-2"
                          title="Edit Admin"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveSecondaryAdmin(admin.email)}
                          className="text-destructive hover:text-destructive/80 p-2"
                          title="Delete Admin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add/Edit Admin Form */}
              <div className="pt-6 border-t border-border">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    {editingAdminId ? 'Edit Administrator Details' : 'Add New Administrator'}
                  </h3>
                  {editingAdminId && (
                    <button
                      onClick={() => { setEditingAdminId(null); setAdminFormData({ firstName: '', lastName: '', email: '', phone: '', password: '' }); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <form onSubmit={handleAddSecondaryAdmin} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      value={adminFormData.firstName}
                      onChange={(e) => setAdminFormData({ ...adminFormData, firstName: e.target.value })}
                      required
                    />
                    <Input
                      label="Last Name"
                      value={adminFormData.lastName}
                      onChange={(e) => setAdminFormData({ ...adminFormData, lastName: e.target.value })}
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={adminFormData.email}
                      onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                      required
                    />
                    <Input
                      label="Phone"
                      value={adminFormData.phone}
                      onChange={(e) => setAdminFormData({ ...adminFormData, phone: e.target.value })}
                    />
                    <Input
                      label={editingAdminId ? "New Password (leave blank to keep current)" : "Password"}
                      type="password"
                      value={adminFormData.password}
                      onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                      required={!editingAdminId}
                      placeholder="Min 8 characters"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (editingAdminId ? 'Updating...' : 'Adding...') : (editingAdminId ? 'Update Administrator' : 'Add Administrator')}
                  </Button>
                </form>
              </div>
            </div>

            <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4">
              <Button onClick={() => setShowAdminsModal(false)} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;
