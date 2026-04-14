import { Package } from 'lucide-react';

export function FornecedoresTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Package className="w-12 h-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">Fornecedores</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Em breve você poderá cadastrar e gerenciar fornecedores por aqui.
      </p>
    </div>
  );
}
