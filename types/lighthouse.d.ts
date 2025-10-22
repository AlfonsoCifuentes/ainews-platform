/* eslint-disable */
// @ts-nocheck
declare module 'lighthouse' {
  export interface Flags {
    logLevel?: 'info' | 'error' | 'silent';
    output?: 'json' | 'html';
    onlyCategories?: string[];
    emulatedFormFactor?: string;
    throttling?: any;
  }

  export interface Result {
    lhr: any;
  }

  function launch(url: string, opts?: any): Promise<Result>;

  const defaultExport: {
    (url: string, opts?: any, config?: any): Promise<Result>;
    // Type for Flags
    Flags: Flags;
  };

  export default defaultExport;
}
