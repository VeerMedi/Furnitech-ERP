import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import { toast } from '../hooks/useToast';

const EditUser = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    employeeId: '',
    phone: '',
    email: '',
    department: '',
    status: 'ACTIVE',
    crmStages: '',
    isSystemAdmin: false,
    quotationHead: false,
  });

  const departments = [
    'SALES_MARKETING',
    'DESIGN',
    'MANAGEMENT',
    'ACCOUNTS',
    'PRODUCTION',
    'INVENTORY',
    'QUALITY',
    'LOGISTICS',
    'HR',
    'IT'
  ];

  const statuses = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'];

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const response = await api.get(`/useraccess/users/${userId}`);
      const user = response.data.data;
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        employeeId: user.employeeId || '',
        phone: user.phone || '',
        email: user.email || '',
        department: user.department || '',
        status: user.status || 'ACTIVE',
        crmStages: user.crmStages || '',
        isSystemAdmin: user.isSystemAdmin || false,
        quotationHead: user.quotationHead || false,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      toast.error('Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/useraccess/users/${userId}`, formData);
      toast.success('Updated! ✅');
      navigate('/users');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => navigate('/users')}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
        </div>
        <h1 className="text-3xl font-bold text-gray-800">Edit User Details</h1>
        <p className="text-gray-600 mt-2">Update user information</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter first name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter last name"
              />
            </div>

            {/* Employee ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Employee ID
              </label>
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter employee ID"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter phone number"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                placeholder="Enter email"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* CRM Stages */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CRM Stages
              </label>
              <input
                type="text"
                name="crmStages"
                value={formData.crmStages}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter CRM stages (comma separated)"
              />
            </div>

            {/* Checkboxes */}
            <div className="md:col-span-2 space-y-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isSystemAdmin"
                  name="isSystemAdmin"
                  checked={formData.isSystemAdmin}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isSystemAdmin" className="ml-2 text-sm font-medium text-gray-700">
                  Is System Admin
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="quotationHead"
                  name="quotationHead"
                  checked={formData.quotationHead}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="quotationHead" className="ml-2 text-sm font-medium text-gray-700">
                  Quotation Head
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <Button
              type="button"
              onClick={() => navigate('/users')}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-red-700 hover:bg-red-800">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-6">
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Manage User Roles</h2>
            <p className="text-gray-600 mb-4">
              To manage user roles and permissions, use the Permission Access page.
            </p>
            <Button
              onClick={() => navigate(`/users/permissions/${userId}`)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Go to Permission Access
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EditUser;
