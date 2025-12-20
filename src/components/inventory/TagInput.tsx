// src/components/inventory/TagInput.tsx
'use client';

import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ tags, onTagsChange, placeholder = 'Add tag...' }: TagInputProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        onTagsChange([...tags, input.trim()]);
      }
      setInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 p-2 bg-zinc-800 border border-red-900/20 rounded min-h-[42px]">
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-red-900/30 text-white text-sm px-2 py-1 rounded"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
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
        Tags power your storefront filters. Brand/size/condition/category tags are auto-generated and can be adjusted.
      </p>
    </div>
  );
}