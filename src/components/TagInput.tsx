import { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder = 'Digite e pressione Enter' }: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const tag = input.trim().toLowerCase();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs gap-1">
            {tag}
            <X className="h-3 w-3 cursor-pointer" onClick={() => onChange(value.filter((t) => t !== tag))} />
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={placeholder} />

    </div>);

}