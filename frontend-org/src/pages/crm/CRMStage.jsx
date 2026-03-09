import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Search, Plus, MoreHorizontal, Save } from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';
import AddLeadModal from '../../components/AddLeadModal';
import { useEditPermission } from '../../components/ProtectedAction';
import { toast } from '../../hooks/useToast';

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED', 'LOST'];

const CRMStage = () => {
  const canEditPipeline = useEditPermission('crm-pipeline');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tempProbability, setTempProbability] = useState(null);
  const [isSavingProbability, setIsSavingProbability] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [search]);

  const fetchLeads = async () => {
    try {
      // Fetch both active inquiries and onboarded CONVERTED inquiries
      const [activeRes, convertedRes] = await Promise.all([
        api.get(`/inquiries?search=${search}`), // Active inquiries
        api.get(`/inquiries?search=${search}&showHistory=true`) // Onboarded inquiries
      ]);

      const activeInquiries = Array.isArray(activeRes.data) ? activeRes.data : (activeRes.data?.data || []);
      const historyInquiries = Array.isArray(convertedRes.data) ? convertedRes.data : (convertedRes.data?.data || []);

      // Filter only CONVERTED inquiries from history
      const convertedInquiries = historyInquiries.filter(inquiry => inquiry.leadStatus === 'CONVERTED');

      // Combine active inquiries with converted ones
      const allInquiries = [...activeInquiries, ...convertedInquiries];

      // Transform to lead format for Sales Pipeline
      const transformedLeads = allInquiries.map(inquiry => ({
        _id: inquiry._id,
        title: `${inquiry.customerName} - ${inquiry.productName}`,
        status: inquiry.leadStatus || 'NEW',
        contact: {
          name: inquiry.customerName,
          email: inquiry.email,
          phone: inquiry.contact
        },
        probability: inquiry.probability || 20,
        company: inquiry.customerName,
        productName: inquiry.productName,
        isOnboarded: inquiry.isOnboarded || false,
        onboardedCustomerCode: inquiry.onboardedCustomerCode,
        // AI Scoring data
        aiScore: inquiry.aiScore,
        aiPriority: inquiry.aiPriority,
        aiInsights: inquiry.aiInsights,
        aiConfidence: inquiry.aiConfidence
      }));

      setLeads(transformedLeads);
    } catch (err) {
      console.error('Error fetching leads:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;

    // Optimistic update
    const updatedLeads = leads.map(lead =>
      lead._id === draggableId ? { ...lead, status: newStatus } : lead
    );
    setLeads(updatedLeads);

    try {
      // Fetch the full inquiry to preserve all existing data
      const response = await api.get(`/inquiries/${draggableId}`);
      const fullInquiry = response.data.data;

      // If moving to CONVERTED, validate product fields before onboarding
      if (newStatus === 'CONVERTED') {
        const hasValidProducts = fullInquiry.products && fullInquiry.products.length > 0 &&
          fullInquiry.products.every(item => 
            item.productName?.trim() && 
            item.quantity && 
            item.productDetails?.trim()
          );

        if (!hasValidProducts) {
          toast.warning('Cannot convert to customer: Please fill Product Name, Quantity, and Product Details for all products before onboarding.');
          fetchLeads(); // Revert the optimistic update
          return;
        }

        // Onboard the client automatically
        try {
          const onboardResponse = await api.post(`/inquiries/${draggableId}/onboard`);
          console.log('Auto-onboard response:', onboardResponse.data);
          toast.success(`Client onboarded successfully! 🎉 Customer Code: ${onboardResponse.data.data.customerCode}`);
          fetchLeads(); // Refresh to show updated status
          return;
        } catch (onboardError) {
          console.error('Error auto-onboarding client:', onboardError);
          toast.error(`Failed to onboard client: ${onboardError.response?.data?.message || onboardError.message}`);
          fetchLeads(); // Revert
          return;
        }
      }

      // Update only the leadStatus while preserving all other fields
      await api.put(`/inquiries/${draggableId}`, {
        customerName: fullInquiry.meta?.customerName,
        companyName: fullInquiry.companyName || fullInquiry.meta?.companyName,
        customerId: fullInquiry.customerId,
        contact: fullInquiry.meta?.contact,
        email: fullInquiry.meta?.email,
        address: fullInquiry.meta?.address,
        enquiryDate: fullInquiry.meta?.enquiryDate,
        enquiryTime: fullInquiry.meta?.enquiryTime,
        productName: fullInquiry.items?.[0]?.description || 'N/A',
        status: fullInquiry.meta?.status || 'new',
        priority: fullInquiry.meta?.priority || 'medium',
        leadPlatform: fullInquiry.leadPlatform || 'Website',
        leadStatus: newStatus, // Only this field changes
        probability: fullInquiry.probability || 20,
        message: fullInquiry.notes || '',
        productDetails: fullInquiry.items?.[0]?.meta?.details || '',
      });

      console.log(`Successfully updated inquiry ${draggableId} to ${newStatus}`);
    } catch (err) {
      console.error('Failed to update stage', err);
      fetchLeads(); // Revert on error
    }
  };

  const getLeadsByStage = (stage) => leads.filter(l => l.status === stage);

  const handleLeadAdded = () => {
    // Refresh leads after adding
    fetchLeads();
    setIsAddModalOpen(false);
  };

  return (
    <div className="p-6 bg-gray-50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sales Pipeline</h1>
          <p className="text-sm text-gray-600 mt-1">Drag and drop leads to update their stage</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>
          {canEditPipeline && (
            <Button
              className="bg-red-500 hover:bg-red-700 whitespace-nowrap"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Lead
            </Button>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {STAGES.map(stage => (
            <div key={stage} className="flex flex-col bg-white rounded-2xl border border-red-200 shadow-lg">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h3 className="font-semibold text-sm text-gray-900">{stage}</h3>
                <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-medium">
                  {getLeadsByStage(stage).length}
                </span>
              </div>

              <Droppable droppableId={stage}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="p-3 space-y-3 overflow-y-auto min-h-[200px] max-h-[400px]"
                  >
                    {getLeadsByStage(stage).map((lead, index) => (
                      <Draggable
                        key={lead._id}
                        draggableId={lead._id}
                        index={index}
                        isDragDisabled={lead.status === 'CONVERTED'}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <div
                              className={`bg-white rounded-lg p-3 border-2 transition-all ${lead.status === 'CONVERTED'
                                ? 'border-emerald-300 opacity-75 cursor-not-allowed'
                                : snapshot.isDragging
                                  ? 'border-red-400 shadow-xl scale-105 cursor-grabbing'
                                  : 'border-gray-200 hover:border-red-300 hover:shadow-md cursor-pointer'
                                }`}
                              onClick={() => {
                                setSelectedInquiry(lead);
                                setTempProbability(null); // Reset temp probability when opening modal
                                setShowDetailModal(true);
                              }}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-sm text-gray-900 leading-tight pr-2">{lead.title}</h4>
                                <button
                                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
                              <p className="text-xs text-gray-600 mb-3">
                                {lead.contact?.name}
                              </p>
                              <div className="flex justify-between items-center gap-2 text-xs">
                                {lead.status === 'CONVERTED' && (
                                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">
                                    🔒 LOCKED
                                  </span>
                                )}
                                {lead.status === 'NEW' ? (
                                  <>
                                    {lead.aiScore && (
                                      <span className="px-2 py-1 bg-purple-600 text-white rounded-md text-[10px] font-bold">
                                        AI {lead.aiScore}
                                      </span>
                                    )}
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-semibold ${lead.probability > 70 ? 'bg-green-100 text-green-700' :
                                      lead.probability > 30 ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-700'
                                      }`}>
                                      {lead.probability}%
                                    </span>
                                  </>
                                ) : lead.status !== 'CONVERTED' && (
                                  <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-600">
                                    {lead.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {getLeadsByStage(stage).length === 0 && (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        No leads
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleLeadAdded}
      />

      {/* Inquiry Detail Modal */}
      {showDetailModal && selectedInquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Inquiry Details</h2>
              <button
                onClick={() => {
                  setTempProbability(null);
                  setShowDetailModal(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Title and Status */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedInquiry.title}</h3>
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${selectedInquiry.status === 'NEW' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    selectedInquiry.status === 'CONTACTED' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      selectedInquiry.status === 'QUALIFIED' ? 'bg-green-50 text-green-700 border-green-200' :
                        selectedInquiry.status === 'UNQUALIFIED' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                          selectedInquiry.status === 'CONVERTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-red-50 text-red-700 border-red-200'
                    }`}>
                    {selectedInquiry.status}
                  </span>
                  {selectedInquiry.isOnboarded && selectedInquiry.onboardedCustomerCode && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
                      ✓ Customer: {selectedInquiry.onboardedCustomerCode}
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex">
                    <span className="w-24 text-gray-600 font-medium">Name:</span>
                    <span className="text-gray-900">{selectedInquiry.contact?.name || 'N/A'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-gray-600 font-medium">Email:</span>
                    <span className="text-gray-900">{selectedInquiry.contact?.email || 'N/A'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-24 text-gray-600 font-medium">Phone:</span>
                    <span className="text-gray-900">{selectedInquiry.contact?.phone || 'N/A'}</span>
                  </div>
                  {selectedInquiry.company && (
                    <div className="flex">
                      <span className="w-24 text-gray-600 font-medium">Company:</span>
                      <span className="text-gray-900">{selectedInquiry.company}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Information */}
              {selectedInquiry.productName && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-semibold text-gray-900 mb-3">Product Information</h4>
                  <div className="space-y-2">
                    <div className="flex">
                      <span className="w-32 text-gray-600 font-medium">Product:</span>
                      <span className="text-gray-900">{selectedInquiry.productName}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Scoring Insights - Only for NEW leads */}
              {selectedInquiry.aiScore && selectedInquiry.status === 'NEW' && (
                <div className="border rounded-lg p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-bold">AI</span>
                      Lead Score Analysis
                    </h4>
                    <span className="text-2xl font-bold text-purple-700">{selectedInquiry.aiScore}/100</span>
                  </div>

                  {/* Priority Badge */}
                  <div className="mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedInquiry.aiPriority === 'hot' ? 'bg-red-100 text-red-700' :
                      selectedInquiry.aiPriority === 'warm' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                      {selectedInquiry.aiPriority?.toUpperCase() || 'N/A'} PRIORITY
                    </span>
                    {selectedInquiry.aiConfidence && (
                      <span className="ml-2 text-xs text-gray-600">
                        {Math.round(selectedInquiry.aiConfidence * 100)}% confidence
                      </span>
                    )}
                  </div>

                  {/* AI Insights */}
                  {selectedInquiry.aiInsights && selectedInquiry.aiInsights.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Insights:</p>
                      {selectedInquiry.aiInsights.map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <span className="text-purple-600 mt-0.5">•</span>
                          <span className="text-gray-700 leading-relaxed">{insight}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Re-score Button */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        console.log('Rescoring inquiry:', selectedInquiry._id);
                        const response = await api.post(`/inquiries/${selectedInquiry._id}/rescore`);
                        console.log('Rescore response:', response.data);

                        if (response.data.success) {
                          // Update the selected inquiry with new scores
                          const updatedInquiry = {
                            ...selectedInquiry,
                            probability: response.data.data.probability,
                            aiScore: response.data.data.score,
                            aiPriority: response.data.data.priority.toLowerCase(),
                            aiInsights: response.data.data.insights,
                            aiConfidence: response.data.data.confidence
                          };
                          setSelectedInquiry(updatedInquiry);

                          // Refresh the leads list
                          await fetchLeads();

                          toast.success(`Re-scored! New score: ${response.data.data.score}/100 ✅`);
                        }
                      } catch (err) {
                        console.error('Failed to re-score lead:', err);
                        console.error('Error details:', err.response?.data);
                        const errorMsg = err.response?.data?.message || 'Failed to re-score lead. Please try again.';
                        toast.error(errorMsg);
                      }
                    }}
                    className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                  >
                    🔄 Re-calculate AI Score
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setTempProbability(null);
                    setShowDetailModal(false);
                  }}
                  className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    window.location.href = `/inquiries?edit=${selectedInquiry._id}`;
                  }}
                  className="flex-1 px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  Edit Inquiry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMStage;
