import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Mail, Phone, Calendar, Clock, Circle, Trash2, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import AddUserModal from '../components/AddUserModal';
import UserPermissionModal from '../components/UserPermissionModal';
import { toast } from '../hooks/useToast';
import { confirm } from '../hooks/useConfirm';

const USER_ROLES = [
  { value: 'All', label: 'All Users', color: 'bg-gray-100 text-gray-700' },
  { value: 'POC', label: 'POC', color: 'bg-blue-100 text-blue-700' },
  { value: 'Salesman', label: 'Salesman', color: 'bg-green-100 text-green-700' },
  { value: 'Design', label: 'Design', color: 'bg-purple-100 text-purple-700' },
  { value: 'Design Dept Head', label: 'Design Dept Head', color: 'bg-violet-100 text-violet-700' },
  { value: 'Production', label: 'Production', color: 'bg-orange-100 text-orange-700' },
  { value: 'Project Manager', label: 'Project Manager', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'Account Handler', label: 'Account Handler', color: 'bg-pink-100 text-pink-700' },
  { value: 'Steel', label: 'Steel', color: 'bg-slate-100 text-slate-700' },
  { value: 'Wood', label: 'Wood', color: 'bg-amber-100 text-amber-700' },
];

const UserAccess = () => {
  const [users, setUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedUser, setDraggedUser] = useState(null);
  const [isOverDeleteZone, setIsOverDeleteZone] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState({}); // Track password visibility per user

  useEffect(() => {
    fetchUsers();
  }, [selectedRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = selectedRole !== 'All' ? { role: selectedRole } : {};
      const response = await api.get('/user-access/users', { params });

      if (response.data.success) {
        setUsers(response.data.data);

        // Update selectedUser if currently selected to ensure modal has fresh data
        if (selectedUser) {
          const updatedUser = response.data.data.find(u => u._id === selectedUser._id);
          if (updatedUser) {
            setSelectedUser(updatedUser);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getUserRoleColor = (role) => {
    const roleObj = USER_ROLES.find(r => r.value === role);
    return roleObj?.color || 'bg-gray-100 text-gray-700';
  };

  const handleDeleteUser = async (user) => {
    const confirmed = await confirm(`Delete ${user.firstName} ${user.lastName}?`, 'Delete User');
    if (!confirmed) return;
    try {
      await api.delete(`/user-access/users/${user._id}`);
      toast.success(`User deleted! ✅`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleDragStart = (e, user) => {
    setIsDragging(true);
    setDraggedUser(user);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedUser(null);
    setIsOverDeleteZone(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnDeleteZone = async (e) => {
    e.preventDefault();
    setIsOverDeleteZone(false);

    if (draggedUser) {
      await handleDeleteUser(draggedUser);
      setDraggedUser(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Users & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage user roles, permissions, and access controls
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Delete Zone - visible when dragging */}
          {isDragging && (
            <div
              onDragOver={(e) => {
                handleDragOver(e);
                setIsOverDeleteZone(true);
              }}
              onDragLeave={() => setIsOverDeleteZone(false)}
              onDrop={handleDropOnDeleteZone}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-dashed transition-all duration-200 ${isOverDeleteZone
                ? 'bg-red-100 border-red-500 scale-110'
                : 'bg-red-50 border-red-300'
                }`}
            >
              <Trash2 className={`w-6 h-6 ${isOverDeleteZone ? 'text-red-700' : 'text-red-500'}`} />
              <span className={`font-medium ${isOverDeleteZone ? 'text-red-700' : 'text-red-600'}`}>
                {isOverDeleteZone ? 'Drop to Delete' : 'Drag Here to Delete'}
              </span>
            </div>
          )}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Add User
          </button>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="bg-card border border-border rounded-lg p-2">
        <div className="flex gap-2 overflow-x-auto">
          {USER_ROLES.map((role) => (
            <button
              key={role.value}
              onClick={() => setSelectedRole(role.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${selectedRole === role.value
                ? role.color + ' shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
            >
              {role.label}
              {selectedRole === role.value && (
                <span className="ml-2 px-2 py-0.5 bg-white/40 rounded-full text-xs">
                  {users.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {/* User Cards Grid */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {users.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground text-lg">No users found for this role</p>
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user._id}
                draggable
                onDragStart={(e) => handleDragStart(e, user)}
                onDragEnd={handleDragEnd}
                className={`bg-card border border-border rounded-lg p-4 hover:shadow-lg transition-all cursor-move hover:border-red-300 hover:scale-[1.02] relative group ${isDragging && draggedUser?._id === user._id ? 'opacity-50' : ''
                  }`}
              >
                {/* Delete Button - Top Right */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(user);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors opacity-0 group-hover:opacity-100 hover:opacity-100"
                  title="Delete user"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* User content - clickable for permissions */}
                <div
                  onClick={() => {
                    setSelectedUser(user);
                    setIsPermissionModalOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  {/* User Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-foreground truncate">
                        {user.firstName} {user.lastName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${getUserRoleColor(user.userRole)}`}>
                          {user.userRole || 'User'}
                        </span>
                        {user.isOnline ? (
                          <div className="flex items-center gap-1 text-green-600 text-[10px]">
                            <Circle className="w-1.5 h-1.5 fill-current" />
                            Online
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400 text-[10px]">
                            <Circle className="w-1.5 h-1.5 fill-current" />
                            Offline
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 mb-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>

                    {/* Password field with eye toggle */}
                    {user.plainPassword && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] font-semibold">🔑</span>
                        <span className="truncate flex-1">
                          {passwordVisibility[user._id] ? user.plainPassword : '••••••••'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPasswordVisibility(prev => ({
                              ...prev,
                              [user._id]: !prev[user._id]
                            }));
                          }}
                          className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                          title={passwordVisibility[user._id] ? 'Hide password' : 'Show password'}
                        >
                          {passwordVisibility[user._id] ? (
                            <EyeOff className="w-3 h-3 text-gray-500" />
                          ) : (
                            <Eye className="w-3 h-3 text-gray-500" />
                          )}
                        </button>
                      </div>
                    )}

                    {user.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{formatLastLogin(user.lastLogin)}</span>
                    </div>
                  </div>

                  {/* Dashboard Permissions */}
                  {user.dashboardPermissions && user.dashboardPermissions.length > 0 && (
                    <div className="border-t border-border pt-3">
                      <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">
                        Access ({user.dashboardPermissions.length})
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {user.dashboardPermissions.slice(0, 3).map((perm, idx) => (
                          <div
                            key={idx}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${perm.accessLevel === 'edit'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                              }`}
                          >
                            {perm.dashboard.substring(0, 8)}
                            {perm.dashboard.length > 8 ? '...' : ''}
                          </div>
                        ))}
                        {user.dashboardPermissions.length > 3 && (
                          <div className="px-1.5 py-0.5 bg-muted rounded text-[9px] text-muted-foreground">
                            +{user.dashboardPermissions.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* No Permissions */}
                  {(!user.dashboardPermissions || user.dashboardPermissions.length === 0) && (
                    <div className="border-t border-border pt-3">
                      <p className="text-[10px] text-red-600 font-medium">No dashboard access</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchUsers}
      />

      {/* User Permission Modal */}
      <UserPermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => {
          setIsPermissionModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSuccess={fetchUsers}
      />
    </div>
  );
};

export default UserAccess;
