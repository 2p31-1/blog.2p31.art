'use client';

import { useState } from 'react';
import { Box, Flex, Heading, IconButton } from '@radix-ui/themes';
import { MagnifyingGlassIcon, Cross1Icon } from '@radix-ui/react-icons';
import Link from 'next/link';
import { SearchBar } from './SearchBar';
import { ThemeToggle } from './ThemeToggle';
import { config } from '@/lib/config';

export function Header() {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <Box
      py="4"
      px="4"
      style={{
        borderBottom: '1px solid var(--gray-4)',
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--color-background)',
        zIndex: 50,
      }}
    >
      <Box style={{ maxWidth: 'var(--container-3)', margin: '0 auto' }}>
        {/* Desktop Header */}
        <div className="header-desktop">
          <Flex justify="between" align="center" gap="4">
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Heading size="5" style={{ color: 'var(--gray-12)' }}>
                {config.blogName}
              </Heading>
            </Link>

            <Flex align="center" gap="3" style={{ flex: 1, maxWidth: 500, justifyContent: 'flex-end' }}>
              <SearchBar />
              <ThemeToggle />
            </Flex>
          </Flex>
        </div>

        {/* Mobile Header */}
        <div className="header-mobile">
          {mobileSearchOpen ? (
            <Flex align="center" gap="2">
              <Box style={{ flex: 1 }}>
                <SearchBar autoFocus onClose={() => setMobileSearchOpen(false)} />
              </Box>
              <IconButton
                variant="ghost"
                size="2"
                onClick={() => setMobileSearchOpen(false)}
              >
                <Cross1Icon />
              </IconButton>
            </Flex>
          ) : (
            <Flex justify="between" align="center">
              <Link href="/" style={{ textDecoration: 'none' }}>
                <Heading size="5" style={{ color: 'var(--gray-12)' }}>
                  {config.blogName}
                </Heading>
              </Link>

              <Flex align="center" gap="2">
                <IconButton
                  variant="ghost"
                  size="2"
                  onClick={() => setMobileSearchOpen(true)}
                >
                  <MagnifyingGlassIcon width="20" height="20" />
                </IconButton>
                <ThemeToggle />
              </Flex>
            </Flex>
          )}
        </div>
      </Box>
    </Box>
  );
}
