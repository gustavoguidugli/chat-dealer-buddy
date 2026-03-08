import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X, FileText, Loader2 } from 'lucide-react';

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
  const canPreview = isImage || isPdf;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <DialogTitle className="text-sm font-medium truncate flex-1 mr-4">
            {fileName}
          </DialogTitle>
          <div className="flex items-center gap-2 shrink-0">
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload} className="gap-1.5">
                <Download className="h-4 w-4" />
                Baixar
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-muted/10">
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
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-full border-0"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <FileText className="h-16 w-16" />
              <p className="text-sm">Pré-visualização não disponível para este tipo de arquivo.</p>
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
