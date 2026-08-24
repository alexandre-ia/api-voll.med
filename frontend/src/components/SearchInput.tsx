import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SearchInputProps {
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({
  id,
  placeholder = 'Buscar...',
  ariaLabel,
  value,
  onChange,
}: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type="search"
        aria-label={ariaLabel ?? placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
}
