import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Plus, Trash2, Save, Send, FileText, X, Scan, CheckCircle, FileIcon } from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';
import { toast } from '../../hooks/useToast';
import ItemSelectorModal from '../../components/ItemSelectorModal';
import ProductMaterialEditor from '../../components/ProductMaterialEditor';
import { convertScanResultsToQuotationItems, getScanSummary } from '../../utils/scanResultsConverter';

const DEFAULT_BANK_DETAILS = {
  bankName: 'DBS Bank',
  accountNumber: '1000000001',
  ifscCode: 'DBSS0IN0811',
  branch: 'Todi'
};

const DEFAULT_TERMS = [
  'Terms & Conditions mentioned over this quotation are for general reference only.',
  'Delivery will be 4 weeks from the date of material order and as the advance. Main details and confirmed weight drawings.',
  'Any extra work done by us apart from the date of delivery of the material or due damage which will be not extra cost. Damage of Equipment Channels, Locks will not be covered under Warranty period.',
  'If Finish, Basic rate of 21% is considered in the given cost.',
  'In Cordless Cam we do in favour of VLITE FURNITECH LLP, C/224, Antop Hill Ware housing Complex, Wadala east, Mumbai 400037'
];

const DEFAULT_NOTES = 'UNLOADING WILL BE DONE BY FACTORY TEAM BUT MATERIAL WILL BE IN THE SCOPE OF THE CUSTOMER';
const DESCRIPTION_SEPARATOR = '\n---\n';

const QuotationForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = !!id;

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]); // State for raw materials
  const [loading, setLoading] = useState(false);
  const [showItemSelector, setShowItemSelector] = useState(false); // Modal state
  const [activeItemIndex, setActiveItemIndex] = useState(null); // Track which row is opening the modal
  const [inquiryId, setInquiryId] = useState(null); // Track inquiry ID
  const [isScanning, setIsScanning] = useState(false); // Scanner state
  const [scanProgress, setScanProgress] = useState(0); // Scanning progress percentage
  const [importProgress, setImportProgress] = useState(0); // Import progress percentage
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    companyName: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ layoutDescription: '', description: '', quantity: 1, unit: 'Nos', unitPrice: 0, taxPerUnit: 18, amount: 0, image: '', details: '', specifications: { subItems: [] } }],
    discount: 0,
    bankDetails: DEFAULT_BANK_DETAILS,
    notes: DEFAULT_NOTES,
    emailMessage: '',
    termsAndConditions: DEFAULT_TERMS,
    approvalStatus: 'DRAFT',
    fileDescription: '',
    attachments: []
  });

  const [selectedFile, setSelectedFile] = useState(null);

  const [summary, setSummary] = useState({
    taxableAmount: 0,
    cgst: 0,
    sgst: 0,
    discount: 0,
    totalAmount: 0
  });

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchRawMaterials();

    // Check for navigation state from Salesman Dashboard
    if (location.state && !isEdit) {
      (async () => {
        const { inquiryId, customerName, customerEmail, customerPhone, customerAddress, companyName, inquiryItems, productName, productDetails } = location.state;

        console.log('Auto-filling from navigation state:', location.state);

        // Set Inquiry ID specific for linking
        if (inquiryId) setInquiryId(inquiryId);

        // Fetch products to match prices
        let productsMap = {};
        try {
          const productsRes = await api.get('/products');
          const products = productsRes.data.data || productsRes.data || [];
          products.forEach(product => {
            if (product.name) {
              const price = product.pricing?.sellingPrice || product.price || 0;
              productsMap[product.name.toLowerCase().trim()] = price;
            }
          });
        } catch (err) {
          console.error('Error fetching products:', err);
        }

        // Build items array - prioritize inquiryItems if available
        let items;
        if (inquiryItems && Array.isArray(inquiryItems) && inquiryItems.length > 0) {
          // Map inquiry items to quotation items format with prices
          items = inquiryItems.map(item => {
            const productName = item.description || '';
            const matchedPrice = productsMap[productName.toLowerCase().trim()] || 0;
            const quantity = item.quantity || 1;
            const lineTotal = quantity * matchedPrice;
            const taxAmount = (lineTotal * 18) / 100;
            const details = item.meta?.details || ''; // Extract details from inquiry item

            return {
              layoutDescription: item.layoutDescription || '',
              description: productName,
              quantity: quantity,
              unit: 'Nos',
              unitPrice: matchedPrice,
              taxPerUnit: 18,
              amount: lineTotal + taxAmount,
              image: item.image || '',
              details: details, // Include details in quotation item
              specifications: { subItems: [] }
            };
          });
        } else if (productName) {
          // Fallback to legacy single product format
          const matchedPrice = productsMap[productName.toLowerCase().trim()] || 0;
          items = [{
            description: productName,
            quantity: 1,
            unit: 'Nos',
            unitPrice: matchedPrice,
            taxPerUnit: 18,
            amount: matchedPrice * 1.18,
            details: productDetails || '', // Use productDetails if available
            specifications: { subItems: [] }
          }];
        } else {
          // Default empty item
          items = [{ layoutDescription: '', description: '', quantity: 1, unit: 'Nos', unitPrice: 0, taxPerUnit: 18, amount: 0, image: '', details: '', specifications: { subItems: [] } }];
        }

        // Auto-fill the form
        setFormData(prev => ({
          ...prev,
          customerName: customerName || '',
          customerEmail: customerEmail || '',
          customerPhone: customerPhone || '',
          customerAddress: customerAddress || '',
          companyName: companyName || '',
          inquiryProductDetails: productDetails || '',
          items: items,
          notes: ''
        }));

        console.log('✅ Form data set with companyName:', companyName);
      })();
    }
    // Check for inquiryId query param
    else if (isEdit) {
      fetchQuotation();
    } else {
      const params = new URLSearchParams(window.location.search);
      const inquiryIdParam = params.get('inquiryId');
      if (inquiryIdParam) {
        setInquiryId(inquiryIdParam); // Store inquiry ID
        fetchInquiryDetails(inquiryIdParam);
      }
    }
  }, [id, location.state]);

  const fetchInquiryDetails = async (inquiryId) => {
    try {
      const res = await api.get(`/inquiries/${inquiryId}`);
      const inquiry = res.data.data || res.data;

      // Fetch all products to match prices
      let productsMap = {};
      try {
        const productsRes = await api.get('/products');
        const products = productsRes.data.data || productsRes.data || [];
        // Create a map of product name -> price for quick lookup
        products.forEach(product => {
          if (product.name) {
            const price = product.pricing?.sellingPrice || product.price || 0;
            productsMap[product.name.toLowerCase().trim()] = price;
          }
        });
      } catch (err) {
        console.error('Error fetching products for price lookup:', err);
      }

      // Map inquiry items to quotation items with prices
      const inquiryItems = inquiry.items?.map(item => {
        const productName = item.description || '';
        const matchedPrice = productsMap[productName.toLowerCase().trim()] || 0;
        const quantity = item.quantity || 1;
        const details = item.meta?.details || ''; // Extract details from inquiry item

        // Calculate amount with tax
        const lineTotal = quantity * matchedPrice;
        const taxAmount = (lineTotal * 18) / 100;
        const amount = lineTotal + taxAmount;

        return {
          description: productName,
          quantity: quantity,
          unit: 'Nos',
          unitPrice: matchedPrice,
          taxPerUnit: 18,
          amount: amount,
          details: details, // Add details to quotation item
          specifications: { subItems: [] }
        };
      }) || [{ description: inquiry.productName || '', quantity: 1, unit: 'Nos', unitPrice: 0, taxPerUnit: 18, amount: 0, details: '', specifications: { subItems: [] } }];

      // Format product details from items using meta.details field - ONLY show the details
      let productDetails = '';
      if (inquiry.items && inquiry.items.length > 0) {
        productDetails = inquiry.items.map((item, idx) => {
          const details = item.meta?.details || '';
          return details; // Only return the details, nothing else
        }).filter(detail => detail).join('\n\n'); // Filter out empty details
      }


      setFormData(prev => ({
        ...prev,
        customerName: inquiry.customerName || inquiry.meta?.customerName || '',
        customerEmail: inquiry.email || inquiry.meta?.email || '',
        companyName: inquiry.companyName || inquiry.meta?.companyName || '',
        inquiryProductDetails: productDetails || 'No product details available',
        items: inquiryItems,
        notes: ''
      }));
    } catch (err) {
      console.error('Error fetching inquiry details:', err);
    }
  };

  useEffect(() => {
    calculateSummary();
  }, [formData.items, formData.discount]);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      const productsData = res.data.data || res.data || [];
      setProducts(productsData);
      console.log('Loaded products for quotation:', productsData.length);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchRawMaterials = async () => {
    try {
      const res = await api.get('/rawmaterial'); // Endpoint based on RawMaterialDashboard usage
      const materialsData = res.data.data || res.data || [];
      setRawMaterials(materialsData);
      console.log('Loaded raw materials for quotation:', materialsData.length);
    } catch (err) {
      console.error('Error fetching raw materials:', err);
    }
  };

  const fetchQuotation = async () => {
    try {
      const res = await api.get(`/quotations/${id}`);
      const quotationData = res.data.data || res.data;

      // Try to fetch inquiry email
      let inquiryEmail = '';

      // Method 1: If quotation has inquiry reference
      if (quotationData.inquiry) {
        try {
          // Handle case where inquiry might be populated object or just ID string
          const inquiryIdValue = typeof quotationData.inquiry === 'object'
            ? quotationData.inquiry._id
            : quotationData.inquiry;

          const inquiryRes = await api.get(`/inquiries/${inquiryIdValue}`);
          const inquiry = inquiryRes.data.data || inquiryRes.data;
          inquiryEmail = inquiry.email || inquiry.meta?.email || '';
          setInquiryId(inquiryIdValue);
        } catch (err) {
          console.error('Error fetching inquiry by ID:', err);
        }
      }
      // Method 2: If no inquiry reference, search by customer name
      else if (quotationData.customerName) {
        try {
          const inquiriesRes = await api.get('/inquiries');
          const allInquiries = inquiriesRes.data.data || inquiriesRes.data;

          // Find inquiry matching this customer name
          const matchingInquiry = allInquiries.find(inq =>
            inq.customerName === quotationData.customerName ||
            inq.meta?.customerName === quotationData.customerName
          );

          if (matchingInquiry) {
            inquiryEmail = matchingInquiry.email || matchingInquiry.meta?.email || '';
            setInquiryId(matchingInquiry._id);
          }
        } catch (err) {
          console.error('Error searching inquiry by customer name:', err);
        }
      }

      setFormData({
        customerName: quotationData.customerName || quotationData.customer?.companyName || quotationData.customer?.tradeName || '',
        customerEmail: inquiryEmail || quotationData.customerEmail || quotationData.customer?.primaryEmail || quotationData.customer?.emails?.[0]?.email || '',
        companyName: quotationData.companyName || '',
        inquiryProductDetails: quotationData.inquiryProductDetails || '',
        validFrom: new Date(quotationData.validFrom).toISOString().split('T')[0],
        validUntil: new Date(quotationData.validUntil).toISOString().split('T')[0],
        items: (quotationData.items || []).map(item => ({
          ...item,
          selectedProducts: item.selectedProducts || [],
          selectedMaterials: item.selectedMaterials || [],
          specifications: item.specifications || (item.specifications?.subItems ? item.specifications : { subItems: [] })
        })),
        discount: quotationData.discount || 0,
        bankDetails: (quotationData.bankDetails && quotationData.bankDetails.bankName) ? quotationData.bankDetails : DEFAULT_BANK_DETAILS,
        notes: quotationData.notes || DEFAULT_NOTES,
        emailMessage: quotationData.emailMessage || 'Dear Customer,\n\nPlease find attached the quotation as per your inquiry. We look forward to serving you.\n\nBest regards,\nVlite Furnitures',
        termsAndConditions: (quotationData.termsAndConditions && quotationData.termsAndConditions.length > 0) ? quotationData.termsAndConditions : DEFAULT_TERMS,
        termsAndConditions: (quotationData.termsAndConditions && quotationData.termsAndConditions.length > 0) ? quotationData.termsAndConditions : DEFAULT_TERMS,
        approvalStatus: quotationData.approvalStatus || 'DRAFT',
        fileDescription: quotationData.fileDescription || '',
        scannedLayout: quotationData.scannedLayout, // Persist scanned layout info
        attachments: quotationData.attachments || []
      });
    } catch (err) {
      console.error('Error fetching quotation:', err);
      toast.error('Error loading quotation');
      navigate('/quotations');
    }
  };

  const calculateSummary = () => {
    let taxableAmount = 0;

    // 1. Calculate Total Taxable Amount
    formData.items.forEach(item => {
      // Use unitPrice which is already total for sub-items
      const lineTotal = item.quantity * item.unitPrice;
      taxableAmount += lineTotal;
    });

    // 2. Apply Universal GST (9% CGST + 9% SGST)
    const cgst = taxableAmount * 0.09;
    const sgst = taxableAmount * 0.09;
    const totalTax = cgst + sgst;

    const totalAmount = taxableAmount + totalTax - (formData.discount || 0);

    setSummary({
      taxableAmount,
      cgst,
      sgst,
      discount: formData.discount || 0,
      totalAmount
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { layoutDescription: '', description: '', quantity: 1, unit: 'Nos', unitPrice: 0, taxPerUnit: 18, amount: 0, image: '', details: '', specifications: { subItems: [] } }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  // Helper to recalculate main row totals from sub-items
  const calculateLineTotals = (item) => {
    if (item.specifications && item.specifications.subItems && item.specifications.subItems.length > 0) {
      let totalAmount = 0;
      let totalQuantity = 0;
      let combinedDescription = '';

      item.specifications.subItems.forEach((sub, idx) => {
        // Ensure quantity and unitPrice are always defined numbers
        sub.quantity = sub.quantity !== undefined && sub.quantity !== null ? sub.quantity : 0;
        sub.unitPrice = sub.unitPrice !== undefined && sub.unitPrice !== null ? sub.unitPrice : 0;

        const subAmt = (parseFloat(sub.quantity) || 0) * (parseFloat(sub.unitPrice) || 0);
        sub.amount = subAmt;
        totalAmount += subAmt;

        // Sum up quantities (skip text items)
        if (!sub.isText) {
          totalQuantity += (parseFloat(sub.quantity) || 0);
        }

        // Build description for backward compatibility / search
        combinedDescription += (idx > 0 ? '\n---\n' : '') + (sub.description || '');
      });

      // Update main item aggregates
      item.quantity = totalQuantity || 1; // Use total quantity, fallback to 1 if all are text items
      item.unitPrice = totalAmount; // total cost of the group

      // EXCLUDE TAX from item total (will be calculated in summary)
      item.amount = totalAmount;
      item.description = combinedDescription;
    } else {
      // Standard single item calculation
      const lineTotal = item.quantity * item.unitPrice;

      // EXCLUDE TAX from item total (will be calculated in summary)
      item.amount = lineTotal;
    }
    return item;
  };

  const updateSubItem = (itemIndex, subIndex, field, value) => {
    const newItems = [...formData.items];
    const item = newItems[itemIndex];

    if (!item.specifications || !item.specifications.subItems) return;

    const subItem = item.specifications.subItems[subIndex];
    subItem[field] = (field === 'quantity' || field === 'unitPrice') ? (parseFloat(value) || 0) : value;

    // Recalculate this item and the main row
    newItems[itemIndex] = calculateLineTotals(item);

    setFormData({ ...formData, items: newItems });
  };

  const removeSubItem = (itemIndex, subIndex) => {
    const newItems = [...formData.items];
    const item = newItems[itemIndex];

    if (item.specifications && item.specifications.subItems) {
      item.specifications.subItems.splice(subIndex, 1);

      if (item.specifications.subItems.length === 0) {
        // Reset to clean state if no sub-items left
        item.description = '';
        item.quantity = 1;
        item.unitPrice = 0;
        item.amount = 0;
      } else {
        newItems[itemIndex] = calculateLineTotals(item);
      }

      setFormData({ ...formData, items: newItems });
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    // Allow text fields to accept string values, otherwise parse as number
    const textFields = ['description', 'unit', 'layoutDescription', 'image', 'details'];
    newItems[index][field] = textFields.includes(field) ? value : parseFloat(value) || 0;

    // Auto-calculate amount
    // Re-run calc in case it was a standard item
    const item = newItems[index];

    // Recalculate happens inside this for subItems, 
    // but for simple fields we still check
    newItems[index] = calculateLineTotals(item);

    setFormData({ ...formData, items: newItems });
  };

  const uploadFile = async () => {
    if (!selectedFile) return null;
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const res = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return {
        name: res.data.name,
        url: res.data.url,
        type: res.data.type
      };
    } catch (err) {
      console.error('File upload failed:', err);
      toast.error('File upload failed');
      throw err;
    }
  };

  const saveAttachmentOnly = async () => {
    try {
      setLoading(true);

      // 1. Upload File
      let updatedAttachments = [...formData.attachments];
      if (selectedFile) {
        const uploadedFile = await uploadFile();
        if (uploadedFile) {
          updatedAttachments.push(uploadedFile);
          setSelectedFile(null); // Clear selected file after successful upload
        }
      }

      // 2. Prepare Payload
      // We merge current form data to ensure we don't lose other WIP changes if we save the whole doc
      const payload = {
        ...formData,
        attachments: updatedAttachments,
        fileDescription: formData.fileDescription,
        // Ensure other fields are present for validation if creating new
        ...summary,
        approvalStatus: 'DRAFT' // Enforce draft status if creating new
      };

      if (inquiryId) payload.inquiry = inquiryId;

      // 3. Save
      if (isEdit) {
        await api.put(`/quotations/${id}`, payload);
        toast.success('Attachment saved successfully!');
        // Update local state to reflect the uploaded file in constraints if needed
        setFormData(prev => ({ ...prev, attachments: updatedAttachments }));
      } else {
        // Create new
        const res = await api.post('/quotations', payload);
        toast.success('Draft created with attachment!');
        // Switch to Edit Mode without full reload if possible, or just navigate
        // For now, we will navigate to edit mode to ensure ID is captured
        navigate(`/quotations/${res.data._id}/edit`, { replace: true });
      }

    } catch (err) {
      console.error(err);
      toast.error('Failed to save attachment');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (status = 'DRAFT') => {
    try {
      setLoading(true);

      let updatedAttachments = [...formData.attachments];
      if (selectedFile) {
        const uploadedFile = await uploadFile();
        if (uploadedFile) {
          updatedAttachments.push(uploadedFile);
        }
      }

      const payload = {
        ...formData,
        approvalStatus: status,
        attachments: updatedAttachments,
        ...summary
      };

      // Include inquiry reference if creating from inquiry
      if (inquiryId) {
        payload.inquiry = inquiryId;
      }

      if (isEdit) {
        await api.put(`/quotations/${id}`, payload);
        toast.success('Quotation updated successfully! ✅');
      } else {
        await api.post('/quotations', payload);
        toast.success('Quotation saved successfully! ✅');
      }

      // Navigate and force reload to ensure fresh data
      navigate('/quotations', { replace: true });
      window.location.reload();
    } catch (err) {
      console.error('Error saving quotation:', err);
      toast.error(err.response?.data?.message || 'Error saving quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndSend = async () => {
    try {
      setLoading(true);

      let updatedAttachments = [...formData.attachments];
      if (selectedFile) {
        const uploadedFile = await uploadFile();
        if (uploadedFile) {
          updatedAttachments.push(uploadedFile);
        }
      }

      const payload = {
        ...formData,
        approvalStatus: 'SENT',
        attachments: updatedAttachments,
        ...summary
      };

      // 🔗 Include inquiry reference if creating from inquiry
      if (inquiryId) {
        payload.inquiry = inquiryId;
      }

      let quotationId = id;
      if (isEdit) {
        await api.put(`/quotations/${id}`, payload);
      } else {
        const res = await api.post('/quotations', payload);
        quotationId = res.data._id;
      }

      await api.post(`/quotations/${quotationId}/send`);
      toast.success('Quotation sent successfully! ✅');
      navigate('/quotations');
    } catch (err) {
      console.error('Error sending quotation:', err);
      toast.error(err.response?.data?.message || 'Error sending quotation');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (id) {
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
    } else {
      toast.warning('Please save the quotation first to generate PDF');
    }
  };

  const addTermCondition = () => {
    setFormData({
      ...formData,
      termsAndConditions: [...formData.termsAndConditions, '']
    });
  };

  const updateTermCondition = (index, value) => {
    const newTerms = [...formData.termsAndConditions];
    newTerms[index] = value;
    setFormData({ ...formData, termsAndConditions: newTerms });
  };

  const removeTermCondition = (index) => {
    const newTerms = formData.termsAndConditions.filter((_, i) => i !== index);
    setFormData({ ...formData, termsAndConditions: newTerms });
    setFormData({ ...formData, termsAndConditions: newTerms });
  };

  const handleOpenItemSelector = (index) => {
    setActiveItemIndex(index);
    setShowItemSelector(true);
  };

  const handleItemSelect = (item, type) => {
    if (activeItemIndex === null) return;

    const index = activeItemIndex;
    const currentItem = formData.items[index];

    let newItemDescription = item.name;
    let newItemPrice = 0;
    let newItemImage = '';

    if (type === 'products') {
      newItemPrice = item.pricing?.sellingPrice || item.price || 0;
      newItemImage = item.image || '';

      const dims = item.specifications || item.dimensions;
      if (dims) {
        const dimString = [
          dims.height ? `H:${dims.height}` : '',
          dims.width ? `W:${dims.width}` : '',
          dims.depth || dims.thickness ? `D:${dims.depth || dims.thickness}` : ''
        ].filter(Boolean).join(' ');
        if (dimString) {
          newItemDescription += ` (${dimString})`;
        }
      }
    } else if (type === 'custom') {
      // Custom Item Logic
      newItemPrice = item.price || 0;
      newItemImage = ''; // Custom items don't have images by default
      // Description is already set to item.name
    } else if (type === 'text') {
      // Text-only item - no price or quantity
      newItemPrice = 0;
      newItemImage = '';
      // Description is already set to item.name
    } else {
      newItemPrice = item.costPrice || 0;
      newItemImage = '';

      const dims = item.specifications;
      if (dims) {
        const dimString = [
          dims.height ? `H:${dims.height}` : '',
          dims.length ? `L:${dims.length}` : '',
          dims.width ? `W:${dims.width}` : '',
          dims.thickness ? `T:${dims.thickness}` : ''
        ].filter(Boolean).join(' ');
        if (dimString) {
          newItemDescription += ` [${dimString}]`;
        }
      }
    }

    // SUB-ITEM LOGIC
    // Initialize subItems array if not present
    if (!currentItem.specifications || !currentItem.specifications.subItems) {
      // Convert current singular item to first sub-item, ONLY if it has data
      const initialSubItems = [];
      if (currentItem.description || currentItem.unitPrice > 0) {
        initialSubItems.push({
          description: currentItem.description || '',
          quantity: currentItem.quantity || 1,
          unitPrice: currentItem.unitPrice || 0,
          amount: (currentItem.quantity || 1) * (currentItem.unitPrice || 0)
        });
      }

      const updatedSpecs = { ...currentItem.specifications, subItems: initialSubItems };
      currentItem.specifications = updatedSpecs;
    }

    // Create new sub-item
    const newSubItem = {
      description: newItemDescription,
      quantity: type === 'text' ? 0 : (type === 'custom' ? (item.quantity || 1) : 1),
      unitPrice: newItemPrice,
      amount: type === 'text' ? 0 : (newItemPrice * (type === 'custom' ? (item.quantity || 1) : 1)),
      isText: type === 'text' // Flag to identify text-only items
    };

    // Add to array
    currentItem.specifications.subItems.push(newSubItem);

    // Recalculate parent
    const updatedItem = calculateLineTotals(currentItem);

    // Update State
    const newItems = [...formData.items];
    newItems[index] = updatedItem;

    // Only set image if none exists
    if (!updatedItem.image && newItemImage) {
      updatedItem.image = newItemImage;
    }

    setFormData({ ...formData, items: newItems });

    setShowItemSelector(false);
    setActiveItemIndex(null);
  };

  // 🆕 Product/Material Management Handlers
  const [itemSelectorType, setItemSelectorType] = useState(null); // 'product' or 'material'

  const handleOpenProductSelector = (index) => {
    setActiveItemIndex(index);
    setItemSelectorType('product');
    setShowItemSelector(true);
  };

  const handleOpenMaterialSelector = (index) => {
    setActiveItemIndex(index);
    setItemSelectorType('material');
    setShowItemSelector(true);
  };

  const handleProductMaterialSelect = (item, type) => {
    if (activeItemIndex === null || !itemSelectorType) return;

    const index = activeItemIndex;
    const currentItem = { ...formData.items[index] };

    // Initialize arrays if needed
    if (!currentItem.selectedProducts) currentItem.selectedProducts = [];
    if (!currentItem.selectedMaterials) currentItem.selectedMaterials = [];

    // Add item based on selector type
    if (itemSelectorType === 'product' && type === 'product') {
      currentItem.selectedProducts.push({
        _id: item._id,
        name: item.name,
        price: item.sellingPrice || item.price || 0,
        category: item.category
      });
    } else if (itemSelectorType === 'material' && type === 'material') {
      currentItem.selectedMaterials.push({
        _id: item._id,
        name: item.name,
        price: item.sellingPrice || item.costPrice || 0,
        category: item.category,
        unit: item.uom || item.unit
      });
    }

    // Recalculate price
    const updatedItem = recalculateItemPrice(currentItem);

    const newItems = [...formData.items];
    newItems[index] = updatedItem;
    setFormData({ ...formData, items: newItems });

    setShowItemSelector(false);
    setActiveItemIndex(null);
    setItemSelectorType(null);
  };

  const updateItemProducts = (index, products) => {
    const currentItem = { ...formData.items[index] };
    currentItem.selectedProducts = products;
    const updatedItem = recalculateItemPrice(currentItem);

    const newItems = [...formData.items];
    newItems[index] = updatedItem;
    setFormData({ ...formData, items: newItems });
  };

  const updateItemMaterials = (index, materials) => {
    const currentItem = { ...formData.items[index] };
    currentItem.selectedMaterials = materials;
    const updatedItem = recalculateItemPrice(currentItem);

    const newItems = [...formData.items];
    newItems[index] = updatedItem;
    setFormData({ ...formData, items: newItems });
  };

  const recalculateItemPrice = (item) => {
    const productsTotal = (item.selectedProducts || []).reduce((sum, p) => sum + (p.price || 0), 0);
    const materialsTotal = (item.selectedMaterials || []).reduce((sum, m) => sum + (m.price || 0), 0);

    item.unitPrice = productsTotal + materialsTotal;
    item.amount = item.unitPrice * (item.quantity || 1);

    return item;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // 🚀 Scan Layout PDF and Auto-Populate Items
  const handleScanLayout = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate PDF file
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    try {
      setIsScanning(true);
      setScanProgress(0);
      toast.info('🔍 Scanning layout... This may take 30-60 seconds');

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          // Increase progress gradually but slow down near the end
          if (prev < 30) return prev + 5;
          if (prev < 60) return prev + 3;
          if (prev < 85) return prev + 2;
          if (prev < 95) return prev + 1;
          return prev;
        });
      }, 500);

      // Create FormData and upload
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      // Add quotation ID if editing existing quotation
      if (id) {
        uploadFormData.append('quotationId', id);
      }

      console.log('📤 Uploading PDF for scanning...');
      const response = await api.post('/quotations/scan-layout', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 0 // No timeout (wait indefinitely)
      });

      // Clear progress interval and set to 100%
      clearInterval(progressInterval);
      setScanProgress(100);

      console.log('✅ Scan response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Scan failed');
      }

      // Show notification that scan is complete
      const metadata = response.data.metadata;

      // Update form data to reflect completed scan
      setFormData(prev => ({
        ...prev,
        scannedLayout: {
          ...prev.scannedLayout,
          status: 'COMPLETED',
          originalName: file.name, // Save filename for display
          resultFile: metadata.resultFile
        }
      }));

      toast.success(
        `🎉 Layout scan complete! Found ${metadata.itemsFound} items. Click "Import Products from Layout" to add them.`,
        { duration: 8000 }
      );

      // Clear file input
      e.target.value = '';

      // Reset progress after a short delay
      setTimeout(() => setScanProgress(0), 2000);

    } catch (error) {
      console.error('❌ Scan error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to scan layout');
      setScanProgress(0);
    } finally {
      setIsScanning(false);
    }
  };

  // 📦 Import Products from Scanned Layout with AI
  const handleImportFromLayout = async () => {
    if (!id) {
      toast.error('Please save the quotation first before importing');
      return;
    }

    // Check if description exists
    if (!formData.fileDescription || !formData.fileDescription.trim()) {
      toast.error('Please provide description with product/material instructions in Attachments section');
      return;
    }

    try {
      setLoading(true);
      setImportProgress(0);
      toast.info('🤖 AI is analyzing description and layout... This may take 30-60 seconds');

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          // Increase progress gradually but slow down near the end
          if (prev < 25) return prev + 4;
          if (prev < 50) return prev + 3;
          if (prev < 75) return prev + 2;
          if (prev < 90) return prev + 1;
          return prev;
        });
      }, 500);

      // Call AI-powered import endpoint
      // Pass resultFile from frontend state in case DB doesn't have it yet (e.g. new quotation)
      const response = await api.post(`/quotations/${id}/import-with-ai`, {
        resultFile: formData.scannedLayout?.resultFile
      }, {
        timeout: 0 // No timeout (wait indefinitely)
      });

      // Clear progress interval and set to 100%
      clearInterval(progressInterval);
      setImportProgress(100);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Import failed');
      }

      const { items, metadata } = response.data;

      if (items.length === 0) {
        toast.warning('No items could be imported');
        setImportProgress(0);
        return;
      }

      // Merge with existing items
      const existingValidItems = formData.items.filter(item =>
        item.description || item.layoutDescription || item.unitPrice > 0
      );

      setFormData(prev => ({
        ...prev,
        items: [...existingValidItems, ...items]
      }));

      toast.success(
        `✅ AI imported ${items.length} items with products and materials!`,
        { duration: 6000 }
      );

      console.log('📊 Import metadata:', metadata);

      // Reset progress after a short delay
      setTimeout(() => setImportProgress(0), 2000);

    } catch (error) {
      console.error('❌ AI Import error:', error);
      const errorMsg = error.response?.data?.message || error.message;

      if (errorMsg.includes('No completed scan')) {
        toast.error('No scanned layout found. Please scan a PDF first.');
      } else if (errorMsg.includes('description')) {
        toast.error('Please provide description with instructions');
      } else {
        toast.error(errorMsg || 'Failed to import from layout');
      }
      setImportProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 w-full mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {isEdit ? 'Edit Quotation' : 'Create Quotation'}
          </h1>
          <p className="text-gray-600 mt-1">Fill in the details below</p>
        </div>
        <div className="flex gap-2">
          {id && (
            <Button variant="outline" onClick={handlePreviewPDF}>
              <FileText className="w-4 h-4 mr-2" />
              Preview PDF
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/quotations')}>
            Cancel
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        {/* Top Section: Customer Details & Summary */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Company & Customer Details */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Customer Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer *
                </label>
                <Input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Email
                </label>
                <Input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="Customer email address"
                  className={formData.customerEmail ? 'bg-gray-50' : ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid From *
                </label>
                <Input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Until *
                </label>
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <Input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>

              {formData.inquiryProductDetails && (
                <div className="col-span-2 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <h3 className="text-sm font-bold text-yellow-800 mb-2">Original Inquiry Product Details</h3>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words font-sans">
                    {formData.inquiryProductDetails}
                  </pre>
                </div>
              )}
            </div>
          </Card>



          {/* Bank Details */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Bank Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <Input
                  value={formData.bankDetails.bankName}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, bankName: e.target.value }
                  })}
                  placeholder="Enter bank name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <Input
                  value={formData.bankDetails.accountNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, accountNumber: e.target.value }
                  })}
                  placeholder="Enter account number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                <Input
                  value={formData.bankDetails.ifscCode}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, ifscCode: e.target.value }
                  })}
                  placeholder="Enter IFSC code"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <Input
                  value={formData.bankDetails.branch}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, branch: e.target.value }
                  })}
                  placeholder="Enter branch name"
                />
              </div>
            </div>
          </Card>

          {/* Terms & Conditions */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Terms & Conditions</h2>
              <Button onClick={addTermCondition} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Term
              </Button>
            </div>
            <div className="space-y-3">
              {formData.termsAndConditions.map((term, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={term}
                    onChange={(e) => updateTermCondition(index, e.target.value)}
                    placeholder={`Term ${index + 1}`}
                  />
                  <button
                    onClick={() => removeTermCondition(index)}
                    className="text-red-600 hover:text-red-800 shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar Summary */}
        <div className="w-full lg:w-[450px] shrink-0 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Taxable Amount</span>
                <span>₹{summary.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>CGST @9%</span>
                <span>₹{summary.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>SGST @9%</span>
                <span>₹{summary.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-semibold text-gray-700">Discount</span>
                <Input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                  className="w-32 text-right"
                  min="0"
                />
              </div>
              <div className="flex justify-between items-center pt-3 border-t text-xl font-bold text-gray-800">
                <span>Total Amount</span>
                <span>₹{summary.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => handleSave('DRAFT')}
                variant="outline"
                className="w-full mb-2"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button
                onClick={handleSaveAndSend}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Sending...' : 'Save & Send Quotation'}
              </Button>
            </div>
          </Card>

          {/* File Upload & Description Block */}
          <Card className="p-6 relative">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Attachments</h2>

            {/* Overlay for Unsaved State */}
            {!id && (
              <div className="absolute inset-x-0 bottom-0 top-16 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-b-lg">
                <div className="text-center p-6 max-w-sm">
                  <h3 className="text-lg font-bold text-red-700 mb-2">Please Save Quotation First</h3>
                  <p className="text-sm text-red-600 font-medium px-2">
                    You must save the quotation before uploading attachments or using the AI Scanner.
                  </p>
                </div>
              </div>
            )}

            <div className={!id ? "filter blur-[2px] pointer-events-none select-none opacity-60 transition-all duration-500 space-y-4" : "space-y-4"}>
              {/* 🚀 AI Layout Scanner */}
              <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Scan className="w-5 h-5 text-purple-600" />
                    <label className="text-sm font-semibold text-purple-800">
                      🤖 AI Layout Scanner
                    </label>
                  </div>
                  {isScanning && (
                    <span className="text-xs text-purple-600 animate-pulse">
                      Scanning...
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  Upload a furniture layout PDF to automatically extract items
                </p>
                <div className="relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleScanLayout}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isScanning}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full bg-white border-purple-400 text-purple-700 hover:bg-purple-100 mb-2"
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <>
                        <Scan className="w-4 h-4 mr-2 animate-spin" />
                        Scanning Layout... {scanProgress}%
                      </>
                    ) : (
                      <>
                        <Scan className="w-4 h-4 mr-2" />
                        Scan PDF Layout
                      </>
                    )}
                  </Button>

                  {isScanning && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-1">
                      <div
                        className="bg-purple-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${scanProgress}%` }}
                      ></div>
                    </div>
                  )}

                  {!isScanning && formData.scannedLayout && formData.scannedLayout.status === 'COMPLETED' && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                      <FileIcon className="w-4 h-4 text-green-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-800 truncate">
                          {formData.scannedLayout.filename ? formData.scannedLayout.filename.split('_').slice(1).join('_') : 'Layout Scanned'}
                        </p>
                        <p className="text-xs text-green-600">
                          {formData.scannedLayout.itemsFound ? `${formData.scannedLayout.itemsFound} items found • ` : ''}
                          Ready to Import
                        </p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.fileDescription || ''}
                  onChange={(e) => setFormData({ ...formData, fileDescription: e.target.value })}
                  placeholder="Enter description for the file..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  rows="3"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={saveAttachmentOnly}
                  disabled={loading}
                  size="sm"
                  className="bg-gray-800 text-white hover:bg-gray-900"
                >
                  {loading ? 'Saving...' : 'Save Attachment'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Items Section - Full Width */}
      <div className="w-full space-y-6">
        {/* Items Table */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Items</h2>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <Button
                  onClick={handleImportFromLayout}
                  size="sm"
                  variant="outline"
                  className="bg-green-50 text-green-700 hover:bg-green-100 border-green-300 relative overflow-hidden"
                  disabled={loading}
                  title={!id ? "Save quotation first" : "Import items from scanned layout"}
                >
                  <div className="relative z-10 flex items-center">
                    {loading && importProgress > 0 ? (
                      <>
                        <div className="animate-spin w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full mr-2"></div>
                        Importing... {importProgress}%
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-1" />
                        Import Products from Layout
                      </>
                    )}
                  </div>
                  {/* Background Progress Bar inside button for sleek look */}
                  {loading && importProgress > 0 && (
                    <div
                      className="absolute bottom-0 left-0 h-1 bg-green-400 transition-all duration-300 ease-out"
                      style={{ width: `${importProgress}%` }}
                    />
                  )}
                </Button>
                <Button onClick={addItem} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-2 py-2 text-center font-semibold text-gray-700 w-12">Sr No</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-700 w-32">Layout Description</th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-700 min-w-[300px]">Description</th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-700 w-24">Qty/in Nos</th>
                  <th className="px-2 py-2 text-right font-semibold text-gray-700 w-28">Rate</th>
                  <th className="px-2 py-2 text-right font-semibold text-gray-700 w-32">Amount</th>
                  <th className="px-2 py-2 text-center font-semibold text-gray-700 w-32">Image</th>
                  <th className="px-2 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-2 py-2 text-center text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-2 py-2">
                      <textarea
                        value={item.layoutDescription}
                        onChange={(e) => updateItem(index, 'layoutDescription', e.target.value)}
                        placeholder="Layout Desc"
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        rows="2"
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      {/* NEW: Check if item uses structured products/materials OR has AI-generated description */}
                      {(item.selectedProducts?.length > 0 || item.selectedMaterials?.length > 0 ||
                        (item.description?.includes('📦 Product Used:') || item.description?.includes('🔧 Materials Used:'))) ? (
                        /* Structured Editor */
                        <ProductMaterialEditor
                          selectedProducts={item.selectedProducts || []}
                          selectedMaterials={item.selectedMaterials || []}
                          onProductsChange={(products) => updateItemProducts(index, products)}
                          onMaterialsChange={(materials) => updateItemMaterials(index, materials)}
                          onOpenProductSelector={() => handleOpenProductSelector(index)}
                          onOpenMaterialSelector={() => handleOpenMaterialSelector(index)}
                        />
                      ) : (
                        /* Original Logic */
                        <div>
                          <div className="flex gap-1">
                            <div className="flex flex-col gap-2 mb-1 w-full">
                              {item.specifications?.subItems?.length > 0 ? (
                                item.specifications.subItems.map((sub, subIndex) => (
                                  <div key={subIndex} className="relative group border border-gray-200 rounded p-2 mb-2 bg-gray-50">
                                    {/* Description */}
                                    <input
                                      type="text"
                                      value={sub.description || ''}
                                      onChange={(e) => updateSubItem(index, subIndex, 'description', e.target.value)}
                                      placeholder={sub.isText ? "Text content..." : "Component Name (e.g., Table Top, Leg)"}
                                      className={`w-full px-2 py-1 border border-gray-300 rounded text-sm mb-1 ${sub.isText ? 'bg-gray-50 italic text-gray-600' : 'font-medium'}`}
                                      required={subIndex === 0}
                                    />

                                    {/* Dimensions Field */}
                                    {!sub.isText && (
                                      <input
                                        type="text"
                                        value={sub.dimensions || ''}
                                        onChange={(e) => updateSubItem(index, subIndex, 'dimensions', e.target.value)}
                                        placeholder="Dimensions (e.g., 1138x600mm, 25mm, 450mm HT)"
                                        className="w-full px-2 py-1 border border-red-200 rounded text-sm mb-1 focus:ring-2 focus:ring-red-500"
                                      />
                                    )}

                                    {/* Material Field */}
                                    {!sub.isText && (
                                      <input
                                        type="text"
                                        value={sub.material || ''}
                                        onChange={(e) => updateSubItem(index, subIndex, 'material', e.target.value)}
                                        placeholder="Material Specification (e.g., PLB with Edge Binding, Aluminium with powder coating)"
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-1"
                                      />
                                    )}

                                    {/* Remove Button */}
                                    <button
                                      type="button"
                                      onClick={() => removeSubItem(index, subIndex)}
                                      className="absolute top-1 right-1 text-red-500 hover:text-red-700 bg-white rounded-full p-1 shadow-sm border border-gray-200 transition-colors z-10"
                                      title="Remove this component"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <textarea
                                  value={item.description}
                                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                                  placeholder="Product/Material Desc"
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm mb-1"
                                  required
                                  rows="4"
                                />
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenItemSelector(index)}
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center shrink-0 h-[30px]"
                              title="Select Product or Material"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <textarea
                            value={item.details || ''}
                            onChange={(e) => updateItem(index, 'details', e.target.value)}
                            placeholder="Extra details"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 mt-1"
                            rows="2"
                          />
                        </div>
                      )}
                    </td>

                    <td className="px-2 py-2 text-center align-top">
                      {item.specifications?.subItems?.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {item.specifications.subItems.map((sub, sIdx) => (
                            <div key={sIdx} className="flex items-center justify-center min-h-[70px]">
                              {sub.isText ? (
                                <span className="text-gray-400 text-sm">-</span>
                              ) : (
                                <input
                                  type="number"
                                  value={sub.quantity || 0}
                                  onChange={(e) => updateSubItem(index, sIdx, 'quantity', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                  min="1"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-center"
                            min="1"
                            required
                          />
                          <span className="text-xs text-gray-500 block">Nos</span>
                        </>
                      )}
                    </td>

                    {/* Sub-item specific render for Rate - Qty handled above */}
                    <td className="px-2 py-2 text-right align-top">
                      {item.specifications?.subItems?.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {item.specifications.subItems.map((sub, sIdx) => (
                            <div key={sIdx} className="flex items-center justify-center min-h-[70px]">
                              {sub.isText ? (
                                <span className="text-gray-400 text-sm">-</span>
                              ) : (
                                <input
                                  type="number"
                                  value={sub.unitPrice || 0}
                                  onChange={(e) => updateSubItem(index, sIdx, 'unitPrice', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                  min="0"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-right"
                          min="0"
                          step="0.01"
                          required
                        />
                      )}
                    </td>

                    <td className="px-2 py-2 text-right font-medium text-gray-900 align-top">
                      {item.specifications?.subItems?.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {item.specifications.subItems.map((sub, sIdx) => (
                            <div key={sIdx} className="flex items-center justify-end min-h-[70px]">
                              {sub.isText ? (
                                <span className="text-gray-400 text-sm">-</span>
                              ) : (
                                <span className="text-xs text-gray-600">₹{(sub.amount || 0).toLocaleString('en-IN')}</span>
                              )}
                            </div>
                          ))}
                          <div className="border-t border-gray-300 pt-1 mt-1 font-bold text-sm text-gray-800 text-right">
                            ₹{(item.amount || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ) : (
                        <span>₹{(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      )}
                    </td>

                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.image}
                        onChange={(e) => updateItem(index, 'image', e.target.value)}
                        placeholder="Image URL"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      {formData.items.length > 1 && (
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800"
                          type="button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ItemSelectorModal
        isOpen={showItemSelector}
        onClose={() => {
          setShowItemSelector(false);
          setItemSelectorType(null);
        }}
        onSelect={itemSelectorType ? handleProductMaterialSelect : handleItemSelect}
        products={products}
        rawMaterials={rawMaterials}
      />
    </div >
  );
};

export default QuotationForm;
