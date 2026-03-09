import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Pencil, X } from 'lucide-react';
import AddStaffModal from '../components/AddStaffModal';
import EditStaffModal from '../components/EditStaffModal';
import { staffAPI } from '../services/api';
import { toast } from '../hooks/useToast';
import { confirm } from '../hooks/useConfirm';

const StaffManagementPage = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    onLeave: 0,
    inactive: 0
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Clear old invalid cache data on component mount
    const cachedData = localStorage.getItem('staffData');
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        const hasInvalidIds = parsedData.some(item =>
          !item._id || item._id.length !== 24 || /^\d+$/.test(item._id)
        );

        if (hasInvalidIds) {
          console.log('Clearing invalid sample staff data from cache');
          localStorage.removeItem('staffData');
          localStorage.removeItem('staffDataTimestamp');
        }
      } catch (e) {
        console.log('Clearing corrupted staff cache');
        localStorage.removeItem('staffData');
        localStorage.removeItem('staffDataTimestamp');
      }
    }

    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setLoading(true);

      // Try to load from database first
      const response = await staffAPI.getAll();
      const data = response.data.data || response.data || [];

      if (data && data.length > 0) {
        setStaff(data);
        calculateStats(data);

        // Cache to localStorage
        try {
          localStorage.setItem('staffData', JSON.stringify(data));
          localStorage.setItem('staffDataTimestamp', Date.now().toString());
        } catch (storageError) {
          console.warn('Failed to cache staff data:', storageError);
        }
      } else {
        // No data in database, try localStorage fallback
        console.log('No staff in database, checking localStorage...');
        const cachedData = localStorage.getItem('staffData');

        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            setStaff(parsedData);
            calculateStats(parsedData);
            console.log('Loaded staff data from localStorage cache');
          } catch (parseError) {
            console.error('Failed to parse cached staff data:', parseError);
            setStaff([]);
            setStats({
              totalStaff: 0,
              activeStaff: 0,
              onLeave: 0,
              inactive: 0
            });
          }
        } else {
          setStaff([]);
          setStats({
            totalStaff: 0,
            activeStaff: 0,
            onLeave: 0,
            inactive: 0
          });
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading staff from database:', error);

      if (error.response?.status === 401) {
        navigate('/login');
        return;
      }

      // On API error, try localStorage fallback
      console.log('Database error, attempting localStorage fallback...');
      try {
        const cachedData = localStorage.getItem('staffData');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          setStaff(parsedData);
          calculateStats(parsedData);
          console.log('Loaded staff data from localStorage after API error');
        } else {
          setStaff([]);
          setStats({
            totalStaff: 0,
            activeStaff: 0,
            onLeave: 0,
            inactive: 0
          });
        }
      } catch (fallbackError) {
        console.error('localStorage fallback also failed:', fallbackError);
        setStaff([]);
        setStats({
          totalStaff: 0,
          activeStaff: 0,
          onLeave: 0,
          inactive: 0
        });
      }

      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const stats = {
      totalStaff: data.length,
      activeStaff: data.filter(s => s.status === 'Active').length,
      onLeave: data.filter(s => s.status === 'On Leave').length,
      inactive: data.filter(s => s.status === 'Inactive' || s.status === 'Suspended').length
    };
    setStats(stats);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'On Leave':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Inactive':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'Suspended':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleAddStaff = async (newStaff) => {
    try {
      const response = await staffAPI.create(newStaff);
      const createdStaff = response.data.staff;
      const updatedStaff = [createdStaff, ...staff];
      setStaff(updatedStaff);
      calculateStats(updatedStaff);
      setShowAddModal(false);
      toast.success('Staff added! ✅');
    } catch (error) {
      toast.error('Failed to add');
    }
  };

  const handleEditStaff = async (updatedStaff) => {
    try {
      // Check if this is sample data (ID is a simple number like '1', '2', etc.)
      const isSampleData = /^[0-9]$|^10$/.test(updatedStaff._id);

      if (!isSampleData) {
        // Only call API if it's real data from database
        await staffAPI.update(updatedStaff._id, updatedStaff);
      }

      // Update local state regardless
      const updatedList = staff.map(s =>
        s._id === updatedStaff._id ? updatedStaff : s
      );
      setStaff(updatedList);
      calculateStats(updatedList);
      setShowEditModal(false);
      setSelectedStaff(null);
      toast.success('Updated! ✅');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleDeleteStaff = async (id) => {
    const confirmed = await confirm('Delete this staff?', 'Delete');
    if (!confirmed) return;
    try {
      const isSampleData = /^[0-9]$|^10$/.test(id);
      if (!isSampleData) {
        await staffAPI.delete(id);
      }
      const updatedStaff = staff.filter(s => s._id !== id);
      setStaff(updatedStaff);
      calculateStats(updatedStaff);
      toast.success('Deleted! ✅');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const openEditModal = (staffMember) => {
    setSelectedStaff(staffMember);
    setShowEditModal(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-gray-600 mt-1">Manage your staff members and their details</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Add New Staff
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStaff}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-8 h-8 text-blue-600 opacity-20" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Staff</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeStaff}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-8 h-8 text-green-600 opacity-20" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">On Leave</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.onLeave}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Users className="w-8 h-8 text-yellow-600 opacity-20" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.inactive}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <Users className="w-8 h-8 text-red-600 opacity-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-500">No staff members found</td>
                  </tr>
                ) : (
                  staff.map((member) => (
                    <tr key={member._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.staffId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{member.address}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.contact}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{member.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(member.salary)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadgeColor(member.status)}`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Staff"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(member._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Staff"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <AddStaffModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddStaff}
        />
      )}

      {/* Edit Staff Modal */}
      {showEditModal && selectedStaff && (
        <EditStaffModal
          staff={selectedStaff}
          onClose={() => {
            setShowEditModal(false);
            setSelectedStaff(null);
          }}
          onSave={handleEditStaff}
        />
      )}
    </div>
  );
};

export default StaffManagementPage;
