declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: {
      type: string;
      quality: number;
    };
    html2canvas?: {
      scale: number;
      useCORS: boolean;
      allowTaint: boolean;
      backgroundColor: string;
      [key: string]: any;
    };
    jsPDF?: {
      unit: string;
      format: string;
      orientation: string;
      [key: string]: any;
    };
    pagebreak?: {
      mode: string[];
    };
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf;
    from(element: HTMLElement): Html2Pdf;
    outputPdf(type: 'blob' | 'datauristring' | 'datauri'): Promise<Blob | string>;
    save(): Promise<void>;
    then(callback: (result: any) => void): Promise<any>;
    catch(callback: (error: Error) => void): Promise<any>;
  }

  function html2pdf(): Html2Pdf;
  export = html2pdf;
}