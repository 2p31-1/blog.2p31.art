'use client';

import { useState, useEffect } from 'react';
import { Box, Flex, Text, Badge, Button } from '@radix-ui/themes';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

interface CategoryData {
  category: string;
  count: number;
}

interface TreeNode {
  name: string;
  fullPath: string;
  count: number;
  children: TreeNode[];
}

function buildTree(categories: CategoryData[]): TreeNode[] {
  const root: TreeNode[] = [];

  // Add root category (no category)
  const rootCategory = categories.find(c => c.category === '');
  if (rootCategory && rootCategory.count > 0) {
    root.push({
      name: '분류 없음',
      fullPath: '',
      count: rootCategory.count,
      children: [],
    });
  }

  // Build tree from categories
  const categoryMap = new Map<string, TreeNode>();

  categories
    .filter(c => c.category !== '')
    .forEach(({ category, count }) => {
      const parts = category.split('/');
      let currentPath = '';

      parts.forEach((part, index) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!categoryMap.has(currentPath)) {
          const node: TreeNode = {
            name: part,
            fullPath: currentPath,
            count: 0,
            children: [],
          };
          categoryMap.set(currentPath, node);

          if (parentPath) {
            const parent = categoryMap.get(parentPath);
            if (parent) {
              parent.children.push(node);
            }
          } else {
            root.push(node);
          }
        }

        // Set count for the exact category match
        if (index === parts.length - 1) {
          const node = categoryMap.get(currentPath);
          if (node) {
            node.count = count;
          }
        }
      });
    });

  return root;
}

function TreeNodeItem({ node, level = 0 }: { node: TreeNode; level?: number }) {
  const [isOpen, setIsOpen] = useState(level < 1);
  const hasChildren = node.children.length > 0;

  return (
    <Box>
      <Flex
        align="center"
        gap="1"
        py="1"
        style={{ paddingLeft: level * 16, cursor: 'pointer' }}
      >
        {hasChildren ? (
          <Box
            onClick={() => setIsOpen(!isOpen)}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            {isOpen ? (
              <ChevronDownIcon width="14" height="14" />
            ) : (
              <ChevronRightIcon width="14" height="14" />
            )}
          </Box>
        ) : (
          <Box style={{ width: 14 }} />
        )}
        <Link
          href={`/category/${encodeURIComponent(node.fullPath)}`}
          style={{ textDecoration: 'none', flex: 1 }}
        >
          <Flex align="center" gap="2" className="category-item">
            <Text size="2" style={{ color: 'var(--gray-12)' }}>
              {node.name}
            </Text>
            {node.count > 0 && (
              <Badge size="1" variant="soft" color="gray">
                {node.count}
              </Badge>
            )}
          </Flex>
        </Link>
      </Flex>
      {hasChildren && isOpen && (
        <Box>
          {node.children.map((child) => (
            <TreeNodeItem key={child.fullPath} node={child} level={level + 1} />
          ))}
        </Box>
      )}
    </Box>
  );
}

interface CategoryTreeProps {
  defaultOpen?: boolean;
}

export function CategoryTree({ defaultOpen = false }: CategoryTreeProps) {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        setCategories(data.categories || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading categories:', err);
        setLoading(false);
      });
  }, []);

  const tree = buildTree(categories);
  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

  if (loading) {
    return null;
  }

  if (tree.length === 0) {
    return null;
  }

  return (
    <Box
      mb="4"
      p="3"
      style={{
        border: '1px solid var(--gray-4)',
        borderRadius: 'var(--radius-2)',
      }}
    >
      <Flex
        align="center"
        justify="between"
        style={{ cursor: 'pointer' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Flex align="center" gap="2">
          {isOpen ? (
            <ChevronDownIcon width="16" height="16" />
          ) : (
            <ChevronRightIcon width="16" height="16" />
          )}
          <Text size="2" weight="medium">분류</Text>
          <Badge size="1" variant="soft" color="gray">
            {totalCount}
          </Badge>
        </Flex>
      </Flex>

      {isOpen && (
        <Box mt="2">
          {tree.map((node) => (
            <TreeNodeItem key={node.fullPath || 'root'} node={node} />
          ))}
        </Box>
      )}
    </Box>
  );
}
