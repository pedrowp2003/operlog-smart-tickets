/**
 * MachineQRDialog
 * ---------------
 * Mostra o QR code de uma máquina (conteúdo = ID da máquina) e permite
 * baixar a imagem para impressão e colagem na carcaça do equipamento.
 */
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  machineId: string | null;
  label?: string;
}

export function MachineQRDialog({ open, onOpenChange, machineId, label }: Props) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!machineId || !open) { setDataUrl(''); return; }
    QRCode.toDataURL(machineId, { width: 512, margin: 2 }).then(setDataUrl).catch(() => setDataUrl(''));
  }, [machineId, open]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${(label || 'maquina').replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>QR Code da Máquina</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-3">
          {label && <p className="text-sm text-muted-foreground text-center break-words">{label}</p>}
          {dataUrl ? (
            <img src={dataUrl} alt="QR Code da máquina" className="w-64 h-64 rounded border border-border bg-white" />
          ) : (
            <div className="w-64 h-64 rounded border border-border bg-muted animate-pulse" />
          )}
          <p className="text-xs text-muted-foreground text-center">
            Imprima e cole na carcaça da máquina. Use o leitor de QR ao abrir um chamado para selecioná-la automaticamente.
          </p>
          <Button onClick={handleDownload} disabled={!dataUrl} className="w-full">
            <Download className="w-4 h-4 mr-2" /> Baixar PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}