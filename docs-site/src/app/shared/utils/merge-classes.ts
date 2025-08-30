import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function mergeClasses(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const transform = (value: any): boolean => {
  return value === 'false' ? false : Boolean(value);
};