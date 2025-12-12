import { InputHTMLAttributes, forwardRef } from 'react';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          ref={ref}
          type="checkbox"
          className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer ${className}`}
          {...props}
        />
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
          {label}
        </span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
