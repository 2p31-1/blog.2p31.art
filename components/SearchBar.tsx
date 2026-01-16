'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TextField, Box, Text, Kbd } from '@radix-ui/themes';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

interface SearchResult {
  slug: string;
  title: string;
  excerpt: string;
}

interface SearchBarProps {
  autoFocus?: boolean;
  onClose?: () => void;
}

export function SearchBar({ autoFocus, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/posts/search?q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        setResults(data.posts || []);
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsOpen(false);
      onClose?.();
      router.push(`/?search=${encodeURIComponent(query)}`);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      onClose?.();
    }
  };

  return (
    <Box position="relative" ref={containerRef} style={{ width: '100%', maxWidth: 400 }}>
      <TextField.Root
        placeholder="검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => query.trim() && setIsOpen(true)}
        size="2"
        autoFocus={autoFocus}
      >
        <TextField.Slot>
          <MagnifyingGlassIcon height="16" width="16" />
        </TextField.Slot>
        <TextField.Slot>
          <Kbd size="1">/</Kbd>
        </TextField.Slot>
      </TextField.Root>

      {isOpen && (results.length > 0 || loading) && (
        <Box
          position="absolute"
          top="100%"
          left="0"
          right="0"
          mt="1"
          style={{
            backgroundColor: 'var(--color-panel-solid)',
            border: '1px solid var(--gray-6)',
            borderRadius: 'var(--radius-2)',
            boxShadow: 'var(--shadow-3)',
            zIndex: 100,
            maxHeight: 400,
            overflow: 'auto',
          }}
        >
          {loading ? (
            <Box p="3">
              <Text size="2" color="gray">검색 중...</Text>
            </Box>
          ) : (
            results.map((result) => (
              <Link
                key={result.slug}
                href={`/blog/${result.slug}`}
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                  onClose?.();
                }}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <Box
                  p="3"
                  style={{
                    borderBottom: '1px solid var(--gray-4)',
                    cursor: 'pointer',
                  }}
                  className="search-result-item"
                >
                  <Text as="div" size="2" weight="medium" style={{ color: 'var(--gray-12)' }}>
                    {result.title}
                  </Text>
                  {result.excerpt && (
                    <Text as="div" size="1" color="gray" mt="1">
                      {result.excerpt.substring(0, 80)}...
                    </Text>
                  )}
                </Box>
              </Link>
            ))
          )}
        </Box>
      )}
    </Box>
  );
}
