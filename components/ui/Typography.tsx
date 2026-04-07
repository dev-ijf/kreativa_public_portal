import React from 'react';

type Variant = 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'caption';

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: Variant;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right' | 'justify';
  color?: 'primary' | 'secondary' | 'slate-800' | 'slate-600' | 'slate-500' | 'white';
  children: React.ReactNode;
  as?: React.ElementType; // allows overriding the rendered HTML tag
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'p',
  weight,
  align = 'left',
  color = 'slate-800',
  className = '',
  children,
  as,
  ...props
}) => {
  const Component = as || (['h1', 'h2', 'h3', 'p', 'span'].includes(variant) ? variant as React.ElementType : 'p');

  const variantStyles: Record<Variant, string> = {
    h1: 'text-2xl md:text-3xl leading-tight',
    h2: 'text-xl md:text-2xl leading-snug',
    h3: 'text-lg md:text-xl leading-snug',
    p: 'text-sm md:text-base leading-relaxed',
    span: 'text-sm',
    caption: 'text-xs leading-normal',
  };

  const weightStyles = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };
  
  // Default weights per variant if not explicitly provided
  const defaultWeights: Record<Variant, keyof typeof weightStyles> = {
    h1: 'bold',
    h2: 'bold',
    h3: 'semibold',
    p: 'normal',
    span: 'normal',
    caption: 'normal',
  };

  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  };

  const colorStyles = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    'slate-800': 'text-slate-800',
    'slate-600': 'text-slate-600',
    'slate-500': 'text-slate-500',
    white: 'text-white',
  };

  const selectedWeight = weight || defaultWeights[variant];

  const combinedClasses = [
    variantStyles[variant],
    weightStyles[selectedWeight],
    alignStyles[align],
    colorStyles[color],
    className
  ].filter(Boolean).join(' ');

  return (
    <Component className={combinedClasses} {...props}>
      {children}
    </Component>
  );
};
