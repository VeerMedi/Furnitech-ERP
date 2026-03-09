import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Plus, Trash2, Save, Send, FileText, X } from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';
import { toast } from '../../hooks/useToast';
import ItemSelectorModal from '../../components/ItemSelectorModal';

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
    approvalStatus: 'DRAFT'
  });

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
        items: quotationData.items || [{ layoutDescription: '', description: '', quantity: 1, unit: 'Nos', unitPrice: 0, taxPerUnit: 18, amount: 0, image: '', specifications: { subItems: [] } }],
        discount: quotationData.discount || 0,
        bankDetails: (quotationData.bankDetails && quotationData.bankDetails.bankName) ? quotationData.bankDetails : DEFAULT_BANK_DETAILS,
        notes: quotationData.notes || DEFAULT_NOTES,
        emailMessage: quotationData.emailMessage || 'Dear Customer,\n\nPlease find attached the quotation as per your inquiry. We look forward to serving you.\n\nBest regards,\nVlite Furnitures',
        termsAndConditions: (quotationData.termsAndConditions && quotationData.termsAndConditions.length > 0) ? quotationData.termsAndConditions : DEFAULT_TERMS,
        approvalStatus: quotationData.approvalStatus || 'DRAFT'
      });
    } catch (err) {
      console.error('Error fetching quotation:', err);
      toast.error('Error loading quotation');
      navigate('/quotations');
    }
  };

  const calculateSummary = () => {
    let taxableAmount = 0;
    let totalTax = 0;

    formData.items.forEach(item => {
      const lineTotal = item.quantity * item.unitPrice;
      const taxAmount = (lineTotal * (item.taxPerUnit || 18)) / 100;
      taxableAmount += lineTotal;
      totalTax += taxAmount;
    });

    const cgst = totalTax / 2;
    const sgst = totalTax / 2;
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
      let combinedDescription = '';

      item.specifications.subItems.forEach((sub, idx) => {
        const subAmt = (parseFloat(sub.quantity) || 0) * (parseFloat(sub.unitPrice) || 0);
        sub.amount = subAmt;
        totalAmount += subAmt;

        // Build description for backward compatibility / search
        combinedDescription += (idx > 0 ? '\n---\n' : '') + (sub.description || '');
      });

      // Update main item aggregates
      item.quantity = 1; // logical unit for the group
      item.unitPrice = totalAmount; // total cost of the group
      item.amount = totalAmount + (totalAmount * (item.taxPerUnit || 18) / 100);
      item.description = combinedDescription;
    } else {
      // Standard single item calculation
      const lineTotal = item.quantity * item.unitPrice;
      const taxAmount = (lineTotal * (item.taxPerUnit || 18)) / 100;
      item.amount = lineTotal + taxAmount;
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
    newItems[index][field] = field === 'description' || field === 'unit' ? value : parseFloat(value) || 0;

    // Auto-calculate amount
    // Re-run calc in case it was a standard item
    const item = newItems[index];

    // Recalculate happens inside this for subItems, 
    // but for simple fields we still check
    newItems[index] = calculateLineTotals(item);

    setFormData({ ...formData, items: newItems });
  };

  const handleSave = async (status = 'DRAFT') => {
    try {
      setLoading(true);

      const payload = {
        ...formData,
        approvalStatus: status,
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

      const payload = {
        ...formData,
        approvalStatus: 'SENT',
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
      quantity: 1,
      unitPrice: newItemPrice,
      amount: newItemPrice // 1 * price
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
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

          {/* Items Table */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Items</h2>
              <Button onClick={addItem} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="px-2 py-2 text-center font-semibold text-gray-700 w-12">Sr No</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700">Layout Description</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 w-64">Description</th>
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
                        <div className="flex gap-1">
                          <div className="flex flex-col gap-2 mb-1 w-full">
                            {item.specifications?.subItems?.length > 0 ? (
                              item.specifications.subItems.map((sub, subIndex) => (
                                <div key={subIndex} className="relative group h-[96px]"> {/* Fixed height for alignment */}
                                  <textarea
                                    value={sub.description}
                                    onChange={(e) => updateSubItem(index, subIndex, 'description', e.target.value)}
                                    placeholder="Product/Material Desc"
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm h-full"
                                    required={subIndex === 0}
                                    rows="4"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeSubItem(index, subIndex)}
                                    className="absolute top-1 right-1 text-red-500 hover:text-red-700 bg-white rounded-full p-1 shadow-sm border border-gray-200 transition-colors z-10"
                                    title="Remove this item"
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
                      </td>

                      {/* Sub-item specific render for Qty/Rate */}
                      {item.specifications?.subItems?.length > 0 ? (
                        <>
                          <td className="px-2 py-2 text-center align-top">
                            <div className="flex flex-col gap-2">
                              {item.specifications.subItems.map((sub, sIdx) => (
                                <div key={sIdx} className="h-[96px] flex items-start pt-1"> {/* Matching height approx with desc area */}
                                  <input
                                    type="number"
                                    value={sub.quantity}
                                    onChange={(e) => updateSubItem(index, sIdx, 'quantity', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                    min="1"
                                  />
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right align-top">
                            <div className="flex flex-col gap-2">
                              {item.specifications.subItems.map((sub, sIdx) => (
                                <div key={sIdx} className="h-[96px] flex items-start pt-1">
                                  <input
                                    type="number"
                                    value={sub.unitPrice}
                                    onChange={(e) => updateSubItem(index, sIdx, 'unitPrice', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                    min="0"
                                  />
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right font-medium text-gray-900 align-top">
                            <div className="flex flex-col gap-2">
                              {item.specifications.subItems.map((sub, sIdx) => (
                                <div key={sIdx} className="h-[96px] flex items-start pt-2 justify-end">
                                  ₹{(sub.amount || 0).toLocaleString('en-IN')}
                                </div>
                              ))}
                              <div className="border-t border-gray-300 pt-1 mt-1 font-bold text-xs text-gray-500">
                                Total: ₹{(item.unitPrice || 0).toLocaleString('en-IN')}
                              </div>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-center"
                              min="1"
                              required
                            />
                            <span className="text-xs text-gray-500 block">Nos</span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm text-right"
                              min="0"
                              step="0.01"
                              required
                            />
                          </td>
                          <td className="px-2 py-2 text-right font-medium text-gray-900">
                            ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </>
                      )}

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
        <div className="space-y-6">
          <Card className="p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Taxable Amount</span>
                <span>₹{summary.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>CGST (9%)</span>
                <span>₹{summary.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>SGST (9%)</span>
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
        </div>
      </div>

      <ItemSelectorModal
        isOpen={showItemSelector}
        onClose={() => setShowItemSelector(false)}
        onSelect={handleItemSelect}
        products={products}
        rawMaterials={rawMaterials}
      />
    </div>
  );
};

export default QuotationForm;
