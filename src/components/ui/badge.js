import React from 'react';
import { cn } from '../../lib/utils';

const badgeVariantClass = {
  default: 'ui-badge--default',
  secondary: 'ui-badge--secondary',
  destructive: 'ui-badge--destructive',
  outline: 'ui-badge--outline',
};

function Badge({ className, variant, ...props }) {
  return (
    <span
      className={cn('ui-badge', badgeVariantClass[variant || 'default'], className)}
      {...props}
    />
  );
}

export { Badge };
