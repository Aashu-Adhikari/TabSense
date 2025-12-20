import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  className = '', 
  variant = 'default',
  size = 'medium',
  disabled = false,
  loading = false,
  type = 'button',
  icon,
  fullWidth = false,
  ...props 
}) => {
  const baseClass = 'btn';
  const variantClass = `btn--${variant}`;
  const sizeClass = `btn--${size}`;
  const disabledClass = disabled || loading ? 'btn--disabled' : '';
  const widthClass = fullWidth ? 'btn--full-width' : '';
  const loadingClass = loading ? 'btn--loading' : '';
  
  return (
    <button
      type={type}
      className={`${baseClass} ${variantClass} ${sizeClass} ${disabledClass} ${widthClass} ${loadingClass} ${className}`}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="btn-spinner"></span>}
      {icon && <span className="btn-icon">{icon}</span>}
      <span className="btn-text">{children}</span>
    </button>
  );
};

export default Button;
