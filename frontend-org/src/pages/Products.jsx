import React, { useState, useMemo, useEffect } from 'react';
import { Upload, Trash2, AlertCircle, Download, ChevronDown } from 'lucide-react';
import Button from '../components/Button';
import AddProductModal from '../components/AddProductModal';
import ProductSelectionModal from '../components/products/ProductSelectionModal';
import ProductKPICards from '../components/products/ProductKPICards';
import ProductFilters from '../components/products/ProductFilters';
import WorkstationTab from '../components/products/tabs/WorkstationTab';
import PartitionTab from '../components/products/tabs/PartitionTab';
import FoldingTableTab from '../components/products/tabs/FoldingTableTab';
import CafeTableTab from '../components/products/tabs/CafeTableTab';
import ConferenceTableTab from '../components/products/tabs/ConferenceTableTab';
import CabinTableTab from '../components/products/tabs/CabinTableTab';
import StorageTab from '../components/products/tabs/StorageTab';
import AccessoriesTab from '../components/products/tabs/AccessoriesTab';
import { productAPI } from '../services/api';
import { CATEGORIES } from '../data/productData';
import {
  filterProducts,
  calculatePriceStats,
  calculatePriceStatsByCategory,
  getUniqueValues,
} from '../utils/productUtils';
import { useAuthStore } from '../stores/authStore';
import { canEdit } from '../utils/permissions';
import { toast } from '../hooks/useToast';
import { confirm } from '../hooks/useConfirm';

