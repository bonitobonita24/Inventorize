'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (value: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
}

export function BarcodeScanner({ onScan, onError, placeholder = 'Type or scan barcode...' }: BarcodeScannerProps) {
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<string>('barcode-reader-' + Math.random().toString(36).slice(2, 9));

  const stopScanner = useCallback(async () => {
    if (scannerRef.current !== null) {
      try {
        const state = scannerRef.current.getState();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        if (state === 2) { // Html5QrcodeScannerState.SCANNING
          await scannerRef.current.stop();
        }
      } catch {
        // Scanner may already be stopped
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setScannerError(null);
    try {
      const scanner = new Html5Qrcode(containerRef.current);
      scannerRef.current = scanner;
      setScanning(true);

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          onScan(decodedText);
          void stopScanner();
        },
        () => {
          // Ignore scan failures (frame-by-frame)
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied';
      setScannerError(message);
      onError?.(message);
      setScanning(false);
    }
  }, [onScan, onError, stopScanner]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualInput.trim();
    if (trimmed.length > 0) {
      onScan(trimmed);
      setManualInput('');
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <input
          type="text"
          value={manualInput}
          onChange={(e) => { setManualInput(e.target.value); }}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go
        </button>
        <button
          type="button"
          onClick={() => { scanning ? void stopScanner() : void startScanner(); }}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium min-w-[100px]"
        >
          {scanning ? '■ Stop' : '📷 Scan'}
        </button>
      </form>

      {scannerError !== null && (
        <p className="text-sm text-red-600">{scannerError}</p>
      )}

      <div
        id={containerRef.current}
        className={scanning ? 'rounded-lg overflow-hidden border border-border' : 'hidden'}
      />
    </div>
  );
}
