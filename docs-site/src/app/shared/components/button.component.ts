import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { cva, type VariantProps } from 'class-variance-authority';
import { mergeClasses } from '../utils/merge-classes';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-50 dark:text-slate-900',
        destructive: 'bg-red-500 text-white hover:bg-red-600 dark:hover:bg-red-600',
        outline: 'bg-transparent border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100',
        ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-100',
        link: 'bg-transparent underline-offset-4 hover:underline text-slate-900 dark:text-slate-100',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonVariants extends VariantProps<typeof buttonVariants> {}

@Component({
  selector: 'z-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [class]="computedClass"
      [disabled]="disabled"
    >
      <ng-content></ng-content>
    </button>
  `,
  host: {
    '[class]': 'hostClass'
  }
})
export class ZardButtonComponent {
  @Input() variant: ButtonVariants['variant'] = 'default';
  @Input() size: ButtonVariants['size'] = 'default';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() class = '';
  
  get computedClass() {
    return mergeClasses(buttonVariants({ variant: this.variant, size: this.size }), this.class);
  }
  
  get hostClass() {
    return 'inline-flex';
  }
}