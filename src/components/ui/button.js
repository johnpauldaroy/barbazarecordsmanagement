import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

const variantClasses = {
  default: 'ui-btn--default',
  destructive: 'ui-btn--destructive',
  outline: 'ui-btn--outline',
  secondary: 'ui-btn--secondary',
  ghost: 'ui-btn--ghost',
  link: 'ui-btn--link',
};

const sizeClasses = {
  default: 'ui-btn--md',
  sm: 'ui-btn--sm',
  lg: 'ui-btn--lg',
  icon: 'ui-btn--icon',
};

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(
        'ui-btn',
        variantClasses[variant || 'default'],
        sizeClasses[size || 'default'],
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = 'Button';

export { Button };
