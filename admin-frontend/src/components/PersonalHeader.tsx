import { Button, HStack, Text } from '@chakra-ui/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';

export const PersonalHeader = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <HStack justify="space-between" mb="6">
      <Text fontWeight="bold" fontSize="lg">
        Olá, {user?.email}
      </Text>
      <HStack spacing="3">
        <Button variant="outline" size="sm" as={Link} to="/personal">
          Voltar ao início
        </Button>
        <Button
          colorScheme="red"
          size="sm"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Sair
        </Button>
      </HStack>
    </HStack>
  );
};
