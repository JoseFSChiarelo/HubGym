import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  useToast,
  Flex,
  Text
} from '@chakra-ui/react';
import { api } from '../services/api';

interface PersonalProfile {
  id: string;
  name: string;
  phone?: string | null;
  cpf?: string | null;
  cref?: string | null;
  user: { email: string };
}

export const PersonalProfilePage = () => {
  const toast = useToast();
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get('/personal/me')
      .then(({ data }) => setProfile(data))
      .catch(() => toast({ title: 'Não foi possível carregar o perfil', status: 'error' }));
  }, [toast]);

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await api.put('/personal/me', {
        name: profile.name,
        phone: profile.phone,
        cpf: profile.cpf,
        cref: profile.cref
      });
      toast({ title: 'Perfil atualizado', status: 'success' });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Erro ao salvar';
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex justify="center" mt="6">
      <Box
        w="full"
        maxW="560px"
        bg="#121214"
        color="gray.100"
        p="6"
        borderRadius="lg"
        border="1px solid"
        borderColor="blackAlpha.400"
      >
        <Heading size="lg" mb="2">
          Meu Perfil
        </Heading>
        <Text color="gray.400" mb="6">
          Atualize seus dados de contato e registro profissional.
        </Text>

        {profile && (
          <Stack spacing="4">
            <FormControl>
              <FormLabel>Nome</FormLabel>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                bg="#0f0f10"
                borderColor="whiteAlpha.200"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Telefone</FormLabel>
              <Input
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                bg="#0f0f10"
                borderColor="whiteAlpha.200"
              />
            </FormControl>
            <FormControl>
              <FormLabel>CPF</FormLabel>
              <Input
                value={profile.cpf || ''}
                onChange={(e) => setProfile({ ...profile, cpf: e.target.value })}
                bg="#0f0f10"
                borderColor="whiteAlpha.200"
              />
            </FormControl>
            <FormControl>
              <FormLabel>CREF</FormLabel>
              <Input
                value={profile.cref || ''}
                onChange={(e) => setProfile({ ...profile, cref: e.target.value })}
                bg="#0f0f10"
                borderColor="whiteAlpha.200"
              />
            </FormControl>
            <Button colorScheme="blue" onClick={handleSave} isLoading={loading} alignSelf="flex-start">
              Salvar
            </Button>
          </Stack>
        )}
      </Box>
    </Flex>
  );
};
