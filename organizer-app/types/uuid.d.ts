declare module 'uuid' {
  export function v4(): string;
  export function v1(): string;
  export function v3(name: string | Buffer, namespace: string | Buffer): string;
  export function v5(name: string | Buffer, namespace: string | Buffer): string;
  export const NIL: string;
}
