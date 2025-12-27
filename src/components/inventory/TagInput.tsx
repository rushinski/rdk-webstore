// src/components/inventory/TagInput.tsx
'use client';

import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

export interface TagChip {
  label: string;
  group_key: string;
  source: 'auto' | 'custom';
}

interface TagInputProps {
  tags: TagChip[];
  onAddTag: (label: string) => void;
  onRemoveTag: (tag: TagChip) => void;
  placeholder?: string;
}

export function TagInput({ tags, onAddTag, onRemoveTag, placeholder = 'Add tag...' }: TagInputProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      onAddTag(input.trim());
      setInput('');
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 p-2 bg-zinc-800 border border-red-900/20 rounded min-h-[42px]">
        {tags.map(tag => (
          <span
            key={`${tag.group_key}:${tag.label}`}
            className={`inline-flex items-center gap-1 text-sm px-2 py-1 rounded ${
              tag.source === 'auto' ? 'bg-red-900/30 text-white' : 'bg-zinc-700 text-white'
            }`}
          >
            {tag.label}
            <button
              type="button"
              onClick={() => onRemoveTag(tag)}
              className="hover:text-red-400"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-white outline-none"
        />
      </div>
      <p className="text-gray-400 text-xs mt-1">
        Brand, model, category, condition, and size tags are auto-generated. You can remove them or add custom tags.
      </p>
    </div>
  );
}
