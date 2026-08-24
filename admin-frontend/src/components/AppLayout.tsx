import type { CSSProperties } from 'react';
import {
  Avatar,
  Box,
  Button,
  Flex,
  Icon,
  Link,
  Stack,
  Text,
  Badge
} from '@chakra-ui/react';
import { NavLink, Outlet } from 'react-router-dom';
import { FiHome, FiUsers, FiSettings, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../modules/auth/AuthContext';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: FiHome },
  { to: '/admin/subscriptions', label: 'Assinaturas', icon: FiUsers },
  { to: '/admin/library', label: 'Biblioteca', icon: FiUsers },
  { to: '/admin/personals', label: 'Usuários', icon: FiUsers },
  { to: '/admin/settings', label: 'Configurações', icon: FiSettings }
];

export const AppLayout = () => {
  const { logout, user } = useAuth();

  return (
    <Flex minH="100vh" bg="#0e0a08" color="#f8f4ef">
      <Box
        w="260px"
        bg="#130d0a"
        borderRight="1px solid"
        borderColor="blackAlpha.500"
        p="6"
        display="flex"
        flexDirection="column"
      >
        <Stack spacing="1" mb="8">
          <Badge colorScheme="orange" alignSelf="flex-start" borderRadius="full" px="2" py="1">
            HubGym Fire
          </Badge>
          <Text fontWeight="bold" color="orange.300">
            Painel Admin
          </Text>
        </Stack>
        <Stack spacing="2" flex="1">
          {navItems.map((item) => (
            <Link
              as={NavLink}
              key={item.to}
              to={item.to}
              style={
                (({ isActive }: { isActive: boolean }) => ({
                  textDecoration: 'none',
                  color: isActive ? '#0e0a08' : '#f5e7da',
                  fontWeight: isActive ? 700 : 500
                })) as unknown as CSSProperties
              }
              display="flex"
              alignItems="center"
              gap="3"
              p="3"
              borderRadius="md"
              bg={(({ isActive }: { isActive: boolean }) => (isActive ? '#fba94c' : 'transparent')) as any}
              _hover={{ bg: '#1d150f' }}
            >
              <Icon as={item.icon} />
              <Text>{item.label}</Text>
            </Link>
          ))}
        </Stack>
        <Flex align="center" gap="3" mt="10">
          <Avatar name={user?.email} size="sm" />
          <Box>
            <Text fontSize="sm" fontWeight="bold">
              {user?.email || 'Admin'}
            </Text>
            <Text fontSize="xs" color="gray.400">
              Ver perfil
            </Text>
          </Box>
        </Flex>
        <Button mt="4" variant="ghost" size="sm" leftIcon={<FiLogOut />} onClick={logout} color="gray.300">
          Sair
        </Button>
      </Box>

      <Box flex="1" p="8" bg="#0e0a08">
        <Outlet />
      </Box>
    </Flex>
  );
};
