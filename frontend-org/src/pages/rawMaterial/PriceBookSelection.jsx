import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Layers, Ruler, Wrench, Wine, Shirt, Box, Hand, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';

const PriceBookSelection = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/rawmaterial/price-book/stats');
      if (response.data && response.data.data) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching price book stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    {
      id: 'PANEL',
      name: 'Panel',
      icon: Package,
      description: 'Plywood, MDF, Particle Board',
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      hoverColor: 'hover:shadow-blue-200',
    },
    {
      id: 'LAMINATE',
      name: 'Laminate',
      icon: Layers,
      description: 'Decorative Laminates, Veneers',
      gradient: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      hoverColor: 'hover:shadow-purple-200',
    },
    {
      id: 'EDGEBAND',
      name: 'Edge Band',
      icon: Ruler,
      description: 'PVC, ABS Edgebanding',
      gradient: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      hoverColor: 'hover:shadow-green-200',
    },
    {
      id: 'HARDWARE',
      name: 'Hardware',
      icon: Wrench,
      description: 'Hinges, Channels, Fittings',
      gradient: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      hoverColor: 'hover:shadow-orange-200',
    },
    {
      id: 'GLASS',
      name: 'Glass',
      icon: Wine,
      description: 'Clear, Tinted, Frosted Glass',
      gradient: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-600',
      hoverColor: 'hover:shadow-cyan-200',
    },
    {
      id: 'FABRIC',
      name: 'Fabric',
      icon: Shirt,
      description: 'Upholstery, Curtain Fabrics',
      gradient: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600',
      hoverColor: 'hover:shadow-pink-200',
    },
    {
      id: 'ALUMINIUM',
      name: 'Aluminium',
      icon: Box,
      description: 'Profiles, Sections, Frames',
      gradient: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600',
      hoverColor: 'hover:shadow-gray-200',
    },
    {
      id: 'HANDLES',
      name: 'Handles',
      icon: Hand,
      description: 'Cabinet Handles, Knobs',
      gradient: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      hoverColor: 'hover:shadow-amber-200',
    },
    {
      id: 'PROCESSED_PANEL',
      name: 'Processed Panel',
      icon: Package,
      description: 'Pre-cut, Pre-laminated Panels',
      gradient: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      hoverColor: 'hover:shadow-indigo-200',
    },
  ];

  const handleCategoryClick = (categoryId) => {
    navigate(`/raw-material/price-book/${categoryId.toLowerCase()}`);
  };

  const handleViewAll = () => {
    navigate('/raw-material/price-book/all');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Price Book</h1>
            <p className="text-lg text-gray-600">Select a category to view material prices and purchase history</p>
          </div>
          <button
            onClick={() => navigate('/raw-material')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Category Grid */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Material Category</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const Icon = category.icon;
            const categoryStats = stats.byCategory?.[category.id] || {};
            
            return (
              <Card
                key={category.id}
                className={`group cursor-pointer transition-all duration-300 hover:scale-105 ${category.hoverColor} hover:shadow-xl overflow-hidden`}
                onClick={() => handleCategoryClick(category.id)}
              >
                <div className="p-6">
                  {/* Icon Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${category.bgColor} p-4 rounded-xl transition-all duration-300 group-hover:scale-110`}>
                      <Icon className={`w-8 h-8 ${category.textColor}`} />
                    </div>
                    <ChevronRight className={`w-6 h-6 ${category.textColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  </div>

                  {/* Category Info */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{category.description}</p>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500">Materials</p>
                      <p className="text-lg font-bold text-gray-900">{categoryStats.count || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Avg Price</p>
                      <p className="text-lg font-bold text-gray-900">
                        ₹{categoryStats.avgPrice ? Math.round(categoryStats.avgPrice) : 0}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${category.bgColor} ${category.textColor}`}>
                      View →
                    </div>
                  </div>
                </div>

                {/* Gradient Bottom Border */}
                <div className={`h-1 bg-gradient-to-r ${category.gradient}`}></div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PriceBookSelection;
