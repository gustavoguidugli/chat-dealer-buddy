import { Check } from 'lucide-react';

interface Interesse {
  id: string;
  label: string;
  ordem: number;
}

interface TriagemPreviewProps {
  mensagem: string;
  interesses: Interesse[];
}

export function TriagemPreview({ mensagem, interesses }: TriagemPreviewProps) {
  const sorted = [...interesses].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="rounded-xl border-2 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 shadow-sm">
      <div className="whitespace-pre-line text-sm text-foreground leading-relaxed">
        {mensagem || 'Olá, tudo bem?\nSobre qual assunto você gostaria de falar? 🧊💧'}
      </div>

      {sorted.length > 0 && (
        <div className="mt-3 space-y-0.5">
          {sorted.map((interesse) => (
            <div key={interesse.id} className="text-sm text-foreground">
              {interesse.ordem}. {interesse.label}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-2">
        <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
          <span>12:00</span>
          <Check className="h-3 w-3 text-blue-500" />
          <Check className="h-3 w-3 text-blue-500 -ml-1.5" />
        </div>
      </div>
    </div>
  );
}
