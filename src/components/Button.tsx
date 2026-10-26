import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5'
  };

  const variantStyles = {
    primary:
      'bg-[#315EFB] text-white hover:bg-[#2447C7] focus-visible:ring-[#315EFB] shadow-xs hover:shadow border border-transparent',
    secondary:
      'bg-[#F2F4F7] text-[#182230] hover:bg-[#E4E7EC] focus-visible:ring-[#667085] border border-[#E4E7EC]',
    outline:
      'bg-white text-[#182230] border border-[#E4E7EC] hover:bg-[#F7F8FA] hover:border-[#D0D5DD] focus-visible:ring-[#315EFB]',
    danger:
      'bg-[#B42318] text-white hover:bg-[#912015] focus-visible:ring-[#B42318] shadow-xs',
    ghost:
      'bg-transparent text-[#667085] hover:text-[#182230] hover:bg-[#F2F4F7] focus-visible:ring-[#667085]'
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
