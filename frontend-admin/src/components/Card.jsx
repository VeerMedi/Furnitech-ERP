import React from 'react';

const Card = ({ 
  children, 
  title, 
  description,
  className = '',
  headerAction,
  ...props 
}) => {
  return (
    <div 
      className={`bg-card text-card-foreground rounded-md border border-border shadow-xs hover:shadow-sm transition-shadow duration-200 ${className}`}
      {...props}
    >
      {(title || description || headerAction) && (
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              {title && <h3 className="text-lg font-semibold">{title}</h3>}
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            {headerAction && <div>{headerAction}</div>}
          </div>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;
