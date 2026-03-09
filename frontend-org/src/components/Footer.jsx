import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-6 px-6">
      <div className="flex items-center justify-between gap-4">
        <a 
          href="https://thehustlehouseofficial.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          <p className="text-xs text-muted-foreground hover:text-primary transition-colors">
            © 2026 The Hustle House. All rights reserved.
          </p>
        </a>
        <a 
          href="https://thehustlehouseofficial.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <img 
            src="/logo/THH_Logo1.png" 
            alt="The Hustle House" 
            className="h-5 w-auto object-contain"
          />
        </a>
      </div>
    </footer>
  );
};

export default Footer;
