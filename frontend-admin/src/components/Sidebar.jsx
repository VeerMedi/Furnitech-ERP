import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ items = [] }) => {
  const location = useLocation();
  
  return (
    <aside className="w-64 bg-card border-r border-border h-screen sticky top-0 shadow-sm">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-primary">Hustle House</h1>
        <p className="text-sm text-muted-foreground mt-1">Multi-Tenant Platform</p>
      </div>
      
      <nav className="px-3 py-4">
        {items.map((item, index) => {
          const isActive = location.pathname === item.path || 
                          (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={index}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-2.5 mb-0.5 rounded-md
                transition-all duration-200 font-medium text-sm
                ${isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }
              `}
            >
              {item.icon && <item.icon className="w-5 h-5" />}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
