import { Box, Flex, Heading, Text, Button } from '@radix-ui/themes';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Box py="9">
      <Flex direction="column" align="center" gap="4">
        <Heading size="8" color="gray">
          404
        </Heading>
        <Text size="4" color="gray">
          페이지를 찾을 수 없습니다
        </Text>
        <Link href="/">
          <Button variant="soft" size="3">
            홈으로 돌아가기
          </Button>
        </Link>
      </Flex>
    </Box>
  );
}
