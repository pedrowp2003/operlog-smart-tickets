import React, { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  value?: string;
  onChange: (base64: string | undefined) => void;
  label?: string;
  className?: string;
}

export function ImageUpload({ value, onChange, label = 'Adicionar foto', className = '' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="Preview" className="w-28 h-28 rounded-lg object-cover border border-border" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center w-28 h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
          }`}
        >
          <Camera className="w-6 h-6 text-muted-foreground mb-1" />
          <span className="text-xs text-muted-foreground text-center px-1">{label}</span>
        </div>
      )}
    </div>
  );
}
