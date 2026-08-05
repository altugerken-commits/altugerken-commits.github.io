import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Standard shadcn/21st.dev class merger, so pulled components drop in unmodified. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
