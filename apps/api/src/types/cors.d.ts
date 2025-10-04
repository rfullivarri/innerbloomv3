declare module 'cors' {
  import type { RequestHandler } from 'express';

  type StaticOrigin = boolean | string | RegExp | (string | RegExp)[];
  type OriginCallback = (err: Error | null, allow?: StaticOrigin) => void;

  export interface CorsOptions {
    origin?: StaticOrigin | ((origin: string | undefined, callback: OriginCallback) => void);
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
  }

  export type CorsRequestHandler = RequestHandler;

  const cors: (options?: CorsOptions) => CorsRequestHandler;
  export default cors;
}
