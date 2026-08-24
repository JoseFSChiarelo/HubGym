import type { ReactNode, CSSProperties } from 'react';
import { Avatar, Badge, Box, Flex, Icon, Link, Stack, Text } from '@chakra-ui/react';
import { NavLink, Outlet } from 'react-router-dom';
import { FiHome, FiMessageSquare, FiTarget, FiUser } from 'react-icons/fi';
import { PersonalHeader } from './PersonalHeader';
import { useAuth } from '../modules/auth/AuthContext';

const navItems = [
  { to: '/personal', label: 'Dashboard', icon: FiHome },
  { to: '/personal/clients', label: 'Aluno', icon: FiUser },
  { to: '/personal/trainings', label: 'Treino', icon: FiTarget },
  { to: '/personal/chat', label: 'Chat', icon: FiMessageSquare }
];

export const PersonalLayout = ({ children }: { children?: ReactNode }) => {
  const { user } = useAuth();

  return (
    <Flex minH="100vh" bg="#0f0f10" color="gray.100">
      <Box
        w="240px"
        bg="#121214"
        borderRight="1px solid"
        borderColor="blackAlpha.400"
        p="6"
        display="flex"
        flexDirection="column"
      >
        <Stack spacing="1" mb="8">
          <Badge colorScheme="yellow" alignSelf="flex-start" borderRadius="full" px="2" py="1">
            HubGym
          </Badge>
          <Text fontWeight="bold" color="yellow.300">
            Trainer Pro
          </Text>
        </Stack>
        <Stack spacing="1" flex="1">
          {navItems.map((item) => (
            <Link
              as={NavLink}
              key={item.to}
              to={item.to}
              style={
                (({ isActive }: { isActive: boolean }) => ({
                  textDecoration: 'none',
                  color: isActive ? '#e2e8f0' : '#cbd5e1',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? '#1f1f22' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px',
                  borderRadius: '8px'
                })) as unknown as CSSProperties
              }
              _hover={{ bg: '#1a1a1d', color: '#e2e8f0' }}
            >
              <Icon as={item.icon} />
              <Text>{item.label}</Text>
            </Link>
          ))}
        </Stack>
        <Flex align="center" gap="3" mt="10">
          <Avatar name={user?.email || 'Personal'} size="sm" />
          <Box>
            <Text fontWeight="bold" fontSize="sm">
              {user?.email || 'Personal'}
            </Text>
            <Link
              as={NavLink}
              to="/personal/profile"
              fontSize="xs"
              color="gray.400"
              _hover={{ color: 'yellow.300', textDecoration: 'none' }}
            >
              Ver perfil
            </Link>
          </Box>
        </Flex>
      </Box>
      <Box flex="1" p="8" bg="#0f0f10">
        <PersonalHeader />
        {children || <Outlet />}
      </Box>
    </Flex>
  );
};
