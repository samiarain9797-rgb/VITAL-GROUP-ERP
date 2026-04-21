import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SearchableSelect({ options, value, onChange, placeholder, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <div 
        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm flex justify-between items-center cursor-pointer focus-within:border-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={cn("truncate", value ? "text-zinc-900" : "text-zinc-500")}>{value || placeholder}</span>
        <ChevronDown size={16} className="text-zinc-400 flex-shrink-0" />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl max-h-60 flex flex-col">
          <div className="p-2 border-b border-zinc-100 flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-2.5 text-zinc-400" />
              <input
                type="text"
                className="w-full bg-zinc-50 border border-zinc-200 rounded px-8 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Search location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto p-1 flex-1">
            {filteredOptions.length === 0 ? (
              <div 
                className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded cursor-pointer font-medium"
                onClick={() => {
                  onChange(search);
                  setIsOpen(false);
                  setSearch('');
                }}
              >
                Use "{search}"
              </div>
            ) : (
              filteredOptions.map((opt, i) => (
                <div
                  key={i}
                  className="px-3 py-2 text-sm text-zinc-700 hover:bg-blue-50 hover:text-blue-700 rounded cursor-pointer truncate"
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
