import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit, Trash2, Download, Send, Search, Filter } from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../hooks/useToast';
import { confirm } from '../../hooks/useConfirm';

const QuotationList = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('quotations');
  const [inquiries, setInquiries] = useState([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);

  // Missing tables state
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filteredQuotations, setFilteredQuotations] = useState([]);

  // Check if user is Admin (limited actions)
  const isAdmin = user?.userRole === 'Admin' || user?.email === 'jasleen@vlite.com';

  useEffect(() => {
    filterQuotations();
  }, [quotations, searchTerm, statusFilter]);

  // Fetch quotations when component first mounts
  useEffect(() => {
    fetchQuotations();
  }, []);

  useEffect(() => {
    if (activeTab === 'quotations') {
      fetchQuotations();
    } else {
      fetchInquiries();
    }
  }, [activeTab]);

  const fetchInquiries = async () => {
    try {
      setLoadingInquiries(true);

      // Fetch both active and history inquiries
      const [activeRes, historyRes] = await Promise.all([
        api.get('/inquiries'),
        api.get('/inquiries?showHistory=true')
      ]);

      const activeInquiries = activeRes.data.data || activeRes.data || [];
      const historyInquiries = historyRes.data.data || historyRes.data || [];

      // Combine and sort by createdAt desc
      const allInquiries = [...activeInquiries, ...historyInquiries].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      setInquiries(allInquiries);
    } catch (err) {
      console.error('Error fetching inquiries:', err);
    } finally {
      setLoadingInquiries(false);
    }
  };

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/quotations');
      console.log('Quotations fetched:', res.data);

      let quotationsData = res.data.data || res.data;

      // Calculate missing summary fields for each quotation
      quotationsData = quotationsData.map(q => {
        if (!q.totalAmount || q.totalAmount === 0) {
          let taxableAmount = 0;
          let totalTax = 0;

          q.items?.forEach(item => {
            const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
            const taxRate = (item.taxPerUnit || 18) / 100;
            const taxAmount = lineTotal * taxRate;
            taxableAmount += lineTotal;
            totalTax += taxAmount;
          });

          const cgst = totalTax / 2;
          const sgst = totalTax / 2;
          const totalAmount = taxableAmount + totalTax - (q.discount || 0);

          return {
            ...q,
            taxableAmount,
            cgst,
            sgst,
            totalAmount
          };
        }
        return q;
      });

      setQuotations(quotationsData);
    } catch (err) {
      console.error('Error fetching quotations:', err);
      setError(err.response?.data?.message || err.message || 'Error loading quotations');
    } finally {
      setLoading(false);
    }
  };

  const filterQuotations = () => {
    if (!Array.isArray(quotations)) {
      setFilteredQuotations([]);
      return;
    }

    let filtered = [...quotations];

    if (searchTerm) {
      filtered = filtered.filter(q =>
        q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.customer?.companyName || q.customer?.tradeName || q.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(q => q.approvalStatus === statusFilter);
    }

    setFilteredQuotations(filtered);
  };

  const handleDelete = async (id, quotationNumber) => {
    const confirmed = await confirm(
      `Delete quotation ${quotationNumber}?`,
      'Delete Quotation'
    );
    if (!confirmed) return;

    try {
      await api.delete(`/quotations/${id}`);
      toast.success('Quotation deleted successfully! ✅');
      fetchQuotations();
    } catch (err) {
      console.error('Error deleting quotation:', err);
      toast.error(err.response?.data?.message || 'Error deleting quotation');
    }
  };

  const handleDownloadPDF = async (id) => {
    try {
      const response = await api.get(`/quotations/${id}/pdf`, {
        responseType: 'blob'
      });

      // Create blob URL and open in new tab
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Clean up the URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Error generating PDF. Please try again.');
    }
  };

  const handleSendEmail = async (id, quotationNumber) => {
    const confirmed = await confirm(
      `Send quotation ${quotationNumber} via email?`,
      'Send Quotation'
    );
    if (!confirmed) return;

    try {
      await api.post(`/quotations/${id}/send`);
      toast.success('Quotation sent successfully! ✅');
      fetchQuotations();
    } catch (err) {
      console.error('Error sending quotation:', err);
      toast.error(err.response?.data?.message || 'Error sending quotation');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      SENT: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sent' },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' }
    };
    const badge = badges[status] || badges.DRAFT;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getInquiryStatusBadge = (status) => {
    const badges = {
      NEW: { bg: 'bg-blue-100', text: 'text-blue-800' },
      CONTACTED: { bg: 'bg-purple-100', text: 'text-purple-800' },
      QUALIFIED: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      CONVERTED: { bg: 'bg-green-100', text: 'text-green-800' },
      UNQUALIFIED: { bg: 'bg-red-100', text: 'text-red-800' },
      CLOSED: { bg: 'bg-gray-100', text: 'text-gray-800' }
    };
    const badge = badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {status}
      </span>
    );
  };

  const getStatusCounts = () => {
    if (!Array.isArray(quotations)) {
      return { all: 0, DRAFT: 0, SENT: 0, APPROVED: 0, REJECTED: 0 };
    }
    return {
      all: quotations.length,
      DRAFT: quotations.filter(q => q.approvalStatus === 'DRAFT').length,
      SENT: quotations.filter(q => q.approvalStatus === 'SENT').length,
      APPROVED: quotations.filter(q => q.approvalStatus === 'APPROVED').length,
      REJECTED: quotations.filter(q => q.approvalStatus === 'REJECTED').length,
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quotations & Inquiries</h1>
          <p className="text-gray-600 mt-1">Manage quotations and view inquiry status</p>
        </div>
        {activeTab === 'quotations' && (
          <Button onClick={() => navigate('/quotations/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Quotation
          </Button>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('quotations')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'quotations'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Quotations
        </button>
        <button
          onClick={() => setActiveTab('inquiries')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'inquiries'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Inquiries
        </button>
      </div>

      {activeTab === 'quotations' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('')}>
              <div className="text-sm text-gray-600 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900">{statusCounts.all}</div>
            </Card>
            <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('DRAFT')}>
              <div className="text-sm text-gray-600 mb-1">Draft</div>
              <div className="text-2xl font-bold text-gray-600">{statusCounts.DRAFT}</div>
            </Card>
            <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('SENT')}>
              <div className="text-sm text-gray-600 mb-1">Sent</div>
              <div className="text-2xl font-bold text-blue-600">{statusCounts.SENT}</div>
            </Card>
            <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('APPROVED')}>
              <div className="text-sm text-gray-600 mb-1">Approved</div>
              <div className="text-2xl font-bold text-green-600">{statusCounts.APPROVED}</div>
            </Card>
            <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setStatusFilter('REJECTED')}>
              <div className="text-sm text-gray-600 mb-1">Rejected</div>
              <div className="text-2xl font-bold text-red-600">{statusCounts.REJECTED}</div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4 mb-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search quotations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              {(searchTerm || statusFilter) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>

          {/* Quotations Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Lead / Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        Loading quotations...
                      </td>
                    </tr>
                  ) : filteredQuotations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        {searchTerm || statusFilter ? 'No quotations match your filters' : 'No quotations found. Create your first quotation!'}
                      </td>
                    </tr>
                  ) : (
                    filteredQuotations.map((quotation) => (
                      <tr
                        key={quotation._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{quotation.quotationNumber}</div>
                          {quotation.revisionNumber > 0 && (
                            <div className="text-xs text-gray-500">Rev. {quotation.revisionNumber}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {quotation.customerName || quotation.companyName || quotation.customer?.companyName || quotation.customer?.tradeName || 'N/A'}
                          </div>
                          {quotation.customerEmail && (
                            <div className="text-xs text-gray-500 mt-0.5">{quotation.customerEmail}</div>
                          )}
                          {(quotation.customer?.customerCode || quotation.customerId) && (
                            <div className="text-xs text-gray-500 mt-0.5">ID: {quotation.customer?.customerCode || quotation.customerId}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(quotation.validFrom).toLocaleDateString('en-IN')}
                          </div>
                          <div className="text-xs text-gray-500">
                            Valid until: {new Date(quotation.validUntil).toLocaleDateString('en-IN')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-bold text-gray-900">
                            ₹{quotation.totalAmount.toLocaleString('en-IN')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(quotation.approvalStatus)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
                            {/* View button - Always visible */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/quotations/${quotation._id}`);
                              }}
                              className="text-blue-600 hover:text-blue-800 transition-colors p-1 hover:bg-blue-50 rounded"
                              title="View"
                            >
                              <Eye className="w-6 h-6" />
                            </button>

                            {/* Edit button - Always visible */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/quotations/${quotation._id}/edit`);
                              }}
                              className="text-gray-600 hover:text-gray-800 transition-colors p-1 hover:bg-gray-50 rounded"
                              title="Edit"
                            >
                              <Edit className="w-6 h-6" />
                            </button>

                            {/* Download, Send - Hidden for Admin */}
                            {!isAdmin && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDownloadPDF(quotation._id);
                                  }}
                                  className="text-green-600 hover:text-green-800 transition-colors p-1 hover:bg-green-50 rounded"
                                  title="Download PDF"
                                >
                                  <Download className="w-6 h-6" />
                                </button>
                                {quotation.approvalStatus === 'DRAFT' && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSendEmail(quotation._id, quotation.quotationNumber);
                                    }}
                                    className="text-purple-600 hover:text-purple-800 transition-colors p-1 hover:bg-purple-50 rounded"
                                    title="Send Email"
                                  >
                                    <Send className="w-6 h-6" />
                                  </button>
                                )}
                              </>
                            )}

                            {/* Delete button - Always visible */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(quotation._id, quotation.quotationNumber);
                              }}
                              className="text-red-600 hover:text-red-800 transition-colors p-1 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-6 h-6" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <>


          {/* Inquiries Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingInquiries ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        Loading inquiries...
                      </td>
                    </tr>
                  ) : inquiries.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        No inquiries found.
                      </td>
                    </tr>
                  ) : (
                    inquiries.map((inquiry) => (
                      <tr
                        key={inquiry._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{inquiry.customerName}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(inquiry.createdAt).toLocaleDateString('en-IN')} • {inquiry.enquiryTime || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{inquiry.contact}</div>
                          {inquiry.email && (
                            <div className="text-xs text-gray-500">{inquiry.email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium">{inquiry.productName}</div>
                          {inquiry.items?.[0]?.quantity && (
                            <div className="text-xs text-gray-500">Qty: {inquiry.items[0].quantity}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{inquiry.leadPlatform}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getInquiryStatusBadge(inquiry.leadStatus)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/quotations/new?inquiryId=${inquiry._id}`)}
                            title="Create Quotation from Inquiry"
                          >
                            Create Quote
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default QuotationList;
