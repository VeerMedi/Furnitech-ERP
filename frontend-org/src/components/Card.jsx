import React from 'react';

const Card = React.forwardRef(({
  children,
  title,
  description,
  className = '',
  headerAction,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`bg-card text-card-foreground rounded-md border border-border shadow-xs hover:shadow-sm transition-shadow duration-200 ${className}`}
      {...props}
    >
      {(title || description || headerAction) && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              {title && <h3 className="text-base sm:text-lg font-semibold">{title}</h3>}
              {description && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            {headerAction && <div className="self-start sm:self-center">{headerAction}</div>}
          </div>
        </div>
      )}
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
