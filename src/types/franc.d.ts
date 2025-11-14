declare module 'franc' {
  interface FrancOptions {
    only?: string[];
    minLength?: number;
  }

  export function franc(text: string, options?: FrancOptions): string;
  export function francAll(text: string, options?: FrancOptions): Array<{ lang: string; score: number }>;
}

