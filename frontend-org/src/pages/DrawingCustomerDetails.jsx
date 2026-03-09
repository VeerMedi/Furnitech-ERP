import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { drawingAPI } from '../services/api';
import {
    ArrowLeft, User, Phone, Mail, MapPin, Package,
    FileText, Upload, Send, CheckCircle, AlertCircle,
    X, File, Calendar, Loader2
} from 'lucide-react';
import Button from '../components/Button';

const DrawingCustomerDetails = () => {
    const { customerId } = useParams();
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [quotation, setQuotation] = useState(null);
    const [inquiry, setInquiry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [selectedSalesman, setSelectedSalesman] = useState('');
    const [autocadFiles, setAutocadFiles] = useState([]);
    const [autocadSalesman, setAutocadSalesman] = useState('');
    const [assignedSalesmanName, setAssignedSalesmanName] = useState('');

    // UI state
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    // Upload progress state
    const [uploadProgress, setUploadProgress] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    // Debug state
    const [debugLog, setDebugLog] = useState([]);

    useEffect(() => {
        fetchOrderDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerId]);

    useEffect(() => {
        if (selectedOrder?.quotation) {
            fetchQuotation(selectedOrder.quotation);
        }

        // Robust Inquiry Fetch Trigger
        if (selectedOrder?.customer) {
            setTimeout(() => {
                fetchInquiryForCustomer(selectedOrder.customer._id || selectedOrder.customer, selectedOrder.customer);
            }, 100);
        } else if (customerId) {
            fetchInquiryForCustomer(customerId);
        }
    }, [selectedOrder, customerId]);

    const addToLog = (msg) => {
        console.log(msg);
        setDebugLog(prev => [...prev.slice(-4), msg]); // Keep last 5 logs for UI (optional)
    };

    const fetchInquiryForCustomer = async (targetCustomerId, customerObj = null) => {
        try {
            const api = (await import('../services/api')).default;
            addToLog(`🔍 Initiating Deep Search for Customer...`);

            let candidateInquiry = null;

            // Strategy: Fetch ALL inquiries and filter + sort by date (Newest First)
            try {
                const resAll = await api.get('/inquiries', { params: { limit: 2000 } });
                const allInquiries = resAll.data.data || resAll.data || [];

                const normalize = (str) => String(str || '').toLowerCase().trim().replace(/[^a-z0-9@.]/g, '');

                const targetId = normalize(targetCustomerId);
                // Extract all possible customer identifiers
                const targetName = customerObj ? normalize(customerObj.firstName + ' ' + (customerObj.lastName || '')) : '';
                const targetPhone = customerObj ? normalize(customerObj.phone) : '';
                const targetEmail = customerObj ? normalize(customerObj.email) : '';

                // Filter potential matches
                const matches = allInquiries.filter(inq => {
                    // 1. Check Identifiers (Safest)
                    const inqPhone = normalize(inq.contactNumber || inq.phone || inq.mobile);
                    const inqEmail = normalize(inq.email);

                    if (targetPhone && inqPhone.includes(targetPhone)) return true; // Phone match
                    if (targetEmail && inqEmail === targetEmail) return true;       // Email match

                    // 2. Check IDs
                    const onboardId = normalize(inq.onboardedCustomer?._id || inq.onboardedCustomer);
                    const custId = normalize(inq.customerId || inq.customer?._id || inq.customer);
                    if (onboardId === targetId || custId === targetId) return true;

                    // 3. Check Names (Fuzzy)
                    const inqName = normalize(inq.customerName || inq.name || inq.clientName || inq.contactPerson);
                    if (targetName && inqName && (inqName.includes(targetName) || targetName.includes(inqName))) return true;

                    return false;
                });

                if (matches.length > 0) {
                    // SORT BY DATE DESCENDING (Newest First)
                    // This ensures we get the latest 'yub' inquiry, not the old 'dadas' one
                    matches.sort((a, b) => {
                        const dateA = new Date(a.inquiryDate || a.createdAt || 0);
                        const dateB = new Date(b.inquiryDate || b.createdAt || 0);
                        return dateB - dateA;
                    });

                    candidateInquiry = matches[0];
                    addToLog(`✅ Found ${matches.length} matches. Selected newest: ${candidateInquiry.inquiryDate}`);
                }

            } catch (err) {
                addToLog('Scan/Filter failed: ' + err.message);
            }

            // --- DEEP FETCH & SET ---
            if (candidateInquiry) {
                console.log('✅ Final Candidate:', candidateInquiry);
                try {
                    // Fetch single inquiry to guarantee full details (items array often incomplete in list view)
                    const fullRes = await api.get(`/inquiries/${candidateInquiry._id}`);
                    setInquiry(fullRes.data.data || fullRes.data);
                } catch (e) {
                    setInquiry(candidateInquiry);
                }
            } else {
                addToLog('❌ NO MATCH FOUND.');
            }
        } catch (error) {
            console.error('Fatal fetch error:', error);
        }
    };

    const fetchQuotation = async (quotationId) => {
        try {
            const api = (await import('../services/api')).default;
            const response = await api.get(`/quotations/${quotationId}`);
            const quoteData = response.data.data || response.data;
            setQuotation(quoteData);

            if (quoteData.inquiry) {
                try {
                    const inquiryRes = await api.get(`/inquiries/${quoteData.inquiry}`);
                    setInquiry(inquiryRes.data.data || inquiryRes.data);
                } catch (e) { /* ignore */ }
            }
        } catch (error) { console.error(error); }
    };

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            const response = await drawingAPI.getOrderDetailsForCustomer(customerId);
            const ordersData = response.data.data || [];
            setOrders(ordersData);
            if (ordersData.length > 0) {
                setSelectedOrder(ordersData[0]);

                const firstOrder = ordersData[0];
                let salesmanName = firstOrder.salesmanName || firstOrder.assignedTo?.name || firstOrder.customer?.assignedSalesman || '';
                if (salesmanName) {
                    setAssignedSalesmanName(salesmanName);
                    setSelectedSalesman(salesmanName);
                    setAutocadSalesman(salesmanName);
                }
            }
        } catch (error) {
            setError('Failed to load customer orders');
        } finally {
            setLoading(false);
        }
    };

    // Helper to determine what to show
    // PRIORITY: Inquiry > Quotation > Order
    const activeSource = (inquiry?.items && inquiry.items.length > 0) ? inquiry :
        (quotation?.items && quotation.items.length > 0) ? quotation :
            selectedOrder;

    const displayItems = activeSource?.items || [];
    let sourceType = activeSource === inquiry ? 'Inquiry' : activeSource === quotation ? 'Quotation' : 'Order';

    // File Handlers
    const handleFileSelect = (e) => {
        const newFiles = Array.from(e.target.files);
        console.log('📁 Files selected:', newFiles.length, 'files');
        setSelectedFiles(p => [...p, ...newFiles]);
        setUploadSuccess(false);
    };
    const removeFile = (i) => setSelectedFiles(p => p.filter((_, idx) => idx !== i));

    const handleAutocadFileSelect = (e) => {
        const newFiles = Array.from(e.target.files);
        console.log('📁 Files selected:', newFiles.length, 'files');
        console.log('📁 File names:', newFiles.map(f => f.name));
        setAutocadFiles(p => [...p, ...newFiles]);
        setUploadSuccess(false);
    };
    const removeAutocadFile = (i) => setAutocadFiles(p => p.filter((_, idx) => idx !== i));

    // Drag and Drop Handlers
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set to false if leaving the drop zone completely
        if (e.currentTarget === e.target) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        console.log('📁 Files dropped:', droppedFiles.length, 'files');
        console.log('📁 File names:', droppedFiles.map(f => f.name));

        setAutocadFiles(p => [...p, ...droppedFiles]);
        setUploadSuccess(false);
    };

    const handleUpload = async (isAutocad = false) => {
        const files = isAutocad ? autocadFiles : selectedFiles;
        // Use assigned salesman as fallback if specific selection is empty
        const salesman = isAutocad
            ? (autocadSalesman || assignedSalesmanName)
            : (selectedSalesman || assignedSalesmanName);

        if (files.length === 0) {
            setError('Please select files to upload');
            return;
        }

        if (!salesman) {
            setError('Salesman assignment is required');
            return;
        }

        try {
            setUploading(true);
            setIsUploading(true);
            setError('');

            // Initialize progress for each file
            const initialProgress = files.map((file, index) => ({
                id: index,
                name: file.name,
                size: file.size,
                status: 'pending', // pending, uploading, success, error
                progress: 0
            }));
            setUploadProgress(initialProgress);

            // Simulate file-by-file upload progress
            for (let i = 0; i < files.length; i++) {
                setUploadProgress(prev => prev.map((item, idx) =>
                    idx === i ? { ...item, status: 'uploading' } : item
                ));

                // Simulate progress animation
                const progressInterval = setInterval(() => {
                    setUploadProgress(prev => prev.map((item, idx) =>
                        idx === i && item.progress < 90
                            ? { ...item, progress: item.progress + 10 }
                            : item
                    ));
                }, 100);

                // Small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 300));
                clearInterval(progressInterval);
            }

            const formData = new FormData();
            files.forEach(f => formData.append('files', f));
            formData.append('customerId', customerId);
            formData.append('orderId', selectedOrder?._id || '');
            formData.append('salesmanName', salesman);
            if (isAutocad) formData.append('fileType', 'autocad');

            await drawingAPI.uploadFiles(formData);

            // Mark all as success
            setUploadProgress(prev => prev.map(item => ({
                ...item,
                status: 'success',
                progress: 100
            })));

            setUploadSuccess(true);

            // Clear files and progress after delay
            setTimeout(() => {
                if (isAutocad) {
                    setAutocadFiles([]);
                    setAutocadSalesman(assignedSalesmanName);
                } else {
                    setSelectedFiles([]);
                    setSelectedSalesman(assignedSalesmanName);
                }
                setUploadProgress([]);
                setUploadSuccess(false);
            }, 3000);

        } catch (error) {
            // Mark all as error
            setUploadProgress(prev => prev.map(item => ({
                ...item,
                status: 'error'
            })));
            setError(error.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
            setTimeout(() => setIsUploading(false), 3000);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    if (loading) return <div className="flex justify-center h-screen items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div></div>;

    if (!selectedOrder) return (
        <div className="min-h-screen bg-gray-50 p-6">
            <Button onClick={() => navigate('/drawings')} className="mb-4 bg-red-700 hover:bg-red-800"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
            <div className="bg-white rounded-2xl p-12 shadow-lg border text-center"><h3 className="text-lg font-semibold">No orders found</h3></div>
        </div>
    );

    const customer = selectedOrder.customer;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mb-8">
                <Button onClick={() => navigate('/drawings')} className="mb-4 bg-red-700 hover:bg-red-800"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Customers</Button>
                <div className="flex items-center gap-3">
                    <div className="bg-red-700 p-3 rounded-lg"><FileText className="w-8 h-8 text-white" /></div>
                    <div><h1 className="text-3xl font-bold text-gray-900">{customer?.firstName} {customer?.lastName}</h1><p className="text-gray-600">Drawing & File Management</p></div>
                </div>
            </div>

            {uploadSuccess && <div className="mb-6 bg-green-50 border border-green-200 p-4 rounded-lg flex items-center gap-3"><CheckCircle className="w-6 h-6 text-green-600" /><div><h3 className="font-semibold text-green-900">Success!</h3><p className="text-sm text-green-700">Files assigned to salesman.</p></div></div>}
            {error && <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-lg flex items-center gap-3"><AlertCircle className="w-6 h-6 text-red-600" /><div><h3 className="font-semibold text-red-900">Error</h3><p className="text-sm text-red-700">{error}</p></div></div>}

            {/* Upload Progress Modal */}
            {isUploading && uploadProgress.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                            <div className="bg-blue-100 p-2 rounded-lg">
                                <Upload className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900">Uploading Files</h3>
                                <p className="text-sm text-gray-600">
                                    {uploadProgress.filter(f => f.status === 'success').length} of {uploadProgress.length} completed
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {uploadProgress.map((file, index) => (
                                <div key={file.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="flex-shrink-0">
                                            {file.status === 'pending' && (
                                                <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                                            )}
                                            {file.status === 'uploading' && (
                                                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                            )}
                                            {file.status === 'success' && (
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                            )}
                                            {file.status === 'error' && (
                                                <AlertCircle className="w-5 h-5 text-red-600" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                                        </div>
                                        <div className="text-xs font-semibold text-gray-600">
                                            {file.progress}%
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${file.status === 'success' ? 'bg-green-500' :
                                                    file.status === 'error' ? 'bg-red-500' :
                                                        file.status === 'uploading' ? 'bg-blue-500' :
                                                            'bg-gray-300'
                                                }`}
                                            style={{ width: `${file.progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {uploadProgress.every(f => f.status === 'success') && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-semibold">All files uploaded successfully!</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Customer Info Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Customer Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {customer?.phone && <div className="flex items-center gap-3"><div className="bg-blue-50 p-2 rounded-lg"><Phone className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-gray-500">Phone</p><p className="font-semibold">{customer.phone}</p></div></div>}
                            {customer?.email && <div className="flex items-center gap-3"><div className="bg-green-50 p-2 rounded-lg"><Mail className="w-5 h-5 text-green-600" /></div><div><p className="text-xs text-gray-500">Email</p><p className="font-semibold break-all">{customer.email}</p></div></div>}
                            {customer?.address && <div className="flex items-center gap-3 md:col-span-2"><div className="bg-purple-50 p-2 rounded-lg"><MapPin className="w-5 h-5 text-purple-600" /></div><div><p className="text-xs text-gray-500">Address</p><p className="font-semibold">{typeof customer.address === 'object' ? `${customer.address.street || ''} ${customer.address.city || ''}` : customer.address}</p></div></div>}
                        </div>
                    </div>

                    {/* Order Selection */}
                    {orders.length > 1 && (
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Order</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {orders.map(order => (
                                    <div key={order._id} onClick={() => setSelectedOrder(order)} className={`p-4 rounded-lg border-2 cursor-pointer ${selectedOrder?._id === order._id ? 'border-red-500 bg-red-50' : 'border-gray-100 hover:border-red-300'}`}>
                                        <p className="font-semibold">{order.orderNumber}</p><p className="text-sm text-gray-500">{new Date(order.orderDate).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Product Details - PRIORITY ORDER: Inquiry -> Quotation -> Order */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Package className="w-6 h-6 text-red-700" /> Product Details</h2>
                            <div className="flex flex-col items-end">
                                <span className={`text-xs px-2 py-1 rounded font-bold ${sourceType === 'Inquiry' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    Source: {sourceType}
                                </span>
                                {activeSource?.inquiryDate && activeSource !== selectedOrder && (
                                    <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> {new Date(activeSource.inquiryDate).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {displayItems.length > 0 ? (
                                displayItems.map((item, index) => {
                                    // Robust Name Extraction
                                    const itemName = item.description || item.productName || item.name || 'Product';

                                    // Robust Detail Extraction
                                    const itemDetails = item.meta?.details || item.details || item.notes || '';

                                    return (
                                        <div key={index} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-start gap-4">
                                                <div className="bg-red-700 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">{index + 1}</div>
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{itemName}</h3>
                                                    <div className="mb-3"><span className="text-sm font-semibold text-gray-600">Qty:</span> <span className="font-bold text-gray-900 ml-1">{item.quantity || 1} {item.unit || 'Nos'}</span></div>

                                                    {itemDetails ? (
                                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Specifications</p>
                                                            <p className="text-gray-800 whitespace-pre-wrap">{itemDetails}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-400 italic mt-2">No specifications provided in {sourceType}.</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500">No items found in Inquiry, Quotation, or Order.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Upload */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Upload All Files</h2>
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${isDragging
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-red-500'
                                }`}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <label className="cursor-pointer w-full h-full flex flex-col items-center">
                                <Upload className={`w-10 h-10 mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                                <span className={`text-sm font-medium block mb-1 ${isDragging ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {isDragging ? 'Drop files here!' : 'Click or Drag & Drop files here'}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {isDragging ? 'Release to add files' : 'Select multiple files at once'}
                                </span>
                                <input
                                    type="file"
                                    multiple
                                    accept=".dwg,.pdf,.dxf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={handleAutocadFileSelect}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        {autocadFiles.length > 0 && (
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Selected Files</span>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">
                                        {autocadFiles.length} file{autocadFiles.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {autocadFiles.map((f, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm bg-red-50 p-3 rounded text-red-800 border border-red-100">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium truncate">{f.name}</div>
                                                <div className="text-xs text-red-600">{formatFileSize(f.size)}</div>
                                            </div>
                                            <X className="w-4 h-4 cursor-pointer ml-2 flex-shrink-0 hover:text-red-900" onClick={() => removeAutocadFile(i)} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign to Salesman</label>
                            <div className="w-full px-3 py-2 bg-gray-100 rounded text-gray-900 font-medium">{assignedSalesmanName || 'None'}</div>
                        </div>
                        <Button
                            onClick={() => handleUpload(true)}
                            disabled={uploading || !autocadFiles.length}
                            className="w-full bg-red-700 hover:bg-red-800 text-white flex justify-center gap-2"
                        >
                            {uploading ? (
                                <>Uploading {autocadFiles.length} file{autocadFiles.length > 1 ? 's' : ''}...</>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send {autocadFiles.length} File{autocadFiles.length > 1 ? 's' : ''}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DrawingCustomerDetails;
