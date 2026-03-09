import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import { toast } from '../hooks/useToast';

const AVAILABLE_ROLES = [
  { code: 'INQUIRY', name: 'Inquiry', description: 'Handles customer inquiries' },
  { code: 'SALES_HEAD', name: 'Sales Head', description: 'Manages sales operations' },
  { code: 'QUOTATION_MANAGER', name: 'Quotation Manager', description: 'Prepares quotations' },
  { code: 'DESIGNER', name: 'Designer', description: 'Creates designs and drawings' },
  { code: 'CNC_OPERATOR', name: 'CNC Operator', description: 'Operates CNC machines' },
  { code: 'BEAMSAW_KDI', name: 'BeamSaw (KDI)', description: 'Operates BeamSaw' },
  { code: 'INVENTORY_MANAGER', name: 'Inventory Manager', description: 'Manages inventory' },
  { code: 'STOCK_INWARD', name: 'Stock Inward', description: 'Handles incoming stock' },
  { code: 'PRODUCTION_MANAGER', name: 'Production Manager', description: 'Oversees production' },
  { code: 'DISPATCH_INSTALLATION', name: 'Dispatch/Installation', description: 'Handles dispatch' },
  { code: 'TEAM_LEAD', name: 'Team Lead', description: 'Leads team operations' },
  { code: 'ACCOUNTS', name: 'Accounts', description: 'Manages finances' },
];

const PermissionAccess = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(userId || '');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetails(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/useraccess/users');
      setUsers(response.data.data);
      if (userId && !selectedUserId) {
        setSelectedUserId(userId);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };

  const fetchUserDetails = async (id) => {
    setLoading(true);
    try {
      const response = await api.get(`/useraccess/users/${id}`);
      const user = response.data.data;
      setSelectedUser(user);
      setUserRoles(user.roles || []);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to fetch user');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (roleCode) => {
    setUserRoles(prev => {
      if (prev.includes(roleCode)) {
        return prev.filter(r => r !== roleCode);
      } else {
        return [...prev, roleCode];
      }
    });
  };

  const handleSave = async () => {
    if (!selectedUserId) {
      toast.warning('Please select a user');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/useraccess/users/${selectedUserId}/permissions`, {
        roles: userRoles
      });
      toast.success('Updated! ✅');
      navigate('/users');
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Permission Access</h1>
            <p className="text-gray-600 mt-2">Manage user roles and permissions</p>
          </div>
          <Button onClick={() => navigate('/users')} className="bg-gray-500 hover:bg-gray-600">
            Back to Users
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select User</h2>
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user._id}
                  onClick={() => setSelectedUserId(user._id)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedUserId === user._id
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : 'bg-white border-2 border-gray-200 hover:border-blue-300'
                    }`}
                >
                  <div className="font-semibold text-gray-900">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                  <div className="text-xs text-gray-500 mt-1">{user.employeeId}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Assign Roles & Permissions
            </h2>

            {!selectedUserId && (
              <div className="text-center py-12 text-gray-500">
                Please select a user to manage their permissions
              </div>
            )}

            {loading && (
              <div className="text-center py-12 text-gray-500">
                Loading user details...
              </div>
            )}

            {selectedUser && !loading && (
              <div>
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{selectedUser.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Employee ID: {selectedUser.employeeId}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${selectedUser.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                      }`}>
                      {selectedUser.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {AVAILABLE_ROLES.map((role) => {
                    const isActive = userRoles.includes(role.code);
                    return (
                      <div
                        key={role.code}
                        className={`p-4 rounded-lg border-2 transition-all ${isActive
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {role.name}
                              </h4>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => handleRoleToggle(role.code)}
                              className="sr-only peer"
                            />
                            <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-red-700"></div>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex justify-end space-x-4">
                  <Button
                    onClick={() => navigate('/users')}
                    className="bg-gray-500 hover:bg-gray-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    loading={saving}
                  >
                    {saving ? 'Saving...' : 'Save Permissions'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PermissionAccess;
