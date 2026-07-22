declare module "pdf-parse/lib/pdf-parse.js" {
  function pdfParse(buffer: Buffer | Uint8Array): Promise<{
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
  }>;
  export default pdfParse;
}
