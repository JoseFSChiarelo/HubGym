import { Avatar, Box, Button, Flex, Grid, GridItem, Heading, HStack, SimpleGrid, Stack, Stat, StatLabel, StatNumber, Tag, Text } from '@chakra-ui/react';
import { FiBell, FiDownload } from 'react-icons/fi';

const statCards = [
  { label: 'Assinantes Ativos', value: '1,240', helper: '+12% vs. mês anterior' },
  { label: 'Faturamento Mensal', value: 'R$ 45.200', helper: '+5% vs. mês anterior' },
  { label: 'Novos Usuários', value: '350', helper: '+8% meta: 400' },
  { label: 'Taxa de Cancelamento', value: '2.1%', helper: '-0.5% ótimo resultado' }
];

const recent = [
  { title: 'Nova Assinatura', detail: 'Carlos M. assinou Premium', time: '2m' },
  { title: 'Pagamento Recebido', detail: 'R$ 120,00 de Julia S.', time: '15m' },
  { title: 'Cancelamento', detail: 'Roberto F. cancelou', time: '1h' },
  { title: 'Upgrade', detail: 'Ana P. para Personal', time: '3h' }
];

export const DashboardPage = () => {
  return (
    <Box bg="#0e0a08" color="#f8f4ef">
      <Flex justify="space-between" align="center" mb="4">
        <Box>
          <Heading size="lg" color="white">
            Visão Geral
          </Heading>
          <Text color="gray.400">Bem-vindo de volta, Administrador.</Text>
        </Box>
        <HStack spacing="3">
          <Button variant="ghost" colorScheme="orange" leftIcon={<FiBell />} />
          <Button leftIcon={<FiDownload />} colorScheme="orange" borderRadius="md">
            Exportar Relatório
          </Button>
        </HStack>
      </Flex>

      <Grid templateColumns={['1fr', null, '1fr']} gap="4" mb="4">
        <GridItem>
          <HStack spacing="3" wrap="wrap">
            {['Mês Atual', 'Último Trimestre', 'Ano'].map((p, idx) => (
              <Button key={p} size="sm" variant={idx === 0 ? 'solid' : 'outline'} colorScheme="orange" borderRadius="full">
                {p}
              </Button>
            ))}
            <Text color="gray.400" ml="2">
              Plano:
            </Text>
            {['Todos', 'Gratuito', 'Premium', 'Personal'].map((p, idx) => (
              <Button key={p} size="sm" variant={idx === 0 ? 'solid' : 'outline'} colorScheme="orange" borderRadius="full">
                {p}
              </Button>
            ))}
          </HStack>
        </GridItem>
      </Grid>

      <SimpleGrid columns={[1, 2, 4]} spacing="4">
        {statCards.map((s) => (
          <Box key={s.label} bg="#1b120e" p="4" borderRadius="lg" border="1px solid" borderColor="blackAlpha.500" boxShadow="lg">
            <Stat>
              <StatLabel color="gray.300">{s.label}</StatLabel>
              <StatNumber color="white">{s.value}</StatNumber>
            </Stat>
            <Text color="gray.400" fontSize="sm">
              {s.helper}
            </Text>
          </Box>
        ))}
      </SimpleGrid>

      <Grid templateColumns={['1fr', null, '2fr 1fr']} gap="4" mt="6">
        <GridItem bg="#1b120e" p="6" borderRadius="xl" border="1px solid" borderColor="blackAlpha.500" boxShadow="lg">
          <Heading size="md" mb="2" color="white">
            Receita Total
          </Heading>
          <Text color="gray.400" mb="4">
            Desempenho financeiro nos últimos 12 meses
          </Text>
          <Flex h="240px" align="flex-end" gap="3" bg="#120c0a" p="4" borderRadius="lg">
            {[40, 80, 60, 90, 110, 100, 140, 120].map((h, idx) => (
              <Box key={idx} flex="1" bg={idx === 7 ? '#fba94c' : '#8c5b3f'} borderRadius="md" height={`${h}px`} />
            ))}
          </Flex>
          <HStack mt="3" spacing="4" color="gray.400" fontSize="sm">
            {['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO'].map((m) => (
              <Text key={m}>{m}</Text>
            ))}
          </HStack>
        </GridItem>

        <GridItem bg="#1b120e" p="6" borderRadius="xl" border="1px solid" borderColor="blackAlpha.500" boxShadow="lg">
          <Heading size="sm" color="white" mb="3">
            Atividade Recente
          </Heading>
          <Stack spacing="3">
            {recent.map((item, idx) => (
              <Flex key={idx} align="center" gap="3" p="2" borderRadius="md" _hover={{ bg: '#231510' }}>
                <Avatar size="sm" name={item.title} />
                <Box flex="1">
                  <Text color="white">{item.title}</Text>
                  <Text fontSize="xs" color="gray.400">
                    {item.detail}
                  </Text>
                </Box>
                <Tag colorScheme="orange">{item.time}</Tag>
              </Flex>
            ))}
          </Stack>
          <Button mt="4" colorScheme="orange" variant="outline" borderRadius="md" w="full">
            Ver Todas as Atividades
          </Button>
        </GridItem>
      </Grid>
    </Box>
  );
};
