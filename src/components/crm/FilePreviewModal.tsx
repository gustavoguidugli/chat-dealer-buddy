import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FilePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string | null;
  fileName: string;
  mimeType: string;
  loading?: boolean;
  onDownload?: () => void;
}

export function FilePreviewModal({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  mimeType,
  loading,
  onDownload,
}: FilePreviewModalProps) {
  const isImage = mimeType?.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setPdfError(false);
  }, []);

  const onDocumentLoadError = useCallback(() => {
    setPdfError(true);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        setNumPages(0);
        setPageNumber(1);
        setPdfError(false);
      }
      onOpenChange(o);
    }}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <DialogTitle className="text-sm font-medium truncate flex-1 mr-4">
            {fileName}
          </DialogTitle>
          <div className="flex items-center gap-2 shrink-0">
            {isPdf && numPages > 1 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span>{pageNumber} / {numPages}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pageNumber >= numPages}
                  onClick={() => setPageNumber(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload} className="gap-1.5">
                <Download className="h-4 w-4" />
                Baixar
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/10">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Carregando arquivo...</p>
            </div>
          ) : !fileUrl ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <FileText className="h-12 w-12" />
              <p className="text-sm">Erro ao carregar arquivo</p>
            </div>
          ) : isImage ? (
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
            />
          ) : isPdf && !pdfError ? (
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">Carregando PDF...</p>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                width={Math.min(800, window.innerWidth * 0.85)}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          ) : (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <FileText className="h-16 w-16" />
              <p className="text-sm">
                {pdfError
                  ? 'Não foi possível visualizar o PDF.'
                  : 'Pré-visualização não disponível para este tipo de arquivo.'}
              </p>
              {onDownload && (
                <Button onClick={onDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  Baixar arquivo
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
