import React, { useEffect, useState } from 'react';
import { customerAPI } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import { X } from 'lucide-react';
import { useEditPermission } from '../components/ProtectedAction';
import { toast } from '../hooks/useToast';
import { confirm } from '../hooks/useConfirm';

const Customers = () => {
  const canEditCustomers = useEditPermission('customers');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    // Basic Information (Required)
    firstName: '',
    lastName: '',
    phone: '',

    // Optional Contact
    email: '',
    alternatePhone: '',

    // Product Type
    productType: '',
    companyName: '',
    companyType: '',
    gstNumber: '',
    panNumber: '',

    // Address
    street: '',
    area: '',
    city: '',
    state: '',
    zipCode: '',

    // Source & Status
    source: 'WALK_IN',
    status: 'ACTIVE',
    advancePaymentStatus: 'N/A',
    advancePaymentAmount: 0,
  });

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  const productTypes = [
    { value: 'STEEL', label: 'Steel' },
    { value: 'WOOD', label: 'Wood' },
  ];

  const companyTypes = [
    { value: 'FURNITURE_MANUFACTURING', label: 'Furniture Manufacturing' },
    { value: 'INTERIOR_DESIGN', label: 'Interior Design' },
    { value: 'DESIGN', label: 'Design' },
    { value: 'ARCHITECTURE', label: 'Architecture' },
    { value: 'CONSTRUCTION', label: 'Construction' },
    { value: 'REAL_ESTATE', label: 'Real Estate' },
    { value: 'HOSPITALITY', label: 'Hospitality' },
    { value: 'RETAIL', label: 'Retail' },
    { value: 'OFFICE_FURNITURE', label: 'Office Furniture' },
    { value: 'HOME_DECOR', label: 'Home Decor' },
    { value: 'WHOLESALE', label: 'Wholesale' },
    { value: 'INDIVIDUAL', label: 'Individual/Residential' },
    { value: 'OTHER', label: 'Other' },
  ];

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Auto-update payment status based on amount
  useEffect(() => {
    const amount = parseFloat(formData.advancePaymentAmount) || 0;
    if (amount === 0) {
      setFormData(prev => ({ ...prev, advancePaymentStatus: 'Not Paid' }));
    } else if (amount > 0) {
      setFormData(prev => ({ ...prev, advancePaymentStatus: 'Partial' }));
    }
  }, [formData.advancePaymentAmount]);

  const fetchCustomers = async () => {
    try {
      const response = await customerAPI.getAll();
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
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
      // Validate required fields
      if (!formData.firstName || !formData.phone) {
        toast.warning('Please fill First Name and Phone Number');
        return;
      }

      const customerData = {
        customerCode: editingCustomer?.customerCode || `CUST${Date.now().toString().slice(-6)}`,
        productType: formData.productType,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName?.trim() || '',
        phone: formData.phone.trim(),
        email: formData.email || undefined,
        alternatePhone: formData.alternatePhone || undefined,
        companyName: formData.companyName || undefined,
        gstNumber: formData.gstNumber || undefined,
        panNumber: formData.panNumber || undefined,
        address: {
          street: formData.street || '',
          area: formData.area || '',
          city: formData.city || '',
          state: formData.state || '',
          zipCode: formData.zipCode || ''
        },
        source: formData.source,
        status: formData.status,
        advancePaymentStatus: formData.advancePaymentStatus,
        advancePaymentAmount: formData.advancePaymentAmount
      };

      // Remove undefined fields
      Object.keys(customerData).forEach(key => {
        if (customerData[key] === undefined) {
          delete customerData[key];
        }
      });

      console.log('Sending customer data:', customerData);

      if (editingCustomer) {
        // Check if advance payment amount changed
        const advanceChanged = editingCustomer.advancePaymentAmount !== formData.advancePaymentAmount;

        if (advanceChanged) {
          console.log('💰 Advance payment changed! Using special API to sync orders...');
          console.log('  Old:', editingCustomer.advancePaymentAmount);
          console.log('  New:', formData.advancePaymentAmount);

          // First update advance payment (this will sync with orders)
          await customerAPI.updateAdvancePayment(editingCustomer._id, {
            advancePaymentAmount: formData.advancePaymentAmount
          });

          // Then update other customer fields (excluding advance payment)
          const { advancePaymentAmount, advancePaymentStatus, ...otherData } = customerData;
          if (Object.keys(otherData).length > 0) {
            await customerAPI.update(editingCustomer._id, otherData);
          }
        } else {
          // Normal update - advance payment didn't change
          await customerAPI.update(editingCustomer._id, customerData);
        }
      } else {
        await customerAPI.create(customerData);
      }
      setShowModal(false);
      resetForm();
      fetchCustomers();
      toast.success(editingCustomer ? 'Customer updated successfully! ✅' : 'Customer created successfully! ✅');
    } catch (error) {
      console.error('Failed to save customer:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || error.message || 'Failed to save customer');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      phone: customer.phone || '',
      email: customer.email || '',
      alternatePhone: customer.alternatePhone || '',
      productType: customer.productType || '',
      companyName: customer.companyName || '',
      gstNumber: customer.gstNumber || '',
      panNumber: customer.panNumber || '',
      street: customer.address?.street || '',
      area: customer.address?.area || '',
      city: customer.address?.city || '',
      state: customer.address?.state || '',
      zipCode: customer.address?.zipCode || '',
      source: customer.source || 'WALK_IN',
      status: customer.status || 'ACTIVE',
      advancePaymentStatus: customer.advancePaymentStatus || 'N/A',
      advancePaymentAmount: customer.advancePaymentAmount || 0,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm(
      'Are you sure you want to delete this customer? This action cannot be undone.',
      'Delete Customer'
    );
    if (!confirmed) return;

    try {
      await customerAPI.delete(id);
      fetchCustomers();
      toast.success('Customer deleted successfully! ✅');
    } catch (error) {
      console.error('Failed to delete customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      alternatePhone: '',
      productType: '',
      companyName: '',
      gstNumber: '',
      panNumber: '',
      street: '',
      area: '',
      city: '',
      state: '',
      zipCode: '',
      source: 'WALK_IN',
      status: 'ACTIVE',
      advancePaymentStatus: 'N/A',
      advancePaymentAmount: 0,
    });
    setEditingCustomer(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customer database</p>
        </div>
        {canEditCustomers && (
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            + Add Customer
          </Button>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advance Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advance Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => (
                <tr key={customer._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {customer.customerCode || customer.fromInquiry?.customerId || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {customer.companyName || customer.fromInquiry?.companyName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.firstName} {customer.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.gstNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${customer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {customer.status || 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {customer.productType || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${customer.advancePaymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                      customer.advancePaymentStatus === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                        customer.advancePaymentStatus === 'Not Paid' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {customer.advancePaymentStatus || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ₹{customer.advancePaymentAmount?.toLocaleString('en-IN') || '0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {canEditCustomers && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleEdit(customer)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-700 hover:bg-red-700"
                          onClick={() => handleDelete(customer._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Header - Sticky */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex justify-between items-center rounded-t-lg flex-shrink-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-white">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h2>
                <p className="text-red-100 text-sm mt-1">
                  {editingCustomer ? 'Update customer information' : 'Create a new customer record'}
                </p>
              </div>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-white hover:text-gray-200 ml-4 flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="p-6">

                {/* Basic Information Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-red-500">
                    Basic Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter first name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        placeholder="9876543210"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="customer@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alternate Phone
                      </label>
                      <input
                        type="tel"
                        name="alternatePhone"
                        value={formData.alternatePhone}
                        onChange={handleInputChange}
                        placeholder="Optional alternate number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product Type
                      </label>
                      <select
                        name="productType"
                        value={formData.productType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      >
                        <option value="">Select Product Type</option>
                        {productTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleInputChange}
                        placeholder="Enter company name (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Type
                      </label>
                      <select
                        name="companyType"
                        value={formData.companyType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      >
                        <option value="">Select Company Type</option>
                        {companyTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST Number
                      </label>
                      <input
                        type="text"
                        name="gstNumber"
                        value={formData.gstNumber}
                        onChange={handleInputChange}
                        placeholder="22AAAAA0000A1Z5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none uppercase"
                      />
                    </div>
                  </div>
                </div>


                {/* Address Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-red-500">
                    Address
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address
                      </label>
                      <input
                        type="text"
                        name="street"
                        value={formData.street}
                        onChange={handleInputChange}
                        placeholder="Enter street address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Area/Locality
                      </label>
                      <input
                        type="text"
                        name="area"
                        value={formData.area}
                        onChange={handleInputChange}
                        placeholder="Enter area"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Enter city"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      >
                        <option value="">Select State</option>
                        {indianStates.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PIN Code
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        placeholder="110001"
                        maxLength="6"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Inquiry Information Section - Only show if customer was onboarded from an inquiry */}
                {editingCustomer && editingCustomer.fromInquiry && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-green-500 flex items-center gap-2">
                      <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">FROM INQUIRY</span>
                      Original Inquiry Details
                    </h3>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-xs text-green-700 font-medium mb-3">
                        This customer was created from an inquiry. Below are the original inquiry details (read-only).
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer ID
                          </label>
                          <input
                            type="text"
                            value={editingCustomer.fromInquiry.customerId || editingCustomer.fromInquiry.meta?.customerId || 'N/A'}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={editingCustomer.fromInquiry.companyName || editingCustomer.fromInquiry.meta?.companyName || 'N/A'}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Enquiry Date
                          </label>
                          <input
                            type="text"
                            value={editingCustomer.fromInquiry.meta?.enquiryDate || 'N/A'}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Enquiry Time
                          </label>
                          <input
                            type="text"
                            value={editingCustomer.fromInquiry.meta?.enquiryTime || 'N/A'}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Products Requested
                          </label>
                          <div className="space-y-3">
                            {editingCustomer.fromInquiry.items && editingCustomer.fromInquiry.items.length > 0 ? (
                              editingCustomer.fromInquiry.items.map((item, index) => (
                                <div key={index} className="bg-white/60 p-3 rounded-md border border-green-200">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-gray-900">{item.description}</span>
                                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium border border-green-200">
                                      Qty: {item.quantity || 1}
                                    </span>
                                  </div>
                                  {item.meta?.details && (
                                    <div className="text-sm text-gray-600 mt-2 bg-white p-2 rounded border border-gray-100">
                                      {item.meta.details}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-gray-500 italic text-sm p-2">No products specified</div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Lead Platform
                          </label>
                          <input
                            type="text"
                            value={editingCustomer.fromInquiry.leadPlatform || editingCustomer.fromInquiry.meta?.leadPlatform || 'N/A'}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Lead Status
                          </label>
                          <input
                            type="text"
                            value={editingCustomer.fromInquiry.leadStatus || editingCustomer.fromInquiry.meta?.leadStatus || 'N/A'}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Probability
                          </label>
                          <input
                            type="text"
                            value={editingCustomer.fromInquiry.probability ? `${editingCustomer.fromInquiry.probability}%` : 'N/A'}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                          />
                        </div>

                        {editingCustomer.fromInquiry.notes && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Original Message/Notes
                            </label>
                            <textarea
                              value={editingCustomer.fromInquiry.notes}
                              disabled
                              rows="3"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed resize-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Source & Status Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-red-500">
                    Additional Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Advance Payment Status (Auto-calculated)
                      </label>
                      <select
                        name="advancePaymentStatus"
                        value={formData.advancePaymentStatus}
                        onChange={handleInputChange}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                      >
                        <option value="N/A">Not Applicable</option>
                        <option value="Not Paid">Not Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Advance Payment Amount
                      </label>
                      <input
                        type="number"
                        name="advancePaymentAmount"
                        value={formData.advancePaymentAmount}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="bg-gray-500 hover:bg-gray-600 px-6 py-2"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-red-700 hover:bg-red-700 px-6 py-2">
                    {editingCustomer ? 'Update Customer' : 'Create Customer'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
