import React, { useState, useEffect } from 'react';
import { Upload, X, FileText, Image, File, Send, User, Phone, MapPin, Building, StickyNote, Package, UserCheck, Mail } from 'lucide-react';
import { orderAPI } from '../services/api';
import Button from '../components/Button';
import Card from '../components/Card';
import { toast } from '../hooks/useToast';

const Drawing = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [spocs, setSpocs] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSpoc, setSelectedSpoc] = useState('');
  const [customerOrders, setCustomerOrders] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchSpocs();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getAll({ limit: 1000 }); // Get all orders
      const allOrders = response.data.data || [];
      setOrders(allOrders);

      // Extract unique customers from orders
      const uniqueCustomers = [];
      const customerMap = new Map();

      allOrders.forEach(order => {
        if (order.customer && order.customer._id) {
          if (!customerMap.has(order.customer._id)) {
            customerMap.set(order.customer._id, {
              ...order.customer,
              _id: order.customer._id
            });
            uniqueCustomers.push(order.customer);
          }
        }
      });

      setCustomers(uniqueCustomers);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpocs = async () => {
    // Hardcoded list of salesmen - no API call needed
    const salesmen = [
      { id: 'rachana', name: 'Rachana Matondkar' },
      { id: 'mohammed', name: 'Mohammed Gouse' },
      { id: 'parth', name: 'Parth Nathani' },
      { id: 'vidit', name: 'Vidit Phonde' },
      { id: 'danish', name: 'Danish' },
      { id: 'vaibhav', name: 'Vaibhav' },
      { id: 'vedant', name: 'Vedant' }
    ];
    setSpocs(salesmen);
  };

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
    setUploadedFiles([]);
    setSelectedSpoc('');

    // Filter orders for this customer
    const custOrders = orders.filter(order => order.customer?._id === customer._id);
    setCustomerOrders(custOrders);
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => ({
      file,
      name: file.name,
      size: (file.size / 1024).toFixed(2), // KB
      type: file.type || 'Unknown'
    }));
    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  const removeFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSendToSalesman = async () => {
    if (!selectedSpoc) {
      toast.warning('Please select a Salesman');
      return;
    }

    if (uploadedFiles.length === 0) {
      toast.warning('Please upload at least one file');
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('customerId', selectedCustomer._id);
      formData.append('spocId', selectedSpoc);
      formData.append('title', `Drawing for ${selectedCustomer.firstName} ${selectedCustomer.lastName}`);

      uploadedFiles.forEach((fileObj) => {
        formData.append('files', fileObj.file);
      });

      const token = localStorage.getItem('orgToken');
      const tenantId = localStorage.getItem('tenantId');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/drawings/upload-to-spoc`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.data.length} file(s) sent! ✅`);
        setUploadedFiles([]);
        setSelectedSpoc('');
      } else {
        const error = await response.json();
        toast.error('Failed to send files');
      }
    } catch (error) {
      console.error('Error sending files:', error);
      toast.error('Failed to send files');
    } finally {
      setSending(false);
    }
  };

  const getFileIcon = (type) => {
    if (type.includes('image')) return <Image className="w-5 h-5 text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Drawing Dashboard</h1>
          <p className="text-gray-600 mt-1">Select a customer to upload and send drawings</p>
        </div>

        {/* Selected Customer Details */}
        {selectedCustomer && (
          <Card className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-600">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-700 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {selectedCustomer.firstName?.[0]}{selectedCustomer.lastName?.[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </h2>
                    <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {selectedCustomer.type}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-red-600" />
                    <span className="font-medium">Phone:</span>
                    <span>{selectedCustomer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4 text-red-600" />
                    <span className="font-medium">Email:</span>
                    <span>{selectedCustomer.email || 'Not provided'}</span>
                  </div>
                  {selectedCustomer.companyName && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Building className="w-4 h-4 text-red-600" />
                      <span className="font-medium">Company:</span>
                      <span>{selectedCustomer.companyName}</span>
                    </div>
                  )}
                  {selectedCustomer.gstNumber && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <FileText className="w-4 h-4 text-red-600" />
                      <span className="font-medium">GST:</span>
                      <span>{selectedCustomer.gstNumber}</span>
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="flex items-start gap-2 text-gray-700 md:col-span-2">
                      <MapPin className="w-4 h-4 text-red-600 mt-1" />
                      <div>
                        <span className="font-medium">Address:</span>
                        <p className="text-gray-600">
                          {selectedCustomer.address.street && `${selectedCustomer.address.street}, `}
                          {selectedCustomer.address.area && `${selectedCustomer.address.area}, `}
                          {selectedCustomer.address.city && `${selectedCustomer.address.city}, `}
                          {selectedCustomer.address.state && `${selectedCustomer.address.state} `}
                          {selectedCustomer.address.zipCode}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* File Upload Section */}
                <div className="mt-6 border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload Drawing Files</h3>

                  <div className="mb-4">
                    <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-red-300 rounded-lg cursor-pointer bg-white hover:bg-red-50 transition-colors">
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-red-600" />
                        <p className="text-sm text-gray-600">
                          Click to upload files (PDF, Images, Documents, etc.)
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          All file types supported
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="*/*"
                      />
                    </label>
                  </div>

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <h4 className="font-medium text-gray-700">Uploaded Files ({uploadedFiles.length})</h4>
                      {uploadedFiles.map((fileObj, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getFileIcon(fileObj.type)}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{fileObj.name}</p>
                              <p className="text-xs text-gray-500">{fileObj.size} KB</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Salesman Selection Dropdown */}
                  {uploadedFiles.length > 0 && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <UserCheck className="w-4 h-4 inline mr-2 text-red-600" />
                          Select Salesman
                        </label>
                        <select
                          value={selectedSpoc}
                          onChange={(e) => setSelectedSpoc(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        >
                          <option value="">-- Select a Salesman --</option>
                          <option value="rachana">Rachana Matondkar</option>
                          <option value="mohammed">Mohammed Gouse</option>
                          <option value="parth">Parth Nathani</option>
                          <option value="vidit">Vidit Phonde</option>
                          <option value="danish">Danish</option>
                          <option value="vaibhav">Vaibhav</option>
                          <option value="vedant">Vedant</option>
                        </select>
                      </div>

                      <Button
                        onClick={handleSendToSalesman}
                        disabled={sending || !selectedSpoc}
                        className="w-full bg-red-700 hover:bg-red-700 disabled:bg-gray-400"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {sending ? 'Sending...' : 'Send Files to Salesman Dashboard'}
                      </Button>
                    </>
                  )}
                </div>

                {/* Order Notes Section */}
                {customerOrders.length > 0 && (
                  <div className="mt-6 border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <StickyNote className="w-5 h-5 text-red-600" />
                      Order Notes ({customerOrders.length} orders)
                    </h3>

                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {customerOrders.map((order, index) => (
                        <div key={order._id} className="bg-white border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">
                              Order #{order.orderNumber || `Order ${index + 1}`}
                            </h4>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                              {order.orderStatus}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {/* Production Notes */}
                            {order.productionNotes && (
                              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                                <p className="text-xs font-semibold text-yellow-800 mb-1">Production Notes:</p>
                                <p className="text-sm text-gray-700">{order.productionNotes}</p>
                              </div>
                            )}

                            {/* Customer Notes */}
                            {order.customerNotes && (
                              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                                <p className="text-xs font-semibold text-blue-800 mb-1">Customer Notes:</p>
                                <p className="text-sm text-gray-700">{order.customerNotes}</p>
                              </div>
                            )}

                            {/* Internal Notes */}
                            {order.internalNotes && (
                              <div className="bg-purple-50 border-l-4 border-purple-400 p-3 rounded">
                                <p className="text-xs font-semibold text-purple-800 mb-1">Internal Notes:</p>
                                <p className="text-sm text-gray-700">{order.internalNotes}</p>
                              </div>
                            )}

                            {!order.productionNotes && !order.customerNotes && !order.internalNotes && (
                              <p className="text-sm text-gray-500 italic">No notes available for this order</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </Card>
        )}

        {/* Customer Cards Grid */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {selectedCustomer ? 'Select Another Customer' : 'Select a Customer'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {customers.map((customer) => (
              <Card
                key={customer._id}
                className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${selectedCustomer?._id === customer._id
                  ? 'ring-2 ring-red-600 bg-red-50'
                  : 'hover:bg-gray-50'
                  }`}
                onClick={() => handleCustomerClick(customer)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-700 rounded-full flex items-center justify-center text-white font-bold">
                    {customer.firstName?.[0]}{customer.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {customer.firstName} {customer.lastName}
                    </h3>
                    <p className="text-sm text-gray-600 truncate">{customer.phone}</p>
                  </div>
                </div>
                {customer.email && (
                  <div className="mt-2 text-xs text-gray-500 truncate">
                    <Mail className="w-3 h-3 inline mr-1" />
                    {customer.email}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {customers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No customers found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Drawing;
