import {
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Select,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { api } from '../services/api';

type PlanStatus = 'ACTIVE' | 'LATE' | 'PENDING';

interface Personal {
  id: string;
  name: string;
  phone?: string | null;
  planStatus: PlanStatus;
  user: { email: string };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export const PersonalsListPage = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PlanStatus | ''>('');
  const [personals, setPersonals] = useState<Personal[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 10, total: 0 });
  const [selected, setSelected] = useState<Personal | null>(null);
  const drawer = useDisclosure();

  const fetchPersonals = async (page = pagination.page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admins/personals', {
        params: { page, pageSize: pagination.pageSize, status: statusFilter || undefined }
      });
      setPersonals(data.data);
      setPagination(data.pagination);
    } catch (err) {
      toast({ title: 'Erro ao carregar personais', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonals(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const openDrawer = (personal: Personal) => {
    setSelected(personal);
    drawer.onOpen();
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      await api.put(`/admins/personals/${selected.id}`, {
        name: selected.name,
        phone: selected.phone
      });
      await api.patch(`/admins/personals/${selected.id}/plan-status`, {
        planStatus: selected.planStatus
      });
      toast({ title: 'Dados atualizados', status: 'success' });
      drawer.onClose();
      fetchPersonals();
    } catch {
      toast({ title: 'Erro ao salvar', status: 'error' });
    }
  };

  const statusColor: Record<PlanStatus, string> = {
    ACTIVE: 'green',
    LATE: 'red',
    PENDING: 'orange'
  };

  return (
    <Box>
      <HStack justify="space-between" mb="4">
        <Text fontSize="2xl" fontWeight="bold">
          Personais
        </Text>
        <HStack>
          <Select
            placeholder="Filtrar status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PlanStatus | '')}
            w="200px"
          >
            <option value="ACTIVE">Ativos</option>
            <option value="LATE">Inadimplentes</option>
            <option value="PENDING">Pendentes</option>
          </Select>
          <Button onClick={() => fetchPersonals(1)}>Atualizar</Button>
        </HStack>
      </HStack>

      <Box bg="white" border="1px solid" borderColor="gray.100" rounded="lg" shadow="xs">
        <Table>
          <Thead bg="gray.50">
            <Tr>
              <Th>Nome</Th>
              <Th>Email</Th>
              <Th>Telefone</Th>
              <Th>Status</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr>
                <Td colSpan={5} textAlign="center">
                  <Spinner />
                </Td>
              </Tr>
            ) : (
              personals.map((p) => (
                <Tr key={p.id}>
                  <Td>{p.name}</Td>
                  <Td>{p.user.email}</Td>
                  <Td>{p.phone || '-'}</Td>
                  <Td>
                    <Badge colorScheme={statusColor[p.planStatus]}>{p.planStatus}</Badge>
                  </Td>
                  <Td textAlign="right">
                    <Button size="sm" variant="outline" onClick={() => openDrawer(p)}>
                      Editar
                    </Button>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Box>

      <HStack justify="flex-end" mt="4" spacing="3">
        <Text color="gray.600">
          Página {pagination.page} de {Math.max(1, Math.ceil(pagination.total / pagination.pageSize || 1))}
        </Text>
        <Button
          size="sm"
          onClick={() => fetchPersonals(Math.max(1, pagination.page - 1))}
          isDisabled={pagination.page <= 1}
        >
          Anterior
        </Button>
        <Button
          size="sm"
          onClick={() => fetchPersonals(pagination.page + 1)}
          isDisabled={pagination.page * pagination.pageSize >= pagination.total}
        >
          Próxima
        </Button>
      </HStack>

      <Drawer isOpen={drawer.isOpen} placement="right" onClose={drawer.onClose} size="md">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader>Editar Personal</DrawerHeader>
          <DrawerBody>
            {selected && (
              <Stack spacing="4">
                <FormControl>
                  <FormLabel>Nome</FormLabel>
                  <Input
                    value={selected.name}
                    onChange={(e) => setSelected({ ...selected, name: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Telefone</FormLabel>
                  <Input
                    value={selected.phone || ''}
                    onChange={(e) => setSelected({ ...selected, phone: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Status do plano</FormLabel>
                  <Select
                    value={selected.planStatus}
                    onChange={(e) =>
                      setSelected({ ...selected, planStatus: e.target.value as PlanStatus })
                    }
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="LATE">Inadimplente</option>
                    <option value="PENDING">Pendente</option>
                  </Select>
                </FormControl>
              </Stack>
            )}
          </DrawerBody>
          <DrawerFooter gap="3">
            <Button variant="ghost" onClick={drawer.onClose}>
              Cancelar
            </Button>
            <Button colorScheme="blue" onClick={handleSave}>
              Salvar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};
