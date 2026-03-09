import React, { useState, useEffect } from 'react';
import { Pencil, X, Search, Plus, Calendar, User, Phone, Mail, MapPin, Package, MessageSquare, AlertCircle, UserCheck, Trash, Download, Loader } from 'lucide-react';
import { inquiryAPI, productAPI } from '../services/api';
import { useEditPermission } from '../components/ProtectedAction';
import { toast } from '../hooks/useToast';
import { confirm } from '../hooks/useConfirm';
import axios from 'axios';
// hii 
const Inquiries = () => {
  const canEditInquiries = useEditPermission('inquiries');
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingInquiry, setEditingInquiry] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [onboarding, setOnboarding] = useState(false);
  const [products, setProducts] = useState([]);
  const [fetchingFromSheet, setFetchingFromSheet] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [creatingInquiries, setCreatingInquiries] = useState(false);
  const [selectedInquiries, setSelectedInquiries] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Multi-sheet support state
  const [sheetSources, setSheetSources] = useState({});
  const [selectedSource, setSelectedSource] = useState('sheet1');
  const [showSourceModal, setShowSourceModal] = useState(false);

  // New states for Tab Selection Workflow
  const [fetchStep, setFetchStep] = useState(1); // 1: Source, 2: Tabs, 3: Preview
  const [availableTabs, setAvailableTabs] = useState([]);
  const [selectedTabs, setSelectedTabs] = useState([]);
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [fetchStats, setFetchStats] = useState(null);
  const [sheetError, setSheetError] = useState(null);


  const [formData, setFormData] = useState({
    customerName: '',
    companyName: '',
    customerId: '',
    contact: '',
    email: '',
    address: '',
    enquiryDate: new Date().toISOString().split('T')[0],
    enquiryTime: new Date().toTimeString().split(' ')[0].slice(0, 5),
    productName: '',
    status: 'new',
    priority: 'medium',
    leadPlatform: '',
    leadStatus: 'NEW',
    probability: 20,
    message: '',
    items: [],
  });

  // Layout plan upload state
  const [layoutPlanFile, setLayoutPlanFile] = useState(null);
  const [uploadingLayout, setUploadingLayout] = useState(false);

  const [currentItem, setCurrentItem] = useState({
    productName: '',
    productDetails: '',
    quantity: 1
  });

  // Product Selection Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');

  const CATEGORY_MAPPING = {
    'NON_SHARING_WORKSTATION': 'Non-Sharing Workstation',
    'SHARING_WORKSTATION': 'Sharing Workstation',
    'NON_SHARING_PARTITION': 'Non-Sharing Partition',
    'SHARING_PARTITION': 'Sharing Partition',
    'FOLDING_TABLE': 'Folding Table',
    'CAFE_TABLE': 'Café Table',
    'CONFERENCE_TABLE': 'Conference Table',
    'CABIN_TABLE': 'Cabin Table',
    'STORAGE': 'Storage',
    'ACCESSORIES': 'Accessories',
    // Fallbacks for older data
    'KITCHEN_CABINET': 'Kitchen Cabinet',
    'WARDROBE': 'Wardrobe',
    'TV_UNIT': 'TV Unit',
    'STUDY_TABLE': 'Study Table',
    'BED': 'Bed',
    'DINING_TABLE': 'Dining Table',
    'SOFA': 'Sofa',
    'OFFICE_FURNITURE': 'Office Furniture',
    'MODULAR_KITCHEN': 'Modular Kitchen',
    'CUSTOM': 'Custom',
  };

  // Group products by category
  const getGroupedProducts = () => {
    const grouped = {};
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(productSearchQuery.toLowerCase()))
    );

    filtered.forEach(product => {
      const catKey = product.category || 'Uncategorized';
      if (!grouped[catKey]) {
        grouped[catKey] = [];
      }
      grouped[catKey].push(product);
    });
    return grouped;
  };

  useEffect(() => {
    loadInquiries();
    loadProducts();
    loadSheetConfig();
  }, [filterStatus]); // Reload when filter status changes

  // 🔔 Auto-refresh when quotation is approved (cross-tab communication)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'inquiryNeedsRefresh') {
        console.log('📢 Received inquiry refresh event - reloading inquiries...');
        loadInquiries();
      }
    };

    // Listen for storage changes from other tabs
    window.addEventListener('storage', handleStorageChange);

    // Also check localStorage periodically for same-tab updates
    const intervalId = setInterval(() => {
      const lastRefresh = localStorage.getItem('inquiryNeedsRefresh');
      if (lastRefresh) {
        const timeDiff = Date.now() - parseInt(lastRefresh);
        // Only trigger if refresh event is within last 5 seconds
        if (timeDiff < 5000) {
          console.log('📢 Detected inquiry refresh event - reloading inquiries...');
          loadInquiries();
          // Clear the flag
          localStorage.removeItem('inquiryNeedsRefresh');
        }
      }
    }, 2000); // Check every 2 seconds

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, []);

  // Check URL parameters to auto-open edit modal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');

    if (editId && inquiries.length > 0) {
      const inquiryToEdit = inquiries.find(inq => inq._id === editId);
      if (inquiryToEdit) {
        handleEdit(inquiryToEdit);
        // Clean up URL
        window.history.replaceState({}, '', '/inquiries');
      }
    }
  }, [inquiries]);

  const loadInquiries = async () => {
    try {
      setLoading(true);

      // Load from database with history filter
      const params = {};
      if (filterStatus === 'history') {
        params.showHistory = 'true'; // Show onboarded inquiries
      }

      const response = await inquiryAPI.getAll(params);
      console.log('📥 LOAD INQUIRIES - API response:', response.data);

      // Handle both response formats: response.data (array) or response.data.data (wrapped)
      const inquiriesData = Array.isArray(response.data) ? response.data : (response.data?.data || []);

      console.log('📊 Loaded inquiries count:', inquiriesData.length);

      // Debug first inquiry to see data structure
      if (inquiriesData.length > 0) {
        console.log('🔍 Sample inquiry data:');
        console.log('   👤 Customer Name:', inquiriesData[0].customerName);
        console.log('   📋 Company Name:', inquiriesData[0].companyName);
        console.log('   🆔 Customer ID:', inquiriesData[0].customerId);
        console.log('   Full data:', inquiriesData[0]);
      }

      setInquiries(inquiriesData);
    } catch (error) {
      console.error('❌ Error loading inquiries from database:', error);
      toast.error('Failed to load inquiries. Please check your connection.');
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productAPI.getAll();
      const productsData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setProducts(productsData);
      console.log('Loaded products:', productsData.length);
    } catch (error) {
      console.error('Error loading products:', error);
      // Don't show alert, just log the error
    }
  };

  const loadSheetConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');
      console.log('🔧 Loading sheet config...');
      console.log('   Token:', token ? 'Present' : 'Missing');
      console.log('   TenantId:', tenantId);

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/google-sheets/config`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenantId,
          },
        }
      );

      console.log('✅ Sheet config response:', response.data);

      if (response.data.success && response.data.sources) {
        console.log('📊 Setting sheet sources:', Object.keys(response.data.sources));
        setSheetSources(response.data.sources);
        if (response.data.defaultSource) {
          setSelectedSource(response.data.defaultSource);
        }
      } else {
        console.warn('⚠️ No sources in response:', response.data);
      }
    } catch (error) {
      console.error('❌ Error loading sheet config:', error);
      console.error('   Error response:', error.response?.data);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({ ...prev, [name]: value }));
  };

  const handleAddItem = () => {
    if (!currentItem.productName.trim()) {
      toast.warning('Please enter a product name');
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...currentItem }]
    }));
    setCurrentItem({
      productName: '',
      productDetails: '',
      quantity: 1
    });
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = filteredInquiries.map(i => i._id);
      setSelectedInquiries(allIds);
    } else {
      setSelectedInquiries([]);
    }
  };

  const handleSelectInquiry = (id) => {
    if (selectedInquiries.includes(id)) {
      setSelectedInquiries(selectedInquiries.filter(i => i !== id));
    } else {
      setSelectedInquiries([...selectedInquiries, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInquiries.length === 0) return;

    const confirmed = await confirm(
      `Are you sure you want to delete ${selectedInquiries.length} inquiries? This action cannot be undone.`,
      'Bulk Delete Inquiries'
    );
    if (!confirmed) return;

    try {
      setBulkActionLoading(true);
      // Execute deletions in parallel
      await Promise.all(selectedInquiries.map(id => inquiryAPI.delete(id)));

      toast.success(`Successfully deleted ${selectedInquiries.length} inquiries! 🗑️`);
      setSelectedInquiries([]);
      loadInquiries();
    } catch (error) {
      console.error('Error performing bulk delete:', error);
      toast.error('Failed to delete some inquiries. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkOnboard = async () => {
    if (selectedInquiries.length === 0) return;

    const confirmed = await confirm(
      `Are you sure you want to onboard ${selectedInquiries.length} inquiries?`,
      'Bulk Onboard Inquiries'
    );
    if (!confirmed) return;

    try {
      setBulkActionLoading(true);
      let successCount = 0;
      let failCount = 0;

      // Process sequentially to avoid overwhelming the server/DB
      for (const id of selectedInquiries) {
        try {
          // Find the inquiry to check validation before sending
          const inquiry = inquiries.find(i => i._id === id);
          if (!inquiry) {
            failCount++;
            continue;
          }

          // Simple validation check (mirrors single onboard check)
          const hasValidProducts = inquiry.items && inquiry.items.length > 0 &&
            inquiry.items.every(item =>
              item.description?.trim() &&
              item.quantity
            );

          if (!hasValidProducts) {
            // Skipping invalid inquiry - could log this or store ID to report later
            console.warn(`Skipping inquiry ${id} due to missing product details`);
            failCount++;
            continue;
          }

          await inquiryAPI.onboard(id);
          successCount++;
        } catch (err) {
          console.error(`Failed to onboard inquiry ${id}`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully onboarded ${successCount} clients! 🎉`);
      }
      if (failCount > 0) {
        toast.warning(`Failed to onboard ${failCount} clients. Check product details.`);
      }

      setSelectedInquiries([]);
      loadInquiries();
    } catch (error) {
      console.error('Error in bulk onboard:', error);
      toast.error('An unexpected error occurred during bulk onboarding.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Map items to backend format
      const payload = {
        ...formData,
        items: formData.items.map(item => ({
          description: item.productName,
          quantity: item.quantity,
          meta: { details: item.productDetails }
        }))
      };

      console.log('📤 SUBMITTING INQUIRY - Payload:', payload);
      console.log('   📋 Company Name:', payload.companyName);
      console.log('   🆔 Customer ID:', payload.customerId);
      console.log('   👤 Customer Name:', payload.customerName);

      if (editingInquiry) {
        // Update existing inquiry in database
        console.log('🔄 Updating inquiry with ID:', editingInquiry._id);
        const response = await inquiryAPI.update(editingInquiry._id, payload);
        console.log('✅ Update response:', response.data);
        toast.success('Inquiry updated successfully! ✅');
      } else {
        // Create new inquiry in database
        console.log('➕ Creating new inquiry...');
        const response = await inquiryAPI.create(payload);
        console.log('✅ Create response:', response.data);
        console.log('   📋 Returned Company Name:', response.data?.data?.companyName);
        console.log('   🆔 Returned Customer ID:', response.data?.data?.customerId);
        toast.success('Inquiry created successfully! ✅');
      }

      // Upload layout plan PDF if selected
      if (layoutPlanFile && (editingInquiry || response)) {
        const inquiryId = editingInquiry?._id || response?.data?.data?._id;
        if (inquiryId) {
          try {
            setUploadingLayout(true);
            const formData = new FormData();
            formData.append('file', layoutPlanFile);

            const uploadResponse = await inquiryAPI.uploadLayoutPlan(inquiryId, formData);
            console.log('✅ Layout plan uploaded:', uploadResponse.data);
            toast.success('Layout plan uploaded successfully! 📄');
          } catch (uploadError) {
            console.error('❌ Error uploading layout plan:', uploadError);
            toast.error('Failed to upload layout plan. Please try again.');
          } finally {
            setUploadingLayout(false);
          }
        }
      }

      handleCloseModal();
      // Reload inquiries from database
      loadInquiries();
    } catch (error) {
      console.error('❌ Error saving inquiry:', error);
      console.error('   Error response:', error.response?.data);
      toast.error('Failed to save inquiry. Please try again.');
    }
  };

  const handleEdit = (inquiry) => {
    console.log('🔍 Editing inquiry:', inquiry);
    console.log('📝 Inquiry meta:', inquiry.meta);
    console.log('🎯 Product Demand:', inquiry.meta?.productDemand);
    console.log('🎯 Demand Quantity:', inquiry.meta?.demandQuantity);
    console.log('📦 Items array:', inquiry.items);

    setEditingInquiry(inquiry);

    const formDataToSet = {
      customerName: inquiry.customerName,
      companyName: inquiry.companyName || '',
      customerId: inquiry.customerId || '',
      contact: inquiry.contact,
      email: inquiry.email,
      address: inquiry.address,
      enquiryDate: inquiry.enquiryDate,
      enquiryTime: inquiry.enquiryTime,
      status: inquiry.status,
      priority: inquiry.priority,
      leadPlatform: inquiry.leadPlatform || 'Website',
      leadStatus: inquiry.leadStatus || 'NEW',
      probability: inquiry.probability || 20,
      message: inquiry.message,
      items: inquiry.items && inquiry.items.length > 0
        ? inquiry.items.map(item => ({
          productName: item.description,
          productDetails: item.meta?.details || '',
          quantity: item.quantity || 1
        }))
        : (inquiry.productName ? [{
          productName: inquiry.productName,
          productDetails: inquiry.productDetails,
          quantity: 1
        }] : []),
    };

    console.log('✅ Setting formData:', formDataToSet);

    setFormData(formDataToSet);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm(
      'Are you sure you want to delete this inquiry? This action cannot be undone.',
      'Delete Inquiry'
    );
    if (!confirmed) return;

    try {
      await inquiryAPI.delete(id);
      toast.success('Inquiry deleted successfully! ✅');
      // Reload inquiries from database
      loadInquiries();
    } catch (error) {
      console.error('Error deleting inquiry:', error);
      toast.error('Failed to delete inquiry. Please try again.');
    }
  };

  const handleFetchFromGoogleSheets = () => {
    setShowSourceModal(true);
  };

  // WORKFLOW STEP 2: Fetch available tabs
  const handleFetchTabs = async () => {
    setLoadingTabs(true);
    setSheetError(null);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/google-sheets/tabs?source=${selectedSource}`);
      if (response.data.success) {
        setAvailableTabs(response.data.tabs);
        setSelectedTabs([]); // Reset selection
        setFetchStep(2); // Move to Step 2
      } else {
        setSheetError('Failed to fetch tabs.');
        toast.error('Could not fetch tabs from sheet.');
      }
    } catch (error) {
      console.error('Error fetching tabs:', error);
      setSheetError('Failed to fetch tabs. Please check connection.');
      toast.error('Error connecting to Google Sheets.');
    } finally {
      setLoadingTabs(false);
    }
  };

  // WORKFLOW STEP 3: Fetch Preview from Selected Tabs
  const handleFetchPreview = async () => {
    if (selectedTabs.length === 0) {
      setSheetError('Please select at least one tab.');
      return;
    }

    setFetchingFromSheet(true);
    setSheetError(null);
    setFetchProgress({ status: 'fetching', message: 'Scanning selected tabs...' });

    try {
      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');

      // Use POST to send selectedTabs
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/google-sheets/preview-inquiries`,
        {
          source: selectedSource,
          tabs: selectedTabs
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenantId,
          },
        }
      );

      if (response.data.success) {
        setPreviewData(response.data.data);
        setShowSourceModal(false);
        setShowPreviewModal(true);
        setFetchStep(1); // Reset for next time
        setFetchProgress(null);
        toast.success(`Found ${response.data.count} inquiries! 📊`);
      } else {
        setSheetError(response.data.message || 'Failed to fetch preview');
        toast.error(response.data.message);
      }
    } catch (err) {
      console.error('Error fetching preview:', err);
      setSheetError(err.response?.data?.message || 'Failed to connect to Google Sheets');
      setFetchProgress({ status: 'error', message: 'Failed to fetch' });
      toast.error('Failed to fetch data.');
    } finally {
      setFetchingFromSheet(false);
    }
  };

  const handleTabToggle = (tabName) => {
    if (selectedTabs.includes(tabName)) {
      setSelectedTabs(selectedTabs.filter(t => t !== tabName));
    } else {
      setSelectedTabs([...selectedTabs, tabName]);
    }
  };

  // Create inquiries from preview (Step 2)
  const handleCreateInquiries = async () => {
    const confirmed = await confirm(
      `This will create ${previewData.length} inquiries in the database. Continue?`,
      'Create Inquiries'
    );
    if (!confirmed) return;

    try {
      setCreatingInquiries(true);

      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/google-sheets/fetch-inquiries`,
        {
          source: selectedSource,
          tabs: selectedTabs // Pass selected tabs for final import
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenantId,
          },
        }
      );

      if (response.data.success) {
        const { stats } = response.data;
        toast.success(`Created ${stats.created} inquiries! (Skipped: ${stats.skipped}, Failed: ${stats.failed}) 🎉`);

        setShowPreviewModal(false);
        setPreviewData([]);
        loadInquiries();
      } else {
        throw new Error(response.data.message || 'Failed to create inquiries');
      }
    } catch (error) {
      console.error('Error creating inquiries:', error);
      toast.error('Failed to create inquiries. Please try again.');
    } finally {
      setCreatingInquiries(false);
    }
  };

  // Delete last 24h imported inquiries
  const handleDeleteLast24hImports = async () => {
    const confirmed = await confirm(
      'This will permanently delete all inquiries imported from Google Sheets in the last 24 hours. This action cannot be undone. Continue?',
      'Delete Last 24h Imports'
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId');

      const response = await axios.delete(
        `${import.meta.env.VITE_API_URL}/google-sheets/delete-last-24h`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenantId,
          },
        }
      );

      if (response.data.success) {
        toast.success(`Deleted ${response.data.deletedCount} inquiries from last 24 hours! 🗑️`);
        loadInquiries();
      } else {
        throw new Error(response.data.message || 'Failed to delete inquiries');
      }
    } catch (error) {
      console.error('Error deleting last imports:', error);
      toast.error(error.response?.data?.message || 'Failed to delete inquiries.');
    }
  };

  const handleOnboardClient = async () => {
    if (!editingInquiry) return;

    // Validate that at least Product Name is filled
    const hasValidProducts = formData.items && formData.items.length > 0 &&
      formData.items.every(item =>
        item.productName?.trim()
      );

    if (!hasValidProducts) {
      toast.warning('Please add at least one product with a Product Name before onboarding the client.');
      return;
    }

    if (!confirm('Are you sure you want to onboard this client? This will convert the inquiry into a customer and remove it from inquiries.')) return;

    try {
      setOnboarding(true);
      const response = await inquiryAPI.onboard(editingInquiry._id);
      console.log('Onboard response:', response.data);

      toast.success(`Client onboarded successfully! 🎉 Customer Code: ${response.data.data.customerCode}`);

      // Close modal and reload inquiries
      handleCloseModal();
      loadInquiries();

      // Redirect to customers page
      window.location.href = '/customers';
    } catch (error) {
      console.error('Error onboarding client:', error);
      toast.error(`Failed to onboard client: ${error.response?.data?.message || error.message}`);
    } finally {
      setOnboarding(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingInquiry(null);
    setOnboarding(false);
    setFormData({
      customerName: '',
      companyName: '',
      customerId: '',
      contact: '',
      email: '',
      address: '',
      enquiryDate: new Date().toISOString().split('T')[0],
      enquiryTime: new Date().toTimeString().split(' ')[0].slice(0, 5),
      status: 'new',
      priority: 'medium',
      leadPlatform: '',
      leadStatus: 'NEW',
      probability: 20,
      message: '',
      items: [],
      productDemand: '',
      demandQuantity: '',
    });
    setCurrentItem({
      productName: '',
      productDetails: '',
      quantity: 1
    });
  };



  const getStatusBadge = (status) => {
    const colors = {
      'new': 'bg-blue-50 text-blue-700 border-blue-200',
      'in-progress': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'resolved': 'bg-green-50 text-green-700 border-green-200'
    };
    const labels = {
      'new': 'New',
      'in-progress': 'In Progress',
      'resolved': 'Resolved'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      'low': 'bg-gray-50 text-gray-700 border-gray-200',
      'medium': 'bg-orange-50 text-orange-700 border-orange-200',
      'high': 'bg-red-50 text-red-700 border-red-200'
    };
    const labels = {
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  const getLeadStatusBadge = (leadStatus) => {
    const colors = {
      'NEW': 'bg-blue-50 text-blue-700 border-blue-200',
      'CONTACTED': 'bg-purple-50 text-purple-700 border-purple-200',
      'QUALIFIED': 'bg-green-50 text-green-700 border-green-200',
      'UNQUALIFIED': 'bg-gray-50 text-gray-700 border-gray-200',
      'CONVERTED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'LOST': 'bg-red-50 text-red-700 border-red-200'
    };
    const labels = {
      'NEW': 'New',
      'CONTACTED': 'Contacted',
      'QUALIFIED': 'Qualified',
      'UNQUALIFIED': 'Unqualified',
      'CONVERTED': 'Converted',
      'LOST': 'Lost'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[leadStatus]}`}>
        {labels[leadStatus]}
      </span>
    );
  };

  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesSearch =
      inquiry.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.contact.includes(searchTerm) ||
      inquiry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.productName.toLowerCase().includes(searchTerm.toLowerCase());

    // For history view, don't filter by status or priority
    if (filterStatus === 'history') {
      return matchesSearch;
    }

    const matchesStatus = filterStatus === 'all' || inquiry.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || inquiry.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: inquiries.length,
    new: inquiries.filter(i => i.status === 'new').length,
    inProgress: inquiries.filter(i => i.status === 'in-progress').length,
    resolved: inquiries.filter(i => i.status === 'resolved').length,
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inquiries</h1>
            <p className="text-gray-600 mt-1">Manage customer inquiries and requests</p>
          </div>
          <div className="flex gap-3">
            {canEditInquiries && (
              <>
                <button
                  onClick={handleDeleteLast24hImports}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                  title="Delete inquiries imported in last 24 hours"
                >
                  <Trash className="w-5 h-5" />
                  Delete Last 24h
                </button>
                <button
                  onClick={handleFetchFromGoogleSheets}
                  disabled={fetchingFromSheet}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  {fetchingFromSheet ? 'Fetching...' : 'Fetch from Sheet'}
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  New Inquiry
                </button>
              </>
            )}
          </div>
        </div>


        {/* Bulk Actions Toolbar */}
        {selectedInquiries.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900">{selectedInquiries.length} Selected</span>
              <button
                onClick={() => setSelectedInquiries([])}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear Selection
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBulkOnboard}
                disabled={bulkActionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {bulkActionLoading ? <Loader className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                Bulk Onboard
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {bulkActionLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Trash className="w-4 h-4" />}
                Bulk Delete
              </button>
            </div>
          </div>
        )}

        {/* Fetch Progress Modal */}
        {fetchProgress && (
          <div className="mb-6 bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              {fetchProgress.status === 'fetching' && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              )}
              {fetchProgress.status === 'success' && (
                <div className="text-green-600 text-2xl">✅</div>
              )}
              {fetchProgress.status === 'error' && (
                <div className="text-red-600 text-2xl">❌</div>
              )}
              <p className="text-gray-900 font-medium">{fetchProgress.message}</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Inquiries</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-400">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">New</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.new}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-400 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">In Progress</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.inProgress}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-yellow-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Resolved</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.resolved}</p>
              </div>
              <Package className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by customer, contact, email, product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="history">History (Onboarded)</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {/* Inquiries Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={filteredInquiries.length > 0 && selectedInquiries.length === filteredInquiries.length}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr. No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInquiries.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="px-6 py-8 text-center text-gray-500">
                      No inquiries found
                    </td>
                  </tr>
                ) : (
                  filteredInquiries.map((inquiry, index) => (
                    <tr key={inquiry._id} className={`hover:bg-gray-50 ${selectedInquiries.includes(inquiry._id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedInquiries.includes(inquiry._id)}
                          onChange={() => handleSelectInquiry(inquiry._id)}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <div>{inquiry.enquiryDate}</div>
                            <div className="text-xs text-gray-500">{inquiry.enquiryTime}</div>
                            {/* Show onboarded date if viewing history */}
                            {filterStatus === 'history' && inquiry.isOnboarded && inquiry.onboardedAt && (
                              <div className="text-xs text-green-600 font-medium mt-1">
                                ✓ Onboarded: {new Date(inquiry.onboardedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{inquiry.customerId || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{inquiry.companyName || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{inquiry.customerName}</div>
                            <div className="text-xs text-gray-500">{inquiry.email}</div>
                            {/* Show customer code if onboarded */}
                            {filterStatus === 'history' && inquiry.onboardedCustomerCode && (
                              <div className="text-xs text-green-600 font-medium mt-1">
                                Customer: {inquiry.onboardedCustomerCode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {inquiry.contact}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {inquiry.items && inquiry.items.length > 0
                            ? inquiry.items[0].description
                            : inquiry.productName}
                          {inquiry.items && inquiry.items.length > 1 && (
                            <span className="text-xs text-blue-600 ml-1 font-normal">+{inquiry.items.length - 1} more</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">
                          {inquiry.items && inquiry.items.length > 0
                            ? inquiry.items[0].meta?.details
                            : inquiry.productDetails}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                          {inquiry.leadPlatform || 'Website'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getLeadStatusBadge(inquiry.leadStatus || 'NEW')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(inquiry.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPriorityBadge(inquiry.priority || 'medium')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {canEditInquiries && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(inquiry)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {/* Only show Onboard Client button if inquiry is not already onboarded */}
                            {!inquiry.isOnboarded && (
                              <button
                                onClick={async () => {
                                  // Validate that Product Name, Quantity, and Product Details are filled
                                  const hasValidProducts = inquiry.items && inquiry.items.length > 0 &&
                                    inquiry.items.every(item =>
                                      item.description?.trim() &&
                                      item.quantity &&
                                      item.meta?.details?.trim()
                                    );

                                  if (!hasValidProducts) {
                                    toast.warning('Please fill Product Name, Quantity, and Product Details for all products before onboarding the client.');
                                    return;
                                  }

                                  if (!confirm('Are you sure you want to onboard this client? This will convert the inquiry into a customer and remove it from inquiries.')) return;

                                  try {
                                    setOnboarding(true);
                                    const response = await inquiryAPI.onboard(inquiry._id);
                                    console.log('Onboard response:', response.data);

                                    toast.success(`Client onboarded successfully! 🎉 Customer Code: ${response.data.data.customerCode}`);

                                    // Reload inquiries
                                    loadInquiries();

                                    // Redirect to customers page
                                    window.location.href = '/customers';
                                  } catch (error) {
                                    console.error('Error onboarding client:', error);
                                    toast.error(`Failed to onboard client: ${error.response?.data?.message || error.message}`);
                                  } finally {
                                    setOnboarding(false);
                                  }
                                }}
                                disabled={onboarding}
                                className="p-2 text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Onboard Client"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                            {/* Show Un-onboard button if inquiry is already onboarded */}
                            {inquiry.isOnboarded && (
                              <button
                                onClick={async () => {
                                  if (!confirm('Are you sure you want to un-onboard this client? This will revert the inquiry back to active status.')) return;

                                  try {
                                    setOnboarding(true);
                                    const response = await inquiryAPI.unonboard(inquiry._id);
                                    console.log('Un-onboard response:', response.data);

                                    toast.success('Client un-onboarded successfully! ✅');

                                    // Reload inquiries
                                    loadInquiries();
                                  } catch (error) {
                                    console.error('Error un-onboarding client:', error);
                                    toast.error(`Failed to un-onboard client: ${error.response?.data?.message || error.message}`);
                                  } finally {
                                    setOnboarding(false);
                                  }
                                }}
                                disabled={onboarding}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Un-onboard Client"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(inquiry._id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                              title="Delete"
                            >
                              <X className="w-4 h-4" />
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

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingInquiry ? 'Edit Inquiry' : 'New Inquiry'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Customer Information */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-red-700" />
                    <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter customer name"
                      />
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter company name (optional)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer ID
                      </label>
                      <input
                        type="text"
                        name="customerId"
                        value={formData.customerId}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-100"
                        placeholder="Autogenerated"
                        disabled
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="contact"
                        value={formData.contact}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter contact number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter email"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter address"
                      />
                    </div>
                  </div>
                </div>

                {/* Inquiry Details */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-red-700" />
                    <h3 className="text-lg font-semibold text-gray-900">Inquiry Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enquiry Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        name="enquiryDateTime"
                        value={formData.enquiryDate && formData.enquiryTime ? `${formData.enquiryDate}T${formData.enquiryTime}` : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            const [date, time] = val.split('T');
                            setFormData(prev => ({ ...prev, enquiryDate: date, enquiryTime: time }));
                          } else {
                            setFormData(prev => ({ ...prev, enquiryDate: '', enquiryTime: '' }));
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="new">New</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lead Platform <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="leadPlatform"
                        value={formData.leadPlatform}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="">-- Select Lead Platform --</option>
                        <option value="Website">Website</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook">Facebook</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Google Ads">Google Ads</option>
                        <option value="Meta Ads">Meta Ads</option>
                        <option value="SEO">SEO</option>
                        <option value="Referral">Referral</option>
                        <option value="Walk-in">Walk-in</option>
                        <option value="Phone Call">Phone Call</option>
                        <option value="Email">Email</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lead Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="leadStatus"
                        value={formData.leadStatus}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="NEW">New</option>
                        <option value="CONTACTED">Contacted</option>
                        <option value="QUALIFIED">Qualified</option>
                        <option value="UNQUALIFIED">Unqualified</option>
                        <option value="CONVERTED">Converted</option>
                        <option value="LOST">Lost</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-red-700" />
                    <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
                  </div>
                  <div className="space-y-4">
                    {/* Add Item Form */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name
                          </label>
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <div
                                onClick={() => setShowProductModal(true)}
                                className="cursor-pointer"
                              >
                                <input
                                  type="text"
                                  name="productName"
                                  value={currentItem.productName}
                                  onChange={(e) => {
                                    // Allow manual typing if needed, but primarily trigger modal
                                    handleItemInputChange(e);
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
                                  placeholder="Click to select product"
                                  autoComplete="off"
                                  readOnly // Force user to use modal, or remove this if we want hybrid
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            name="quantity"
                            min="1"
                            value={currentItem.quantity}
                            onChange={handleItemInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product Details
                        </label>
                        <textarea
                          name="productDetails"
                          value={currentItem.productDetails}
                          onChange={handleItemInputChange}
                          rows="2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="Enter detailed product specifications..."
                        />
                      </div>

                      {/* Layout Plan PDF Upload */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Layout Plan (PDF)
                        </label>
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setLayoutPlanFile(e.target.files[0])}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        {layoutPlanFile && (
                          <p className="text-sm text-gray-600 mt-1">
                            Selected: {layoutPlanFile.name}
                          </p>
                        )}
                        {editingInquiry?.meta?.layoutPlanUrl && (
                          <a
                            href={editingInquiry.meta.layoutPlanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                          >
                            View current layout plan: {editingInquiry.meta.layoutPlanFileName || 'layout_plan.pdf'}
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Item
                      </button>
                    </div>

                    {/* Items List */}
                    {formData.items.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                            <tr>
                              <th className="px-4 py-2">Product</th>
                              <th className="px-4 py-2">Details</th>
                              <th className="px-4 py-2 w-20">Qty</th>
                              <th className="px-4 py-2 w-16">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {formData.items.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-2 font-medium">{item.productName}</td>
                                <td className="px-4 py-2 text-gray-500 truncate max-w-xs">{item.productDetails}</td>
                                <td className="px-4 py-2">{item.quantity}</td>
                                <td className="px-4 py-2">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(index)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message
                      </label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter inquiry message or requirements..."
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                  {editingInquiry && canEditInquiries && !editingInquiry.isOnboarded && (
                    <button
                      type="button"
                      onClick={handleOnboardClient}
                      disabled={onboarding}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserCheck className="w-4 h-4" />
                      {onboarding ? 'Onboarding...' : 'Onboard Client'}
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition font-medium"
                  >
                    {editingInquiry ? 'Update Inquiry' : 'Create Inquiry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Product Selection Modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Select Product</h2>
                  <p className="text-sm text-gray-500">Browse by category or search</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 w-64"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={() => setShowProductModal(false)}
                    className="p-2 hover:bg-gray-200 rounded-full transition"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {Object.keys(getGroupedProducts()).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Package className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg">No products found matching "{productSearchQuery}"</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Safe fallback for Categories not in map */}
                    {Object.entries(getGroupedProducts()).sort().map(([categoryKey, categoryProducts]) => (
                      <div key={categoryKey} className="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4 border-b pb-2">
                          <span className="w-1 h-6 bg-red-600 rounded-full"></span>
                          <h3 className="text-lg font-bold text-gray-800">
                            {CATEGORY_MAPPING[categoryKey] || categoryKey}
                          </h3>
                          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {categoryProducts.length}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {categoryProducts.map((product) => (
                            <button
                              key={product._id}
                              onClick={() => {
                                setCurrentItem(prev => ({
                                  ...prev,
                                  productName: product.name,
                                  productDetails: product.description || prev.productDetails
                                }));
                                setShowProductModal(false);
                                setProductSearchQuery(''); // Clear search
                              }}
                              className="group flex flex-col items-start p-4 rounded-lg border border-gray-200 hover:border-red-500 hover:shadow-md transition-all bg-white text-left relative overflow-hidden"
                            >
                              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-red-700 transition-colors line-clamp-2">
                                {product.name}
                              </h4>
                              {product.specifications && (
                                <div className="text-xs text-gray-500 mt-auto pt-2 w-full border-t border-gray-50">
                                  {product.specifications.dimensions && (
                                    <span>{product.specifications.dimensions.width}x{product.specifications.dimensions.depth}</span>
                                  )}
                                  {product.specifications.color && (
                                    <span className="ml-2">• {product.specifications.color}</span>
                                  )}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer (Optional custom entry) */}
              <div className="p-4 border-t bg-white flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Can't find what you're looking for?
                  <button
                    className="ml-1 text-red-600 hover:underline font-medium"
                    onClick={() => {
                      // Allow manually entering the search term as custom product
                      setCurrentItem(prev => ({
                        ...prev,
                        productName: productSearchQuery || ''
                      }));
                      setShowProductModal(false);
                    }}
                  >
                    Use "{productSearchQuery || 'custom'}" as custom product
                  </button>
                </p>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Source Selection Modal */}
        {showSourceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">
                    {fetchStep === 1 ? 'Select Source Sheet' : 'Select Tabs'}
                  </h2>
                  <button
                    onClick={() => setShowSourceModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">Choose which Google Sheet to fetch inquiries from:</p>

                {/* Debug info */}
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <div><strong>Debug Info:</strong></div>
                  <div>Sheet Sources Count: {Object.keys(sheetSources).length}</div>
                  <div>Selected Source: {selectedSource}</div>
                  <div>Sources: {JSON.stringify(Object.keys(sheetSources))}</div>
                </div>

                {fetchStep === 1 && (
                  <div className="space-y-3">
                    {Object.keys(sheetSources).length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <p>⚠️ No sheet sources loaded</p>
                        <p className="text-xs mt-2">Check browser console for errors</p>
                      </div>
                    ) : (
                      Object.entries(sheetSources).map(([key, source]) => (
                        <label key={key} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${selectedSource === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                          <input
                            type="radio"
                            name="sheetSource"
                            value={key}
                            checked={selectedSource === key}
                            onChange={() => setSelectedSource(key)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="ml-3">
                            <span className="block text-sm font-medium text-gray-900">{source.name}</span>
                            {/* Show sheet name if different from source name */}
                            {source.sheetName && source.sheetName !== source.name && (
                              <span className="block text-xs text-gray-500">Sheet: {source.sheetName}</span>
                            )}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}

                {/* STEP 2: TAB SELECTION */}
                {fetchStep === 2 && (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-gray-600">Select tabs to fetch from:</p>
                      <div className="text-xs space-x-2">
                        <button
                          onClick={() => setSelectedTabs(availableTabs)}
                          className="text-blue-600 hover:underline"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => setSelectedTabs([])}
                          className="text-gray-500 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-1">
                      {loadingTabs ? (
                        <div className="p-4 text-center text-gray-500">Loading tabs...</div>
                      ) : availableTabs.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No tabs found</div>
                      ) : (
                        availableTabs.map((tab) => (
                          <label key={tab} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTabs.includes(tab)}
                              onChange={() => handleTabToggle(tab)}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">{tab}</span>
                          </label>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Selected: {selectedTabs.length} tabs
                    </p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <button
                  onClick={() => {
                    if (fetchStep === 2) setFetchStep(1);
                    else setShowSourceModal(false);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  {fetchStep === 1 ? 'Cancel' : 'Back'}
                </button>

                {fetchStep === 1 ? (
                  <button
                    onClick={handleFetchTabs}
                    disabled={fetchingFromSheet || loadingTabs}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {loadingTabs ? <Loader className="w-4 h-4 animate-spin" /> : null}
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleFetchPreview}
                    disabled={fetchingFromSheet || selectedTabs.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {fetchingFromSheet ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Fetch Preview
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Preview Inquiries from Google Sheets
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Found {previewData.length} inquiries from <span className="font-semibold text-blue-600">{previewData.length > 0 ? [...new Set(previewData.map(d => d.sourceTab))].join(', ') : '0 tabs'}</span>.{' '}
                      {previewData.filter(r => r.isDuplicate).length > 0 && (
                        <span className="text-orange-600 font-semibold ml-2">
                          ⚠️ {previewData.filter(r => r.isDuplicate).length} duplicates found!
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.map((row, index) => (
                        <tr key={index} className={`hover:bg-gray-50 ${row.isDuplicate ? 'bg-orange-50' : ''}`}>
                          <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                          <td className="px-4 py-3">
                            {row.isDuplicate ? (
                              <div className="flex items-center gap-1" title={`Duplicate found: ${row.existingInquiry?.customerName} (${row.existingInquiry?.contact})`}>
                                <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 font-medium">
                                  ⚠️ Duplicate
                                </span>
                              </div>
                            ) : (
                              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                                ✓ New
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">{row.customerName}</div>
                            {row.companyName && (
                              <div className="text-xs text-gray-500">{row.companyName}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{row.contact}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{row.email || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{row.productName}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{row.quantity}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded-full ${row.priority === 'high' ? 'bg-red-100 text-red-700' :
                              row.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                              {row.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{row.leadPlatform}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    <strong>{previewData.length}</strong> inquiries will be created
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPreviewModal(false)}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateInquiries}
                      disabled={creatingInquiries}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {creatingInquiries ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Create Inquiries
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inquiries;
