import type { Metadata as NextMetadata } from 'next';

declare module 'next' {
  export interface Metadata extends NextMetadata {
    'fc:frame'?: string | object; // Added object as JSON.stringify can take an object
  }
} 