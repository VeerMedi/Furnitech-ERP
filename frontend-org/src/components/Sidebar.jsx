import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, GripVertical, Edit3, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../services/api';
import { toast } from '../hooks/useToast';

const Sidebar = ({ items = [], onLinkClick }) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState({});
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [orderedItems, setOrderedItems] = useState(items);

  // Load saved sidebar order from localStorage (FINAL - Works without auth issues)
  useEffect(() => {
    const loadSidebarOrder = async () => {
      try {
        const userId = localStorage.getItem('userId') || localStorage.getItem('orgUser') || 'default';
        const savedOrderJson = localStorage.getItem(`sidebarOrder_${userId}`);

        // Try to load from backend first (for cross-device sync)
        try {
          const response = await api.get('/users/preferences/sidebar');
          const backendOrder = response.data.data.sidebarOrder;

          if (backendOrder && backendOrder.length > 0) {
            // Backend has data - use it and update localStorage
            const reordered = [];
            const itemsMap = new Map(items.map(item => [item.path, item]));
            backendOrder.forEach(path => {
              if (itemsMap.has(path)) {
                reordered.push(itemsMap.get(path));
                itemsMap.delete(path);
              }
            });
            itemsMap.forEach(item => reordered.push(item));
            setOrderedItems(reordered);
            // Update localStorage to match backend
            localStorage.setItem(`sidebarOrder_${userId}`, JSON.stringify(backendOrder));
            console.log('✅ Loaded from backend and synced to localStorage');
            return;
          } else if (savedOrderJson) {
            // Backend empty but localStorage has data - sync to backend
            const savedOrder = JSON.parse(savedOrderJson);
            console.log('🔄 Syncing localStorage to backend...');
            await api.put('/users/preferences/sidebar', { sidebarOrder: savedOrder });
            console.log('✅ localStorage synced to backend');

            const reordered = [];
            const itemsMap = new Map(items.map(item => [item.path, item]));
            savedOrder.forEach(path => {
              if (itemsMap.has(path)) {
                reordered.push(itemsMap.get(path));
                itemsMap.delete(path);
              }
            });
            itemsMap.forEach(item => reordered.push(item));
            setOrderedItems(reordered);
            return;
          }
        } catch (apiError) {
          console.warn('Backend API failed, using localStorage:', apiError);
        }

        // Fallback to localStorage only
        if (savedOrderJson) {
          const savedOrder = JSON.parse(savedOrderJson);
          const reordered = [];
          const itemsMap = new Map(items.map(item => [item.path, item]));
          savedOrder.forEach(path => {
            if (itemsMap.has(path)) {
              reordered.push(itemsMap.get(path));
              itemsMap.delete(path);
            }
          });
          itemsMap.forEach(item => reordered.push(item));
          setOrderedItems(reordered);
        } else {
          setOrderedItems(items);
        }
      } catch (error) {
        console.error('Failed to load sidebar preferences:', error);
        setOrderedItems(items);
      }
    };

    loadSidebarOrder();
  }, [items]);

  // Auto-collapse menus when navigating
  useEffect(() => {
    const activeIndex = orderedItems.findIndex(item =>
      item.subItems && item.subItems.some(sub => sub.path === location.pathname)
    );

    if (activeIndex !== -1) {
      setExpandedItems({ [activeIndex]: true });
    } else {
      setExpandedItems({});
    }
  }, [location.pathname, orderedItems]);

  // Save sidebar order to BOTH backend AND localStorage (hybrid approach)
  const saveSidebarOrder = async (newOrder) => {
    const orderPaths = newOrder.map(item => item.path);
    const userId = localStorage.getItem('userId') || localStorage.getItem('orgUser') || 'default';

    // Save to localStorage immediately (instant feedback)
    try {
      localStorage.setItem(`sidebarOrder_${userId}`, JSON.stringify(orderPaths));
    } catch (e) {
      console.error('localStorage save failed:', e);
    }

    // Also try to save to backend (for sync across devices)
    try {
      await api.put('/users/preferences/sidebar', { sidebarOrder: orderPaths });
      toast.success('Sidebar order saved! ✅');
    } catch (error) {
      console.warn('Backend save failed (saved locally):', error);
      toast.success('Sidebar order saved locally! ✅');
    }
  };

  // Handle drag end
  const onDragEnd = (result) => {
    if (!result.destination || !isEditMode) return;

    const reordered = Array.from(orderedItems);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    setOrderedItems(reordered);
    saveSidebarOrder(reordered);
  };

  // Reset to default order (both localStorage and backend)
  const resetToDefault = async () => {
    setOrderedItems(items);
    const userId = localStorage.getItem('userId') || localStorage.getItem('orgUser') || 'default';

    // Clear localStorage
    try {
      localStorage.removeItem(`sidebarOrder_${userId}`);
    } catch (e) {
      console.error('localStorage clear failed:', e);
    }

    // Also clear on backend
    try {
      await api.put('/users/preferences/sidebar', { sidebarOrder: [] });
      toast.success('Sidebar reset to default! ✅');
    } catch (error) {
      console.warn('Backend reset failed (reset locally):', error);
      toast.success('Sidebar reset locally! ✅');
    }
  };

  // Get contextual animation based on menu item
  const getIconAnimation = (label, isHovered) => {
    if (!isHovered) {
      return { scale: 1, rotate: 0, x: 0, y: 0 };
    }

    // Truly unique contextual animations for each menu item
    const animations = {
      // Dashboard - Radar sweep effect
      'Dashboard': {
        rotate: [0, 360],
        scale: [1, 1.15, 1],
        transition: { duration: 2, repeat: 1, ease: "linear" }
      },

      // Customers - People gathering (expand outward)
      'Customers': {
        scale: [1, 1.3, 1],
        x: [0, 2, -2, 0],
        transition: { duration: 1.5, repeat: 1 }
      },

      // CRM - Network connection (pulsing web)
      'CRM': {
        scale: [1, 1.2, 0.9, 1.2, 1],
        rotate: [0, 10, -10, 10, 0],
        transition: { duration: 2.5 }
      },

      // Products - Stacking/Assembling furniture
      'Products': {
        y: [0, -12, -6, 0],
        scale: [1, 0.95, 1.05, 1],
        transition: { duration: 2, ease: "easeInOut" }
      },

      // Inquiries - Papers shuffling
      'Inquiries': {
        x: [0, -5, 5, -3, 0],
        y: [0, -3, 0, -2, 0],
        rotate: [0, -8, 8, -5, 0],
        transition: { duration: 1.8, ease: "easeInOut" }
      },

      // POC Assignment - Distributing/Assigning
      'POC Assignment': {
        x: [0, 8, -8, 0],
        scale: [1, 1.1, 1.1, 1],
        transition: { duration: 1.8 }
      },

      // Salesman Dashboard - Person walking/moving
      'Salesman Dashboard': {
        x: [0, 5, 0],
        y: [0, -2, 0, -2, 0],
        transition: { duration: 1.5, repeat: 1 }
      },

      // Quotations - Money counting (flip effect)
      'Quotations': {
        rotateY: [0, 180, 360],
        scale: [1, 1.1, 1],
        transition: { duration: 2 }
      },

      // Orders - Box being sealed/stamped
      'Orders': {
        scaleY: [1, 0.9, 1.1, 1],
        y: [0, 3, -3, 0],
        transition: { duration: 1.3, repeat: 1 }
      },

      // Drawing - Pen actually drawing (diagonal stroke)
      'Drawing': {
        x: [0, 15, 15, 0],
        y: [0, -15, 0, 0],
        rotate: [0, -20, -20, 0],
        transition: { duration: 2, ease: "easeInOut" }
      },

      // Machines - Gears turning (mechanical)
      'Machines': {
        rotate: [0, 360],
        scale: [1, 1.05, 1],
        transition: { duration: 3, ease: "linear" }
      },


      // Customer Insights - Graph rising
      'Customer Insights': {
        y: [5, -8, -3, -8, 5],
        scaleY: [1, 1.2, 1.1, 1.2, 1],
        transition: { duration: 2.5 }
      },

      // Production - Conveyor belt moving
      'Production': {
        x: [0, 8, 0],
        scaleX: [1, 1.1, 1],
        transition: { duration: 2, ease: "linear" }
      },

      // Transport - Truck driving (already perfect!)
      'Transport': {
        x: [0, 35, 0],
        y: [0, -2, 0, -2, 0],
        transition: { duration: 2.5, ease: "easeInOut" }
      },

      // Vendors - Store door opening
      'Vendors': {
        scaleX: [1, 0.8, 1.2, 1],
        transition: { duration: 1.5, repeat: 1 }
      },

      // Management - Organizational chart expanding
      'Management': {
        scale: [1, 1.15, 1.05, 1.15, 1],
        y: [0, -3, 0],
        transition: { duration: 2 }
      },

      // Users/Permissions - Key turning/Unlock
      'Users / Permissions': {
        rotate: [0, -25, 25, -25, 0],
        x: [0, 3, -3, 0],
        transition: { duration: 1.8 }
      },

      // Raw Material - Materials stacking/dropping
      'Raw Material': {
        y: [-15, 0, -5, 0],
        scaleY: [0.9, 1, 0.95, 1],
        transition: { duration: 2, ease: "easeOut" }
      },

      // Inventory Management - Warehouse shelves loading
      'Inventory Management': {
        scaleY: [1, 1.15, 1],
        y: [0, -5, 0],
        x: [0, 3, -3, 0],
        transition: { duration: 2.2 }
      },
    };

    return animations[label] || {
      scale: [1, 1.2, 1],
      rotate: [0, -10, 10, -5, 0],
      transition: { duration: 0.5 }
    };
  };

  const toggleExpand = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));

    // Auto-scroll to the clicked item after expanding
    setTimeout(() => {
      const element = document.querySelector(`[data-menu-index="${index}"]`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 150);
  };

  return (
    <aside className="w-64 bg-card border-r border-border h-screen sticky top-0 shadow-sm overflow-y-auto">
      <div className="p-6 border-b border-border relative">
        <a href="https://www.vlitefurnitech.com" target="_blank" rel="noopener noreferrer" className="inline-block">
          <img src="/logo/logo1.jpg" alt="Logo" className="h-34 w-auto mb-2 cursor-pointer hover:opacity-80 transition-opacity" />
        </a>
        <p className="text-sm text-muted-foreground mt-1">Organization Portal</p>

        {/* Edit Mode Toggle - Icon Only, Top Right */}
        <div className="absolute top-4 right-2 flex items-center gap-2">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md ${isEditMode
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            title={isEditMode ? 'Done editing' : 'Customize sidebar order'}
          >
            {isEditMode ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <Edit3 className="w-4 h-4" />
            )}
          </button>
          {isEditMode && (
            <button
              onClick={resetToDefault}
              className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 flex items-center justify-center transition-all shadow-md"
              title="Reset to default order"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Edit Mode Hint */}
      {isEditMode && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <p className="text-xs text-blue-700 flex items-center gap-2">
            <GripVertical className="w-3.5 h-3.5" />
            Drag items to reorder
          </p>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="sidebar" isDropDisabled={!isEditMode}>
          {(provided) => (
            <nav
              className="px-3 py-4"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {orderedItems.map((item, index) => {
                const currentPath = location.pathname;
                const itemPath = item.path;

                const isActive = currentPath === itemPath ||
                  (itemPath !== '/' && currentPath.startsWith(itemPath + '/'));

                const isExpanded = expandedItems[index] || isActive;

                return (
                  <Draggable
                    key={item.path}
                    draggableId={item.path}
                    index={index}
                    isDragDisabled={!isEditMode}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`mb-0.5 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                        data-menu-index={index}
                      >
                        {item.subItems ? (
                          <div>
                            <button
                              onClick={() => !isEditMode && toggleExpand(index)}
                              onMouseEnter={() => setHoveredIndex(index)}
                              onMouseLeave={() => setHoveredIndex(null)}
                              className={`
                                flex items-center justify-between w-full px-4 py-2.5 rounded-md
                                transition-all duration-200 font-medium text-sm
                                ${isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                }
                              `}
                            >
                              <div className="flex items-center gap-3">
                                {isEditMode && (
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing" />
                                  </div>
                                )}
                                {item.icon && (
                                  <motion.div
                                    animate={getIconAnimation(item.label, hoveredIndex === index)}
                                  >
                                    <item.icon className="w-5 h-5" />
                                  </motion.div>
                                )}
                                <span>{item.label}</span>
                              </div>
                              {!isEditMode && (
                                isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                              )}
                            </button>

                            {isExpanded && !isEditMode && (
                              <div className="ml-4 mt-1 space-y-0.5">
                                {item.subItems.map((subItem, subIndex) => {
                                  const isSubActive = location.pathname === subItem.path;
                                  return (
                                    <Link
                                      key={subIndex}
                                      to={subItem.path}
                                      onClick={onLinkClick}
                                      className={`
                                        flex items-center gap-3 px-4 py-2 rounded-md
                                        transition-all duration-200 text-sm
                                        ${isSubActive
                                          ? 'bg-primary/80 text-primary-foreground font-medium'
                                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                        }
                                      `}
                                    >
                                      <span>{subItem.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Link
                            to={isEditMode ? '#' : item.path}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            onClick={(e) => {
                              if (isEditMode) {
                                e.preventDefault();
                              } else if (onLinkClick) {
                                onLinkClick();
                              }
                            }}
                            className={`
                              flex items-center gap-3 px-4 py-2.5 rounded-md
                              transition-all duration-200 font-medium text-sm
                              ${isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                              }
                              ${isEditMode ? 'cursor-default' : ''}
                            `}
                          >
                            {isEditMode && (
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing" />
                              </div>
                            )}
                            {item.icon && (
                              <motion.div
                                animate={getIconAnimation(item.label, hoveredIndex === index)}
                              >
                                <item.icon className="w-5 h-5" />
                              </motion.div>
                            )}
                            <span>{item.label}</span>
                          </Link>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </nav>
          )}
        </Droppable>
      </DragDropContext>

      {/* Footer Logo */}
      <div className="p-6 mt-auto border-t border-border">
        <a href="https://thehustlehouseofficial.com" target="_blank" rel="noopener noreferrer" className="block">
          <img src="/logo/THH_Logo1.png" alt="The Hustle House" className="w-full h-auto object-contain cursor-pointer hover:opacity-80 transition-opacity" />
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
