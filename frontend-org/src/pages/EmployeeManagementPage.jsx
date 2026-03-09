import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Plus, Pencil, X } from 'lucide-react';
import AddEmployeeModal from '../components/AddEmployeeModal';
import EditEmployeeModal from '../components/EditEmployeeModal';
import axios from 'axios';
import { useEditPermission } from '../components/ProtectedAction';
import { toast } from '../hooks/useToast';
import { confirm } from '../hooks/useConfirm';

const API_URL = import.meta.env.VITE_API_URL;

const EmployeeManagementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const canEditManagement = useEditPermission('management');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeave: 0,
    inactive: 0
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const token = localStorage.getItem('orgToken');
  const tenantId = localStorage.getItem('tenantId');
  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-tenant-id': tenantId,
    },
  };

  // Reload data whenever the route changes (user navigates to this page)
  useEffect(() => {
    window.scrollTo(0, 0);
    loadEmployees();
  }, [location.pathname]);

  // Also reload when the page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Employee page - Reloading due to visibility change');
        loadEmployees();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadEmployees = async () => {
    try {
      // Add timestamp to prevent caching
      const response = await axios.get(`${API_URL}/users?t=${Date.now()}`, axiosConfig);
      const data = response.data.data || [];

      console.log('Employee page - Loaded users:', data.map(u => ({
        id: u.employeeId,
        name: u.firstName,
        isActive: u.isActive
      })));

      if (data.length === 0) {
        generateSampleData();
      } else {
        // Map user data to employee format
        const mappedEmployees = data.map(user => {
          // Map backend status enum to employee status
          let employeeStatus = 'Active';
          if (user.status === 'INACTIVE') {
            employeeStatus = 'Inactive';
          } else if (user.status === 'TERMINATED') {
            employeeStatus = 'Terminated';
          } else if (user.status === 'ON_LEAVE') {
            employeeStatus = 'On Leave';
          } else if (user.status === 'ACTIVE') {
            employeeStatus = 'Active';
          } else if (!user.isActive) {
            // Fallback to isActive if status is not set
            employeeStatus = 'Inactive';
          }

          return {
            _id: user._id,
            staffId: user.employeeId || 'N/A',
            name: `${user.firstName} ${user.lastName}`,
            contact: user.phone || 'N/A',
            email: user.email,
            salary: user.salary || 0,
            status: employeeStatus
          };
        });

        console.log('Employee page - Mapped employees:', mappedEmployees.map(e => ({
          id: e.staffId,
          name: e.name,
          status: e.status
        })));

        setEmployees(mappedEmployees);
        calculateStats(mappedEmployees);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        console.log('Falling back to sample data');
        generateSampleData();
      }
    } finally {
      setLoading(false);
    }
  };

  const generateSampleData = () => {
    const sampleEmployees = [
      {
        _id: '1',
        staffId: 'EMP-001',
        name: 'Arjun Mehta',
        contact: '9876543210',
        email: 'arjun.mehta@vlite.com',
        salary: 55000,
        status: 'Active'
      },
      {
        _id: '2',
        staffId: 'EMP-002',
        name: 'Neha Gupta',
        contact: '9765432109',
        email: 'neha.gupta@vlite.com',
        salary: 48000,
        status: 'Active'
      },
      {
        _id: '3',
        staffId: 'EMP-003',
        name: 'Karan Singh',
        contact: '9654321098',
        email: 'karan.singh@vlite.com',
        salary: 42000,
        status: 'On Leave'
      },
      {
        _id: '4',
        staffId: 'EMP-004',
        name: 'Pooja Rao',
        contact: '9543210987',
        email: 'pooja.rao@vlite.com',
        salary: 52000,
        status: 'Active'
      },
      {
        _id: '5',
        staffId: 'EMP-005',
        name: 'Rohit Sharma',
        contact: '9432109876',
        email: 'rohit.sharma@vlite.com',
        salary: 38000,
        status: 'Active'
      },
      {
        _id: '6',
        staffId: 'EMP-006',
        name: 'Divya Iyer',
        contact: '9321098765',
        email: 'divya.iyer@vlite.com',
        salary: 46000,
        status: 'Active'
      },
      {
        _id: '7',
        staffId: 'EMP-007',
        name: 'Sanjay Kumar',
        contact: '9210987654',
        email: 'sanjay.kumar@vlite.com',
        salary: 35000,
        status: 'Inactive'
      },
      {
        _id: '8',
        staffId: 'EMP-008',
        name: 'Priyanka Nair',
        contact: '9109876543',
        email: 'priyanka.nair@vlite.com',
        salary: 44000,
        status: 'Active'
      }
    ];

    setEmployees(sampleEmployees);
    calculateStats(sampleEmployees);
  };

  const calculateStats = (data) => {
    const stats = {
      totalEmployees: data.length,
      activeEmployees: data.filter(e => e.status === 'Active').length,
      onLeave: data.filter(e => e.status === 'On Leave').length,
      inactive: data.filter(e => e.status === 'Inactive' || e.status === 'Terminated').length
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
      case 'Terminated':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleAddEmployee = async (newEmployee) => {
    try {
      // Map employee status to backend status enum
      let backendStatus = 'ACTIVE';
      let isActive = true;

      if (newEmployee.status === 'Inactive') {
        backendStatus = 'INACTIVE';
        isActive = false;
      } else if (newEmployee.status === 'Terminated') {
        backendStatus = 'TERMINATED';
        isActive = false;
      } else if (newEmployee.status === 'On Leave') {
        backendStatus = 'ON_LEAVE';
        isActive = true;
      } else if (newEmployee.status === 'Active') {
        backendStatus = 'ACTIVE';
        isActive = true;
      }

      const userData = {
        firstName: newEmployee.name.split(' ')[0],
        lastName: newEmployee.name.split(' ').slice(1).join(' ') || '',
        email: newEmployee.email,
        phone: newEmployee.contact,
        employeeId: newEmployee.staffId,
        password: 'default123',
        salary: newEmployee.salary,
        status: backendStatus,
        isActive: isActive
      };

      await axios.post(`${API_URL}/users`, userData, axiosConfig);
      toast.success('Added! ✅');
      loadEmployees();
      setShowAddModal(false);
    } catch (error) {
      toast.error('Failed');
    }
  };

  const handleEditEmployee = async (updatedEmployee) => {
    try {
      // Map employee status to backend status enum
      let backendStatus = 'ACTIVE';
      let isActive = true;

      if (updatedEmployee.status === 'Inactive') {
        backendStatus = 'INACTIVE';
        isActive = false;
      } else if (updatedEmployee.status === 'Terminated') {
        backendStatus = 'TERMINATED';
        isActive = false;
      } else if (updatedEmployee.status === 'On Leave') {
        backendStatus = 'ON_LEAVE';
        isActive = true;
      } else if (updatedEmployee.status === 'Active') {
        backendStatus = 'ACTIVE';
        isActive = true;
      }

      const userData = {
        firstName: updatedEmployee.name.split(' ')[0],
        lastName: updatedEmployee.name.split(' ').slice(1).join(' ') || '',
        email: updatedEmployee.email,
        phone: updatedEmployee.contact,
        salary: updatedEmployee.salary,
        status: backendStatus,
        isActive: isActive
      };

      await axios.put(`${API_URL}/users/${updatedEmployee._id}`, userData, axiosConfig);
      toast.success('Updated! ✅');
      loadEmployees();
      setShowEditModal(false);
      setSelectedEmployee(null);
    } catch (error) {
      toast.error('Failed');
    }
  };

  const handleDeleteEmployee = async (id) => {
    const confirmed = await confirm('Delete?', 'Delete');
    if (!confirmed) return;
    try {
      await axios.delete(`${API_URL}/users/${id}`, axiosConfig);
      toast.success('Deleted! ✅');
      loadEmployees();
    } catch (error) {
      toast.error('Failed');
    }
  };

  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600 mt-1">Manage your employees and their details</p>
          </div>
          {canEditManagement && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition font-medium"
            >
              <Plus className="w-5 h-5" />
              Add New Employee
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalEmployees}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-8 h-8 text-blue-600 opacity-20" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Employees</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeEmployees}</p>
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

        {/* Employee Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
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
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">No employees found</td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employee.staffId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.contact}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(employee.salary)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadgeColor(employee.status)}`}>
                          {employee.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {canEditManagement && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(employee)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit Employee"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(employee._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Employee"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddEmployee}
        />
      )}

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <EditEmployeeModal
          employee={selectedEmployee}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEmployee(null);
          }}
          onSave={handleEditEmployee}
        />
      )}
    </div>
  );
};

export default EmployeeManagementPage;
