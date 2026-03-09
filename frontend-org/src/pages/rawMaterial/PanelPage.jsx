import React, { useState, useEffect } from 'react';
import api, { rawMaterialAPI } from '../../services/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';
import { toast } from '../../hooks/useToast';
import { confirm } from '../../hooks/useConfirm';

const PanelPage = () => {
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [specificationFields, setSpecificationFields] = useState([]); // 🚀 DYNAMIC FIELDS
  const [formData, setFormData] = useState({
    name: '',
    currentStock: '',
    uom: 'SHEET',
    costPrice: '',
    length: '',
    width: '',
    height: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    fetchMaterials();
    fetchSpecificationFields(); // 🚀 FETCH DYNAMIC COLUMNS
  }, []);

  useEffect(() => {
    const filtered = materials.filter(material =>
      material.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMaterials(filtered);
  }, [searchTerm, materials]);

  const fetchMaterials = async () => {
    try {
      const response = await api.get('/rawmaterial/category/PANEL');
      setMaterials(response.data.data);
      setFilteredMaterials(response.data.data);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const fetchSpecificationFields = async () => {
    try {
      const response = await rawMaterialAPI.getSpecificationFields();
      setSpecificationFields(response.data.data.fields || []);
      console.log('Dynamic specification fields:', response.data.data.fields);
    } catch (error) {
      console.error('Error fetching specification fields:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Submitting material data:', formData);
      const materialData = {
        name: formData.name,
        currentStock: formData.currentStock,
        uom: formData.uom,
        costPrice: formData.costPrice,
        status: formData.status,
        category: 'PANEL',
        specifications: {
          length: formData.length,
          width: formData.width,
          height: formData.height
        }
      };

      let response;
      if (editingId) {
        response = await api.put(`/rawmaterial/${editingId}`, materialData);
        console.log('Update response:', response.data);
      } else {
        response = await api.post('/rawmaterial', materialData);
        console.log('Create response:', response.data);
      }

      toast.success(editingId ? 'Material updated successfully! ✅' : 'Material added successfully! ✅');
      fetchMaterials();
      resetForm();
    } catch (error) {
      console.error('Error saving material:', error);
      console.error('Error response:', error.response?.data);
      toast.error(`Error: ${error.response?.data?.message || error.message || 'Failed to save material'}`);
    }
  };

  const handleEdit = (material) => {
    setFormData({
      name: material.name,
      currentStock: material.currentStock,
      uom: material.uom,
      costPrice: material.costPrice,
      length: material.specifications?.length || '',
      width: material.specifications?.width || '',
      height: material.specifications?.height || '',
      status: material.status,
    });
    setEditingId(material._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm(
      'Are you sure you want to delete this material?',
      'Delete Material'
    );
    if (!confirmed) return;

    try {
      await api.delete(`/rawmaterial/${id}`);
      toast.success('Material deleted successfully! ✅');
      fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Failed to delete material');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', currentStock: '', uom: 'SHEET', costPrice: '', length: '', width: '', height: '', status: 'ACTIVE' });
    setEditingId(null);
    setShowForm(false);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMaterials.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Panel Materials</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Material'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Material Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Stock"
                type="number"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                required
              />
              <Input
                label="Unit"
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                required
              />
              <Input
                label="Price"
                type="number"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                required
              />
              <Input
                label="Length"
                value={formData.length}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                placeholder="e.g., 2440mm"
              />
              <Input
                label="Width"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                placeholder="e.g., 1220mm"
              />
              <Input
                label="Height"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                placeholder="e.g., 760mm"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DISCONTINUED">Discontinued</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit">{editingId ? 'Update' : 'Add'} Material</Button>
              <Button type="button" onClick={resetForm} className="bg-gray-500 hover:bg-gray-600">Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="mb-4">
          <Input
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                {/* 🚀 DYNAMIC SPECIFICATION COLUMNS */}
                {specificationFields.map(field => (
                  <th key={field} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {field}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentItems.map((material) => (
                <tr key={material._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{material.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{material.currentStock}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{material.uom}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">₹{material.costPrice}</td>
                  {/* 🚀 DYNAMIC SPECIFICATION DATA */}
                  {specificationFields.map(field => (
                    <td key={field} className="px-6 py-4 text-sm text-gray-500">
                      {material.specifications?.[field] || '-'}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${material.status === 'In Stock' ? 'bg-green-100 text-green-800' :
                      material.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {material.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button onClick={() => handleEdit(material)} className="text-blue-600 hover:text-blue-800">Edit</button>
                    <button onClick={() => handleDelete(material._id)} className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PanelPage;
