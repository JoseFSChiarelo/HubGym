import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Textarea,
  useToast
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { api } from '../services/api';

interface ConfigPayload {
  companyName?: string | null;
  supportEmail?: string | null;
  defaultPlan?: number | null;
  terms?: string | null;
}

export const SettingsPage = () => {
  const toast = useToast();
  const [config, setConfig] = useState<ConfigPayload>({
    companyName: '',
    supportEmail: '',
    defaultPlan: undefined,
    terms: ''
  });

  useEffect(() => {
    api
      .get('/admins/config')
      .then(({ data }) => setConfig(data))
      .catch(() => toast({ title: 'Não foi possível carregar configurações', status: 'warning' }));
  }, [toast]);

  const handleSave = async () => {
    try {
      await api.put('/admins/config', config);
      toast({ title: 'Configurações salvas', status: 'success' });
    } catch {
      toast({ title: 'Erro ao salvar', status: 'error' });
    }
  };

  return (
    <Box>
      <Heading size="lg" mb="6">
        Configurações
      </Heading>

      <Box bg="white" p="6" rounded="lg" border="1px solid" borderColor="gray.100" shadow="xs">
        <Stack spacing="4">
          <FormControl>
            <FormLabel>Nome da empresa</FormLabel>
            <Input
              value={config.companyName || ''}
              onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Email de suporte</FormLabel>
            <Input
              value={config.supportEmail || ''}
              onChange={(e) => setConfig({ ...config, supportEmail: e.target.value })}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Valor padrão do plano</FormLabel>
            <Input
              type="number"
              value={config.defaultPlan ?? ''}
              onChange={(e) =>
                setConfig({ ...config, defaultPlan: e.target.value ? Number(e.target.value) : null })
              }
            />
          </FormControl>
          <FormControl>
            <FormLabel>Termos de uso / observações</FormLabel>
            <Textarea
              rows={6}
              value={config.terms || ''}
              onChange={(e) => setConfig({ ...config, terms: e.target.value })}
            />
          </FormControl>
          <Button colorScheme="blue" onClick={handleSave} alignSelf="flex-start">
            Salvar
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};
