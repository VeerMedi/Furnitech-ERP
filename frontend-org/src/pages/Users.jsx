import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { Plus, X, Edit2, Trash2, UserCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from '../hooks/useToast';
import { confirm } from '../hooks/useConfirm';

const API_URL = import.meta.env.VITE_API_URL;

const Users = () => {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    employeeId: '',
    designation: '',
    department: '',
    workflowRole: '',
    role: '',
    status: 'ACTIVE',
    isActive: true,
  });

  const departments = [
    { value: 'SALES_MARKETING', label: 'Sales & Marketing' },
    { value: 'DESIGN', label: 'Design Department' },
    { value: 'MANAGEMENT', label: 'Management' },
    { value: 'ACCOUNTS', label: 'Accounts' },
    { value: 'PRODUCTION', label: 'Production' },
    { value: 'INVENTORY', label: 'Inventory' },
    { value: 'QUALITY', label: 'Quality Control' },
    { value: 'LOGISTICS', label: 'Logistics' },
  ];

  const workflowRoles = [
    { value: 'POC', label: 'First Point of Contact (POC)', dept: 'SALES_MARKETING' },
    { value: 'SALES_EXECUTIVE', label: 'Sales Executive', dept: 'SALES_MARKETING' },
    { value: 'DESIGN_LEAD', label: 'Design Team Lead', dept: 'DESIGN' },
    { value: 'DESIGNER', label: 'Designer', dept: 'DESIGN' },
    { value: 'MARKETING_DIRECTOR', label: 'Marketing Director', dept: 'MANAGEMENT' },
    { value: 'ACCOUNTS_MANAGER', label: 'Accounts Manager', dept: 'ACCOUNTS' },
    { value: 'PRODUCTION_MANAGER', label: 'Production Manager', dept: 'PRODUCTION' },
    { value: 'QC_INSPECTOR', label: 'QC Inspector', dept: 'QUALITY' },
    { value: 'LOGISTICS_HEAD', label: 'Logistics Head', dept: 'LOGISTICS' },
  ];

  const token = localStorage.getItem('orgToken');
  const tenantId = localStorage.getItem('tenantId');
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-tenant-id': tenantId,
    },
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [location.pathname]);

  // Also reload when the page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Users page - Reloading due to visibility change');
        fetchUsers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users?t=${Date.now()}`, axiosConfig);
      const users = response.data.data || [];
      console.log('Users page - Fetched users:', users.map(u => ({
        id: u.employeeId,
        name: u.firstName,
        isActive: u.isActive
      })));
      setUsers(users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to fetch users: ' + (error.response?.data?.message || error.message));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${API_URL}/roles`, axiosConfig);
      setRoles(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare data - remove empty password on edit
      const submitData = { ...formData };
      if (editingUser && !submitData.password) {
        delete submitData.password;
      }

      console.log('Users page - Submitting form data:', {
        ...submitData,
        password: submitData.password ? '***' : undefined
      });

      if (editingUser) {
        const response = await axios.put(`${API_URL}/users/${editingUser._id}`, submitData, axiosConfig);
        console.log('Users page - Update response:', response.data);
      } else {
        const response = await axios.post(`${API_URL}/users`, submitData, axiosConfig);
        console.log('Users page - Create response:', response.data);
      }
      setShowModal(false);
      resetForm();
      fetchUsers();
      toast.success(editingUser ? 'User updated successfully! ✅' : 'User created successfully! ✅');
    } catch (error) {
      console.error('Failed to save user:', error);
      toast.error(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      password: '',
      employeeId: user.employeeId || '',
      designation: user.designation || '',
      department: user.department || '',
      workflowRole: user.workflowRole || '',
      role: user.role?._id || '',
      status: user.status || 'ACTIVE',
      isActive: user.isActive !== undefined ? user.isActive : true,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm(
      'Are you sure you want to deactivate this user? This action cannot be undone.',
      'Deactivate User'
    );
    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/users/${id}`, axiosConfig);
      toast.success('User deactivated successfully! ✅');
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      employeeId: '',
      designation: '',
      department: '',
      workflowRole: '',
      role: '',
      status: 'ACTIVE',
      isActive: true,
    });
    setEditingUser(null);
  };

  const getDepartmentBadge = (dept) => {
    const colors = {
      SALES_MARKETING: 'bg-primary/10 text-primary',
      DESIGN: 'bg-secondary/10 text-secondary',
      MANAGEMENT: 'bg-purple-500/10 text-purple-600',
      ACCOUNTS: 'bg-green-500/10 text-green-600',
      PRODUCTION: 'bg-blue-500/10 text-blue-600',
    };
    return colors[dept] || 'bg-muted text-muted-foreground';
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
          <h1 className="text-2xl font-semibold text-foreground">Team Members</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage users and their access</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {users.map((user) => (
          <Card key={user._id}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-foreground">
                      {user.firstName} {user.lastName}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${user.isActive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                      }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">{user.email}</p>
                    {user.phone && <p className="text-muted-foreground">{user.phone}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      {user.department && (
                        <span className={`px-2 py-0.5 text-xs rounded-md ${getDepartmentBadge(user.department)}`}>
                          {departments.find(d => d.value === user.department)?.label || user.department}
                        </span>
                      )}
                      {user.workflowRole && (
                        <span className="px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground">
                          {workflowRoles.find(w => w.value === user.workflowRole)?.label || user.workflowRole}
                        </span>
                      )}
                      {user.designation && (
                        <span className="text-xs text-muted-foreground">• {user.designation}</span>
                      )}
                    </div>
                    {user.role && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Role: {user.role.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(user)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(user._id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {users.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <p className="text-muted-foreground">No users found</p>
              <Button className="mt-4" onClick={() => { resetForm(); setShowModal(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add First User
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-foreground">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
                <Input
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={editingUser}
                />
                <Input
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                {!editingUser && (
                  <Input
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                  />
                )}
                <Input
                  label="Employee ID"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                />
                <Input
                  label="Designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g., Senior Designer"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.value} value={dept.value}>{dept.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Workflow Role</label>
                <select
                  value={formData.workflowRole}
                  onChange={(e) => setFormData({ ...formData, workflowRole: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm"
                >
                  <option value="">Select Workflow Role</option>
                  {workflowRoles
                    .filter(wr => !formData.department || wr.dept === formData.department)
                    .map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">System Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm"
                  required
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role._id} value={role._id}>{role.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => {
                    const status = e.target.value;
                    const isActive = status === 'ACTIVE' || status === 'ON_LEAVE';
                    setFormData({ ...formData, status, isActive });
                  }}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground text-sm"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button type="submit" className="flex-1">
                  {editingUser ? 'Update User' : 'Create User'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
