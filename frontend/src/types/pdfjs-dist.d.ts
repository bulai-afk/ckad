declare module "pdfjs-dist/build/pdf.mjs" {
  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export function getDocument(src: {
    data: ArrayBuffer | Uint8Array;
  }): {
    promise: Promise<{
      numPages: number;
      getPage: (num: number) => Promise<{
        getViewport: (params: { scale: number }) => { width: number; height: number };
        render: (params: {
          canvasContext: CanvasRenderingContext2D;
          viewport: { width: number; height: number };
        }) => { promise: Promise<unknown> };
      }>;
      destroy?: () => Promise<void>;
    }>;
    destroy?: () => Promise<void>;
  };
}
