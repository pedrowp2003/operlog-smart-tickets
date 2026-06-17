/**
 * QRScannerDialog
 * ---------------
 * Abre a câmera do dispositivo e lê um QR code. Quando um código é detectado,
 * chama `onResult` com o texto lido (esperado: ID da máquina).
 */
import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onResult: (text: string) => void;
}

const REGION_ID = 'qr-scanner-region';

export function QRScannerDialog({ open, onOpenChange, onResult }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    stoppedRef.current = false;
    let cancelled = false;

    const start = async () => {
      try {
        // Aguarda DOM montar o container
        await new Promise((r) => setTimeout(r, 50));
        if (cancelled) return;
        const el = document.getElementById(REGION_ID);
        if (!el) return;
        const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (stoppedRef.current) return;
            stoppedRef.current = true;
            onResult(decodedText);
            stop();
            onOpenChange(false);
          },
          () => { /* ignore per-frame errors */ }
        );
      } catch (err: any) {
        toast.error('Não foi possível acessar a câmera. Verifique as permissões.');
        onOpenChange(false);
      }
    };

    const stop = async () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s) return;
      try { await s.stop(); } catch {}
      try { await s.clear(); } catch {}
    };

    start();
    return () => { cancelled = true; stoppedRef.current = true; stop(); };
  }, [open, onOpenChange, onResult]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Ler QR Code da Máquina</DialogTitle></DialogHeader>
        <div id={REGION_ID} className="w-full rounded overflow-hidden bg-black min-h-[280px]" />
        <p className="text-xs text-muted-foreground text-center">
          Aponte a câmera para o QR code colado na máquina.
        </p>
      </DialogContent>
    </Dialog>
  );
}