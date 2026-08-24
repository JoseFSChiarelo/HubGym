import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Tag,
  Text
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { FiBell, FiCheckCircle, FiFileText, FiMessageSquare, FiPlus, FiTarget } from 'react-icons/fi';
import { api } from '../services/api';

type PaymentSummary = {
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
};

type Athlete = {
  id: string;
  name: string;
  createdAt: string;
  user?: { email?: string };
};

type RecentFormResponse = {
  id: string;
  createdAt: string;
  athlete: { id: string; name: string; user?: { email?: string } };
  form: { id: string; title: string };
};

const formatCurrencyBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatTimeAgo = (date: string) => {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
};

export const PersonalDashboard = () => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0
  });
  const [recentFormResponses, setRecentFormResponses] = useState<RecentFormResponse[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      const [{ data: athletesData }, { data: paymentsData }, { data: responsesData }] = await Promise.all([
        api.get('/personal/athletes'),
        api.get('/personal/payments/summary'),
        api.get('/personal/forms/recent-responses', { params: { limit: 6 } })
      ]);

      setAthletes(athletesData || []);
      setPaymentSummary({
        paidCount: paymentsData?.paidCount ?? 0,
        pendingCount: paymentsData?.pendingCount ?? 0,
        overdueCount: paymentsData?.overdueCount ?? 0,
        paidAmount: paymentsData?.paidAmount ?? 0,
        pendingAmount: paymentsData?.pendingAmount ?? 0,
        overdueAmount: paymentsData?.overdueAmount ?? 0
      });
      setRecentFormResponses(responsesData || []);
    };

    loadDashboardData();
  }, []);

  const lastAthlete = athletes[0];

  const stats = useMemo(
    () => [
      {
        label: 'Total de alunos',
        value: String(athletes.length),
        helper: lastAthlete ? `Último: ${lastAthlete.name}` : '—'
      },
      { label: 'Treinos do dia', value: '0', helper: 'Concluídos hoje' },
      { label: 'Chats', value: '0', helper: 'Pendentes' },
      {
        label: 'Pagamentos atrasados',
        value: String(paymentSummary.overdueCount),
        helper: `${paymentSummary.paidCount} pagos • ${paymentSummary.pendingCount} pendentes`
      }
    ],
    [athletes.length, lastAthlete, paymentSummary.overdueCount, paymentSummary.paidCount, paymentSummary.pendingCount]
  );

  return (
    <Box bg="#0f0f10" color="gray.100">
      <Flex justify="space-between" align="center" mb="6">
        <Box>
          <Heading size="lg" color="white">
            Visão Geral
          </Heading>
          <Text color="gray.400">Bem-vindo de volta! Aqui está o resumo do seu dia.</Text>
        </Box>
        <HStack spacing="3">
          <Button variant="ghost" colorScheme="yellow" leftIcon={<FiBell />} />
          <Button
            color="black"
            bg="#facc15"
            _hover={{ bg: '#eab308' }}
            leftIcon={<FiPlus />}
            borderRadius="full"
            px="5"
            as={Link}
            to="/personal/clients"
          >
            Novo Aluno
          </Button>
        </HStack>
      </Flex>

      <SimpleGrid columns={[1, 2, 4]} spacing="4">
        {stats.map((s) => (
          <Box
            key={s.label}
            bg="#1c1c1f"
            p="4"
            borderRadius="xl"
            border="1px solid"
            borderColor="blackAlpha.300"
            boxShadow="lg"
          >
            <Stat>
              <StatLabel color="gray.300">{s.label}</StatLabel>
              <StatNumber color="white" fontSize="2xl">
                {s.value}
              </StatNumber>
            </Stat>
            <Text color="gray.400" fontSize="sm">
              {s.helper}
            </Text>
          </Box>
        ))}
      </SimpleGrid>

      <SimpleGrid columns={[1, null, 3]} spacing="4" mt="6">
        <Box
          bg="#1c1c1f"
          p="6"
          borderRadius="2xl"
          border="1px solid"
          borderColor="blackAlpha.300"
          boxShadow="lg"
        >
          <Heading size="sm" color="white" mb="3">
            Treinos do dia
          </Heading>
          <Flex
            h="220px"
            align="center"
            justify="center"
            bg="#151517"
            borderRadius="lg"
            p="6"
            border="1px dashed"
            borderColor="whiteAlpha.200"
          >
            <Text color="gray.400" textAlign="center">
              Ainda não há registro de treinos concluídos.
            </Text>
          </Flex>
        </Box>

        <Box
          bg="#1c1c1f"
          p="6"
          borderRadius="2xl"
          border="1px solid"
          borderColor="blackAlpha.300"
          boxShadow="lg"
        >
          <Heading size="sm" color="white" mb="3">
            Pagamentos
          </Heading>
          <Stack spacing="3">
            <Flex align="center" justify="space-between" bg="#151517" p="4" borderRadius="lg">
              <HStack spacing="3">
                <Icon as={FiCheckCircle} color="green.300" />
                <Box>
                  <Text color="white">Pagos</Text>
                  <Text fontSize="xs" color="gray.400">
                    Total recebido
                  </Text>
                </Box>
              </HStack>
              <Box textAlign="right">
                <Text color="white" fontWeight="bold">
                  {paymentSummary.paidCount}
                </Text>
                <Text fontSize="xs" color="gray.400">
                  {formatCurrencyBRL(paymentSummary.paidAmount)}
                </Text>
              </Box>
            </Flex>

            <Flex align="center" justify="space-between" bg="#151517" p="4" borderRadius="lg">
              <HStack spacing="3">
                <Icon as={FiTarget} color="yellow.300" />
                <Box>
                  <Text color="white">Pendentes</Text>
                  <Text fontSize="xs" color="gray.400">
                    Aguardando pagamento
                  </Text>
                </Box>
              </HStack>
              <Box textAlign="right">
                <Text color="white" fontWeight="bold">
                  {paymentSummary.pendingCount}
                </Text>
                <Text fontSize="xs" color="gray.400">
                  {formatCurrencyBRL(paymentSummary.pendingAmount)}
                </Text>
              </Box>
            </Flex>

            <Flex align="center" justify="space-between" bg="#151517" p="4" borderRadius="lg">
              <HStack spacing="3">
                <Icon as={FiTarget} color="red.300" />
                <Box>
                  <Text color="white">Atrasados</Text>
                  <Text fontSize="xs" color="gray.400">
                    Requer atenção
                  </Text>
                </Box>
              </HStack>
              <Box textAlign="right">
                <Text color="white" fontWeight="bold">
                  {paymentSummary.overdueCount}
                </Text>
                <Text fontSize="xs" color="gray.400">
                  {formatCurrencyBRL(paymentSummary.overdueAmount)}
                </Text>
              </Box>
            </Flex>
          </Stack>
        </Box>

        <Box
          bg="#1c1c1f"
          p="6"
          borderRadius="2xl"
          border="1px solid"
          borderColor="blackAlpha.300"
          boxShadow="lg"
        >
          <Heading size="sm" color="white" mb="3">
            Formulários
          </Heading>
          <Stack spacing="3">
            {recentFormResponses.length === 0 ? (
              <Flex
                h="220px"
                align="center"
                justify="center"
                bg="#151517"
                borderRadius="lg"
                p="6"
                border="1px dashed"
                borderColor="whiteAlpha.200"
              >
                <Text color="gray.400" textAlign="center">
                  Nenhum formulário respondido ainda.
                </Text>
              </Flex>
            ) : (
              recentFormResponses.map((item) => (
                <Flex key={item.id} align="center" gap="3" bg="#151517" p="3" borderRadius="lg">
                  <Icon as={FiFileText} color="blue.300" />
                  <Box flex="1" minW="0">
                    <Text color="white" noOfLines={1}>
                      {item.athlete?.name} respondeu: {item.form?.title}
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      {formatTimeAgo(item.createdAt)}
                    </Text>
                  </Box>
                </Flex>
              ))
            )}
          </Stack>
        </Box>
      </SimpleGrid>

      <Box
        mt="6"
        bg="#1c1c1f"
        p="6"
        borderRadius="2xl"
        border="1px solid"
        borderColor="blackAlpha.300"
        boxShadow="lg"
      >
        <Flex justify="space-between" align="center" mb="4">
          <Box>
            <Heading size="md" color="white">
              Gestão de Alunos
            </Heading>
            <Text color="gray.400">Último aluno cadastrado</Text>
          </Box>
          <Button size="sm" variant="outline" color="gray.200" borderColor="gray.600" as={Link} to="/personal/clients">
            Ver todos
          </Button>
        </Flex>

        {lastAthlete ? (
          <Flex align="center" justify="space-between" bg="#151517" p="4" borderRadius="lg">
            <HStack spacing="3">
              <Icon as={FiMessageSquare} color="yellow.300" />
              <Box>
                <Text color="white" fontWeight="bold">
                  {lastAthlete.name}
                </Text>
                <Text color="gray.400" fontSize="sm">
                  {lastAthlete.user?.email || 'Sem email'}
                </Text>
              </Box>
            </HStack>
            <Tag colorScheme="yellow">{formatTimeAgo(lastAthlete.createdAt)}</Tag>
          </Flex>
        ) : (
          <Flex
            align="center"
            justify="center"
            bg="#151517"
            p="8"
            borderRadius="lg"
            border="1px dashed"
            borderColor="whiteAlpha.200"
          >
            <Text color="gray.400">Nenhum aluno cadastrado ainda.</Text>
          </Flex>
        )}
      </Box>
    </Box>
  );
};

