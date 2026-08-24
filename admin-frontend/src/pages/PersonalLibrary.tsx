import { Box, Button, Flex, FormControl, FormLabel, Heading, Input, Stack, Textarea, Text, SimpleGrid } from '@chakra-ui/react';
import { useState } from 'react';

interface LibraryItem {
  name: string;
  video?: string;
  description?: string;
}

export const PersonalLibraryPage = () => {
  const [items, setItems] = useState<LibraryItem[]>([{ name: '', video: '', description: '' }]);

  const handleChange = (idx: number, field: keyof LibraryItem, value: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, { name: '', video: '', description: '' }]);

  return (
    <Stack spacing="6">
      <Box bg="white" p="6" borderRadius="lg" border="1px solid" borderColor="gray.100">
        <Heading size="md" mb="4">
          Biblioteca de exercícios
        </Heading>
        <Text color="gray.600" mb="3">
          Cadastre vídeos/descrições para reutilizar nos treinos.
        </Text>
        <SimpleGrid columns={[1, null, 2]} spacing="4">
          {items.map((it, idx) => (
            <Box key={idx} border="1px solid" borderColor="gray.200" p="4" borderRadius="md">
              <Stack spacing="3">
                <FormControl>
                  <FormLabel>Nome</FormLabel>
                  <Input value={it.name} onChange={(e) => handleChange(idx, 'name', e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Vídeo / Link</FormLabel>
                  <Input value={it.video || ''} onChange={(e) => handleChange(idx, 'video', e.target.value)} />
                </FormControl>
                <FormControl>
                  <FormLabel>Descrição</FormLabel>
                  <Textarea value={it.description || ''} onChange={(e) => handleChange(idx, 'description', e.target.value)} />
                </FormControl>
              </Stack>
            </Box>
          ))}
        </SimpleGrid>
        <Flex gap="3" mt="4">
          <Button variant="outline" onClick={addItem}>
            Adicionar exercício
          </Button>
          <Button colorScheme="blue">Salvar biblioteca (mock)</Button>
        </Flex>
      </Box>
    </Stack>
  );
};
