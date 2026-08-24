import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Stack,
  Tag,
  Text
} from '@chakra-ui/react';
import { FiSearch, FiTrendingUp } from 'react-icons/fi';

const summaryCards = [
  { label: 'Receita Recorrente', value: 'R$ 45.230', helper: '+5.2%' },
  { label: 'Assinaturas Ativas', value: '854', helper: '+12' },
  { label: 'Taxa de Cancelamento', value: '1.2%', helper: '+0.1%' },
  { label: 'Vencendo em 7 dias', value: '23', helper: 'Atenção necessária' }
];

const plans = [
  { name: 'Iron Plan', price: 'R$ 89,90', tag: 'Iniciante', perks: ['Acesso horário livre', 'Musculação livre'], highlight: 'outline' },
  { name: 'Burn Plan', price: 'R$ 149,90', tag: 'Mais Vendido', perks: ['Tudo do Iron', 'Aulas Coletivas', 'Convidado 2x/mês'], highlight: 'solid' },
  { name: 'Beast Mode', price: 'R$ 249,90', tag: 'Elite', perks: ['Tudo do Burn', 'Personal Trainer', 'Nutricionista'], highlight: 'outline' }
];

const clientSubs = [
  { name: 'Carlos Mendes', email: 'carlos.m@email.com', plan: 'Beast Mode', status: 'Ativo', renew: '15 Nov 2023', pay: '•••• 4242' },
  { name: 'Ana Souza', email: 'ana.souza@email.com', plan: 'Burn Plan', status: 'Vencendo', renew: 'Amanhã', pay: 'Pix' }
];

export const AdminSubscriptionsPage = () => {
  return (
    <Box bg="#0e0a08" color="#f8f4ef">
      <Flex justify="space-between" align="center" mb="6">
        <Box>
          <Heading size="lg" color="white">
            Gestão de Assinaturas
          </Heading>
          <Text color="gray.400">Monitore renovações, status e configure os planos disponíveis.</Text>
        </Box>
        <HStack spacing="3">
          <Button variant="outline" colorScheme="orange">
            Relatórios
          </Button>
          <Button colorScheme="orange" leftIcon={<FiTrendingUp />} borderRadius="md">
            Nova Assinatura
          </Button>
        </HStack>
      </Flex>

      <SimpleGrid columns={[1, 2, 4]} spacing="4" mb="6">
        {summaryCards.map((card) => (
          <Box key={card.label} bg="#1b120e" p="4" borderRadius="lg" border="1px solid" borderColor="blackAlpha.500" boxShadow="lg">
            <Text color="gray.300">{card.label}</Text>
            <Heading size="lg" color="white">
              {card.value}
            </Heading>
            <Text color={card.label === 'Taxa de Cancelamento' ? 'red.300' : 'green.300'}>{card.helper}</Text>
          </Box>
        ))}
      </SimpleGrid>

      <Flex justify="space-between" align="center" mb="3">
        <HStack>
          <Text fontWeight="bold" color="white">
            Planos Disponíveis
          </Text>
        </HStack>
        <Button variant="link" color="orange.300">
          Gerenciar Planos
        </Button>
      </Flex>

      <Grid templateColumns={['1fr', null, 'repeat(3, 1fr)']} gap="4" mb="8">
        {plans.map((plan) => (
          <GridItem
            key={plan.name}
            bg="#1b120e"
            borderRadius="xl"
            border="1px solid"
            borderColor={plan.highlight === 'solid' ? 'orange.300' : 'blackAlpha.500'}
            boxShadow="lg"
            p="6"
          >
            <Flex justify="space-between" align="center" mb="2">
              <Text color="gray.300">{plan.name}</Text>
              <Badge colorScheme="orange" variant={plan.highlight === 'solid' ? 'solid' : 'subtle'}>
                {plan.tag}
              </Badge>
            </Flex>
            <Heading size="lg" color="white">
              {plan.price}
              <Text as="span" fontSize="sm" color="gray.400" ml="1">
                /mês
              </Text>
            </Heading>
            <Stack mt="4" spacing="2" color="gray.200">
              {plan.perks.map((perk) => (
                <Text key={perk}>• {perk}</Text>
              ))}
            </Stack>
            <Button mt="6" w="full" variant={plan.highlight === 'solid' ? 'solid' : 'outline'} colorScheme="orange">
              Editar Detalhes
            </Button>
          </GridItem>
        ))}
      </Grid>

      <Box bg="#1b120e" p="6" borderRadius="xl" border="1px solid" borderColor="blackAlpha.500" boxShadow="lg">
        <Flex justify="space-between" align="center" mb="4">
          <Box>
            <Heading size="md" color="white">
              Assinaturas de Clientes
            </Heading>
          </Box>
          <HStack spacing="3">
            <InputGroup size="sm" w="260px">
              <InputLeftElement pointerEvents="none">
                <FiSearch color="#a67c52" />
              </InputLeftElement>
              <Input placeholder="Pesquisar por nome, email ou CPF..." bg="#120c0a" borderColor="gray.700" />
            </InputGroup>
            <Button size="sm" variant="solid" colorScheme="orange">
              Todos
            </Button>
            <Button size="sm" variant="outline" colorScheme="orange">
              Ativos
            </Button>
            <Button size="sm" variant="outline" colorScheme="orange">
              Vencendo
            </Button>
            <Button size="sm" variant="outline" colorScheme="orange">
              Cancelados
            </Button>
          </HStack>
        </Flex>

        <Stack spacing="3">
          {clientSubs.map((c, idx) => (
            <Flex key={idx} align="center" justify="space-between" bg="#120c0a" p="4" borderRadius="md">
              <HStack spacing="3">
                <Avatar name={c.name} size="sm" />
                <Box>
                  <Text color="white" fontWeight="bold">
                    {c.name}
                  </Text>
                  <Text color="gray.400" fontSize="sm">
                    {c.email}
                  </Text>
                </Box>
              </HStack>
              <Text color="orange.200">{c.plan}</Text>
              <Tag colorScheme={c.status === 'Ativo' ? 'green' : 'orange'}>{c.status}</Tag>
              <Text color="gray.300">{c.renew}</Text>
              <Text color="gray.300">{c.pay}</Text>
              <Button size="sm" variant="outline" colorScheme="orange">
                Cobrar
              </Button>
            </Flex>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};
