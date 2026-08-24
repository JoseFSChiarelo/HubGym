import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Tag,
  Text
} from '@chakra-ui/react';
import { FiSearch, FiUploadCloud } from 'react-icons/fi';

const media = [
  { title: 'Supino Reto', tags: ['Peitoral', 'Barra'], status: 'Ativo', date: '22 Out, 2023' },
  { title: 'Agachamento Livre', tags: ['Pernas', 'Composto'], status: 'Ativo', date: '20 Out, 2023' },
  { title: 'Elevação Lateral', tags: ['Ombros', 'Halteres'], status: 'Revisão', date: '18 Out, 2023' },
  { title: 'Corrida Esteira', tags: ['Cardio'], status: 'Novo Upload', date: '18 Out, 2023' },
  { title: 'Levantamento Terra', tags: ['Costas', 'Força'], status: 'Ativo', date: '15 Out, 2023' }
];

export const AdminLibraryPage = () => {
  return (
    <Box bg="#0e0a08" color="#f8f4ef">
      <Flex justify="space-between" align="center" mb="6">
        <Box>
          <Heading size="lg" color="white">
            Biblioteca de Conteúdo
          </Heading>
          <Text color="gray.400">
            Gerencie exercícios, aprove vídeos enviados por treinadores e edite modelos de documentos como anameses e avaliações.
          </Text>
        </Box>
        <Button variant="outline" colorScheme="orange">
          Configurações da Biblioteca
        </Button>
      </Flex>

      <HStack spacing="3" mb="5">
        {['Mídia de Exercícios', 'Aprovações Pendentes', 'Modelos e Documentos'].map((tab, idx) => (
          <Button
            key={tab}
            variant="ghost"
            color={idx === 0 ? 'orange.300' : 'gray.300'}
            borderBottom={idx === 0 ? '2px solid #fba94c' : 'none'}
            borderRadius="0"
            pb="2"
          >
            {tab}
            {tab === 'Aprovações Pendentes' && (
              <Tag size="sm" ml="2" colorScheme="orange">
                3
              </Tag>
            )}
          </Button>
        ))}
      </HStack>

      <Flex gap="3" mb="6" direction={['column', null, 'row']}>
        <InputGroup maxW="420px">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="#a67c52" />
          </InputLeftElement>
          <Input placeholder="Buscar exercício, categoria ou tag..." bg="#120c0a" borderColor="gray.700" />
        </InputGroup>
        <Button variant="outline" colorScheme="orange">
          Todas Categorias
        </Button>
        <Button variant="outline" colorScheme="orange">
          Tipo: Todos
        </Button>
        <Button ml="auto" colorScheme="orange" leftIcon={<FiUploadCloud />} borderRadius="md">
          Upload de Mídia
        </Button>
      </Flex>

      <SimpleGrid columns={[1, 2, 3]} spacing="4">
        {media.map((item, idx) => (
          <Box
            key={idx}
            bg="#1b120e"
            borderRadius="xl"
            border="1px solid"
            borderColor="blackAlpha.500"
            boxShadow="lg"
            p="4"
          >
            <Box bg="#120c0a" borderRadius="md" height="140px" mb="3" />
            <Text fontWeight="bold" color="white">
              {item.title}
            </Text>
            <HStack mt="2" spacing="2">
              {item.tags.map((t) => (
                <Tag key={t} colorScheme="orange" variant="subtle">
                  {t}
                </Tag>
              ))}
            </HStack>
            <HStack mt="3" spacing="3" color="gray.300" fontSize="sm">
              <Text>{item.date}</Text>
              <Tag colorScheme={item.status === 'Revisão' ? 'yellow' : item.status === 'Novo Upload' ? 'orange' : 'green'}>
                {item.status}
              </Tag>
            </HStack>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
};