const Products = () => {
  const { user } = useAuthStore();
  const canEditProducts = canEdit(user, 'products');

  const [activeTab, setActiveTab] = useState('non-sharing-ws');
  const [filters, setFilters] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  // Import states
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [lastImport, setLastImport] = useState(null);
  const [undoing, setUndoing] = useState(false);

  // Category selection states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);

  // Template dropdown state
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productAPI.getAll({ limit: 10000 });

      // Transform API data to match our format
      const transformedProducts = response.data.data.map(product => ({
        id: product._id,
        _id: product._id,
        sku: product.productCode,
        name: product.name,
        category: product.category,
        subCategory: product.subCategory,
        subcategory: product.subCategory,
        length: product.specifications?.dimensions?.width,
        width: product.specifications?.dimensions?.depth,
        height: product.specifications?.dimensions?.height,
        diameter: product.specifications?.dimensions?.width, // For round tables
        material: product.specifications?.material,
        finish: product.specifications?.finish,
        color: product.specifications?.color,
        price: product.pricing?.sellingPrice || 0,
        seats: product.specifications?.seats,
        type: product.specifications?.type,
        shape: product.specifications?.shape,
        capacity: product.specifications?.capacity,
        specs: product.specifications?.customSpecs,
        description: product.description,
        specifications: product.specifications,
        pricing: product.pricing,
        status: product.status,
      }));

      setAllProducts(transformedProducts);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchLastImport();
  }, []);

  const handleProductAdded = () => {
    // Refresh products after adding/editing
    fetchProducts();
    setEditingProduct(null);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (product) => {
    const confirmed = await confirm(
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      'Delete Product'
    );
    if (!confirmed) return;

    try {
      await productAPI.delete(product._id);
      toast.success(`Product "${product.name}" deleted successfully! ✅`);
      // Refresh products after deleting
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      toast.error(`Failed to delete product: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingProduct(null);
  };

  // Import handlers
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xls|xlsx)$/i)) {
      alert('Please select a valid Excel file (.xls or .xlsx)');
      event.target.value = '';
      return;
    }

    // Store file and show category selection modal
    setSelectedFile(file);
    setShowCategoryModal(true);
    event.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!selectedFile || !selectedCategory) {
      alert('Please select a category');
      return;
    }

    setShowCategoryModal(false);
    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', selectedCategory);

      console.log('Attempting to import file:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        category: selectedCategory
      });

      const response = await productAPI.importProducts(formData);

      console.log('Import response:', response.data);

      setImportResult({
        success: true,
        data: response.data.data,
        message: response.data.message,
        errors: response.data.errors || [],
      });

      // Manually set lastImport for the Undo banner
      if (response.data.data?.imported) {
        setLastImport({
          count: response.data.data.imported,
          importedAt: new Date().toISOString(),
          batchId: response.data.data.batchId || 'latest'
        });
      }

      await fetchProducts();
      setShowImportModal(true);
    } catch (error) {
      console.error('Import error:', error);
      console.error('Error response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Error response status:', error.response?.status);
      console.error('Error response headers:', error.response?.headers);

      // Show error message to user
      const errorMessage = error.response?.data?.message || 'Failed to import file';
      const errors = error.response?.data?.errors || [error.message];

      toast.error(`${errorMessage}\n\nFirst error: ${errors[0]}`);

      setImportResult({
        success: false,
        message: errorMessage,
        errors: errors,
      });
      setShowImportModal(true);
    } finally {
      setImporting(false);
      setSelectedFile(null);
      setSelectedCategory('');
    }
  };

  const fetchLastImport = async () => {
    try {
      const response = await productAPI.getLastImport();
      setLastImport(response.data.data);
    } catch (error) {
      // Silently handle - 404 is expected when no import history exists
      if (error.response?.status !== 404) {
        console.error('Error fetching last import:', error);
      }
      setLastImport(null);
    }
  };


  const handleUndoLastImport = async () => {
    if (!lastImport) return;

    const confirmed = await confirm(
      `Are you sure you want to delete ${lastImport.count} products imported on ${new Date(lastImport.importedAt).toLocaleString()}?\n\nThis action cannot be undone!`,
      'Undo Last Import'
    );

    if (!confirmed) return;

    try {
      setUndoing(true);
      const response = await productAPI.undoLastImport();

      toast.success(`Successfully deleted ${response.data.data.deletedCount} products from last import! ✅`);

      fetchProducts();
      fetchLastImport();
    } catch (error) {
      toast.error('Error undoing import: ' + (error.response?.data?.message || error.message));
    } finally {
      setUndoing(false);
    }
  };

  // Handle export of selected products
  const handleExportProducts = async (selectedProductIds) => {
    try {
      const response = await productAPI.exportSelectedProducts(selectedProductIds);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Get filename from response headers or use default with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `Products_Export_${timestamp}.xlsx`);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${selectedProductIds.length} products! 📊`);
    } catch (error) {
      console.error('Error exporting products:', error);
      toast.error('Failed to export products: ' + (error.response?.data?.message || error.message));
      throw error; // Re-throw to let modal handle it
    }
  };

  // Handle download template by category
  const handleDownloadTemplate = async (category = null) => {
    try {
      const response = await productAPI.downloadTemplate(category);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Filename based on category
      const filename = category
        ? `Product_Template_${category}.xlsx`
        : 'Product_Import_Template_All_Categories.xlsx';
      link.setAttribute('download', filename);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      const categoryName = category ? category.replace(/_/g, ' ') : 'All Categories';
      toast.success(`Template downloaded: ${categoryName} 📥`);
      setShowTemplateDropdown(false);
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    }
  };

  // Calculate size ranges from all products
  const sizeRanges = useMemo(() => {
    const lengths = allProducts.map(p => p.length).filter(Boolean);
    const widths = allProducts.map(p => p.width).filter(Boolean);
    const heights = allProducts.map(p => p.height).filter(Boolean);

    return {
      length: lengths.length > 0 ? { min: Math.min(...lengths), max: Math.max(...lengths) } : null,
      width: widths.length > 0 ? { min: Math.min(...widths), max: Math.max(...widths) } : null,
      height: heights.length > 0 ? { min: Math.min(...heights), max: Math.max(...heights) } : null,
    };
  }, [allProducts]);

  // Get unique categories and materials
  // Get unique categories with proper labels matching DB Enums
  const categories = [
    { value: 'NON_SHARING_WORKSTATION', label: 'Non-Sharing Workstations' },
    { value: 'SHARING_WORKSTATION', label: 'Sharing Workstations' },
    { value: 'NON_SHARING_PARTITION', label: 'Non-Sharing Partitions' },
    { value: 'SHARING_PARTITION', label: 'Sharing Partitions' },
    { value: 'FOLDING_TABLE', label: 'Folding Tables' },
    { value: 'CAFE_TABLE', label: 'Café Tables' },
    { value: 'CONFERENCE_TABLE', label: 'Conference Tables' },
    { value: 'CABIN_TABLE', label: 'Cabin Tables' },
    { value: 'STORAGE', label: 'Storage' },
    { value: 'ACCESSORIES', label: 'Accessories' },
  ];
  const materials = getUniqueValues(allProducts, 'material');
  const priceRange = useMemo(() => {
    if (allProducts.length === 0) return { min: 0, max: 100000 };
    const prices = allProducts.map(p => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [allProducts]);

  // Filter products based on current filters
  const filteredProducts = useMemo(() => {
    return filterProducts(allProducts, filters);
  }, [allProducts, filters]);

  // Calculate KPI stats from filtered products
  const totalSKUs = filteredProducts.length;
  const categoryCount = [...new Set(filteredProducts.map(p => p.category))].length;
  const priceStats = calculatePriceStats(filteredProducts);
  const statsByCategory = calculatePriceStatsByCategory(filteredProducts);

  // Category filtering helper
  const filterByCategory = (products, categoryValue) => {
    return products.filter(p => p.category === categoryValue);
  };

  // Filter products for each tab based on global filters
  const filteredNonSharingWS = useMemo(() =>
    filterProducts(filterByCategory(allProducts, 'NON_SHARING_WORKSTATION'), filters), [allProducts, filters]
  );
  const filteredSharingWS = useMemo(() =>
    filterProducts(filterByCategory(allProducts, 'SHARING_WORKSTATION'), filters), [allProducts, filters]
  );
  const filteredNonSharingPartitions = useMemo(() =>
    filterProducts(filterByCategory(allProducts, 'NON_SHARING_PARTITION'), filters), [allProducts, filters]
  );
  const filteredSharingPartitions = useMemo(() =>
    filterProducts(filterByCategory(allProducts, 'SHARING_PARTITION'), filters), [allProducts, filters]
  );
  const filteredFoldingTables = useMemo(() =>
    filterProducts(filterByCategory(allProducts, 'FOLDING_TABLE'), filters), [allProducts, filters]
  );
  const filteredCafeTables = useMemo(() =>
    filterProducts(filterByCategory(allProducts, 'CAFE_TABLE'), filters), [allProducts, filters]
  );
  const filteredConferenceTables = useMemo(() =>
    filterProducts(filterByCategory(allProducts, 'CONFERENCE_TABLE'), filters), [allProducts, filters]
  );
  const filteredCabinTables = useMemo(() =>
    filterProducts(filterByCategory(allProducts, 'CABIN_TABLE'), filters), [allProducts, filters]
  );
  const filteredStorage = useMemo(() =>
    filterProducts(filterByCategory(allProducts, 'STORAGE'), filters), [allProducts, filters]
  );
  const filteredAccessories = useMemo(() =>
    filterProducts(filterByCategory(allProducts, 'ACCESSORIES'), filters), [allProducts, filters]
  );

  const tabs = [
    { id: 'non-sharing-ws', label: 'Non-Sharing Workstations', count: filteredNonSharingWS.length },
    { id: 'sharing-ws', label: 'Sharing Workstations', count: filteredSharingWS.length },
    { id: 'non-sharing-partitions', label: 'Non-Sharing Partitions', count: filteredNonSharingPartitions.length },
    { id: 'sharing-partitions', label: 'Sharing Partitions', count: filteredSharingPartitions.length },
    { id: 'folding-tables', label: 'Folding Tables', count: filteredFoldingTables.length },
    { id: 'cafe-tables', label: 'Café Tables', count: filteredCafeTables.length },
    { id: 'conference-tables', label: 'Conference Tables', count: filteredConferenceTables.length },
    { id: 'cabin-tables', label: 'Cabin Tables', count: filteredCabinTables.length },
    { id: 'storage', label: 'Storage', count: filteredStorage.length },
    { id: 'accessories', label: 'Accessories', count: filteredAccessories.length },
  ];

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const renderTabContent = () => {
    const commonProps = {
      onEdit: canEditProducts ? handleEdit : null,
      onDelete: canEditProducts ? handleDelete : null,
    };

    switch (activeTab) {
      case 'non-sharing-ws':
        return <WorkstationTab products={filteredNonSharingWS} type="non-sharing" {...commonProps} />;
      case 'sharing-ws':
        return <WorkstationTab products={filteredSharingWS} type="sharing" {...commonProps} />;
      case 'non-sharing-partitions':
        return <PartitionTab products={filteredNonSharingPartitions} type="non-sharing" {...commonProps} />;
      case 'sharing-partitions':
        return <PartitionTab products={filteredSharingPartitions} type="sharing" {...commonProps} />;
      case 'folding-tables':
        return <FoldingTableTab products={filteredFoldingTables} {...commonProps} />;
      case 'cafe-tables':
        return <CafeTableTab products={filteredCafeTables} {...commonProps} />;
      case 'conference-tables':
        return <ConferenceTableTab products={filteredConferenceTables} {...commonProps} />;
      case 'cabin-tables':
        return <CabinTableTab products={filteredCabinTables} {...commonProps} />;
      case 'storage':
        return <StorageTab products={filteredStorage} {...commonProps} />;
      case 'accessories':
        return <AccessoriesTab products={filteredAccessories} {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive furniture products catalog and analytics
          </p>
        </div>
        <div className="flex gap-3">
          {/* Download Template Dropdown */}
          <div className="relative">
            <Button
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>

            {showTemplateDropdown && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowTemplateDropdown(false)}
                />

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-lg shadow-xl z-20 max-h-96 overflow-y-auto">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Select Category
                    </div
                    >

                    {/* All Categories Option */}
                    <button
                      onClick={() => handleDownloadTemplate()}
                      className="w-full text-left px-3 py-2 hover:bg-primary/10 rounded-md transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-primary" />
                      <div>
                        <div className="font-medium text-foreground">All Categories</div>
                        <div className="text-xs text-muted-foreground">10 categories with examples</div>
                      </div>
                    </button>

                    <div className="my-2 border-t border-border" />

                    {/* Individual Category Options */}
                    {[
                      { key: 'NON_SHARING_WORKSTATION', label: 'Non-Sharing Workstations' },
                      { key: 'SHARING_WORKSTATION', label: 'Sharing Workstations' },
                      { key: 'NON_SHARING_PARTITION', label: 'Non-Sharing Partitions' },
                      { key: 'SHARING_PARTITION', label: 'Sharing Partitions' },
                      { key: 'FOLDING_TABLE', label: 'Folding Tables' },
                      { key: 'CAFE_TABLE', label: 'Café Tables' },
                      { key: 'CONFERENCE_TABLE', label: 'Conference Tables' },
                      { key: 'CABIN_TABLE', label: 'Cabin Tables' },
                      { key: 'STORAGE', label: 'Storage' },
                      { key: 'ACCESSORIES', label: 'Accessories' },
                    ].map(category => (
                      <button
                        key={category.key}
                        onClick={() => handleDownloadTemplate(category.key)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 rounded-md transition-colors text-sm text-foreground"
                      >
                        📦 {category.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Export Products Button (replaces Download Template) */}
          <Button
            onClick={() => setShowExportModal(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Export Products
          </Button>

          {/* Import Excel Button */}
          <div className="relative">
            <input
              type="file"
              id="excel-upload"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={importing}
            />
            <Button
              onClick={() => document.getElementById('excel-upload').click()}
              disabled={importing}
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Excel
                </>
              )}
            </Button>
          </div>

          {/* Undo Last Import Button - Always visible when products exist */
            /* REMOVED as per user request - keeping only the banner version */
          }

          {canEditProducts && (
            <Button onClick={() => setIsAddModalOpen(true)}>
              + Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Undo Last Import Banner */}
      {lastImport && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 text-lg">
                  Last Import: {lastImport.count} products
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Imported on {new Date(lastImport.importedAt).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              </div>
            </div>

            <Button
              onClick={handleUndoLastImport}
              disabled={undoing}
            >
              {undoing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Undo Last Import</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <p className="text-destructive">Error loading products: {error}</p>
          <Button onClick={fetchProducts} variant="outline" className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && (
        <>
          {/* KPI Cards */}
          <ProductKPICards
            totalSKUs={totalSKUs}
            categoryCount={categoryCount}
            priceStats={priceStats}
            statsByCategory={statsByCategory}
          />

          {/* Filters */}
          <ProductFilters
            onFilterChange={handleFilterChange}
            categories={categories}
            materials={materials}
            priceRange={priceRange}
            sizeRanges={sizeRanges}
          />

          {/* Tabs */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-border bg-muted/30 overflow-x-auto">
              <div className="flex min-w-max">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                  >
                    {tab.label}
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-muted">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleProductAdded}
        product={editingProduct}
      />

      {/* Category Selection Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Select Product Category
            </h2>
            <p className="text-muted-foreground mb-6">
              Choose the category for importing products from: <span className="font-semibold text-foreground">{selectedFile?.name}</span>
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Product Category *
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Select Category --</option>
                <option value="NON_SHARING_WORKSTATION">Non-Sharing Workstations</option>
                <option value="SHARING_WORKSTATION">Sharing Workstations</option>
                <option value="NON_SHARING_PARTITION">Non-Sharing Partitions</option>
                <option value="SHARING_PARTITION">Sharing Partitions</option>
                <option value="FOLDING_TABLE">Folding Tables</option>
                <option value="CAFE_TABLE">Café Tables</option>
                <option value="CONFERENCE_TABLE">Conference Tables</option>
                <option value="CABIN_TABLE">Cabin Tables</option>
                <option value="STORAGE">Storage</option>
                <option value="ACCESSORIES">Accessories</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCategoryModal(false);
                  setSelectedFile(null);
                  setSelectedCategory('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={!selectedCategory}
                className="bg-primary text-primary-foreground"
              >
                Import Products
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Product Selection/Export Modal */}
      <ProductSelectionModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        products={allProducts}
        onExport={handleExportProducts}
      />
    </div>
  );
};

export default Products;
