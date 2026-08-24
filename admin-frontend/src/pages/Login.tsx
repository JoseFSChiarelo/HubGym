import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Link as ChakraLink,
  Stack,
  Text,
  useToast
} from '@chakra-ui/react';
import { FiLock, FiMail } from 'react-icons/fi';
import { useAuth } from '../modules/auth/AuthContext';

export const LoginPage = () => {
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const target = import.meta.env.VITE_CLIENT_TARGET ?? 'web';
  const isDesktopApp =
    target === 'desktop' ||
    (typeof window !== 'undefined' && window.navigator.userAgent.toLowerCase().includes('electron'));

  const modes = isDesktopApp ? (['PERSONAL', 'ADMIN'] as const) : (['PERSONAL', 'ATHLETE'] as const);
  const [mode, setMode] = useState<(typeof modes)[number]>(modes[0]);

  useEffect(() => {
    if (mode === 'ADMIN') {
      setEmail('jose04082016@gmail.com');
      setPassword('12345678');
    } else if (mode === 'PERSONAL') {
      setEmail('marioP@email.com');
      setPassword('123456');
    } else {
      // ATHLETE: não preencher para evitar credenciais genéricas
      setEmail('');
      setPassword('');
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const message = isDesktopApp
        ? 'Somente Admin e Personal podem acessar o app desktop.'
        : 'Verifique suas credenciais e tente novamente.';
      toast({
        title: 'Falha no login',
        description: message,
        status: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" w="100vw" bg="black">
      {/* Lado esquerdo com imagem */}
      <Box
        flex="1"
        bgImage="url('https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?auto=format&fit=crop&w=1500&q=80')"
        bgSize="cover"
        bgPos="center"
        position="relative"
      >
        <Box position="absolute" inset="0" bg="blackAlpha.60" />
        <Flex direction="column" justify="flex-end" h="100%" p="10" color="white" gap="2" position="relative">
          <Heading size="lg">HUBGYM</Heading>
          <Text color="yellow.300" fontWeight="bold">
            Prepare-se para a intensidade.
          </Text>
        </Flex>
      </Box>

      {/* Lado direito com formulário */}
      <Box
        flex="1"
        bgGradient="linear(to-b, #f5e44c, #e5d239, #f5e44c)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        position="relative"
        px={[6, 12]}
      >
        <Box w="full" maxW="460px" bg="whiteAlpha.0">
          <Heading size="lg" mb="2" color="gray.900">
            Bem-vindo
          </Heading>
          <Text mb="6" color="gray.700">
            Entre para continuar seu treino.
          </Text>

      <HStack
        bg="white"
        p="1"
        borderRadius="full"
        boxShadow="md"
        mb="6"
        spacing="1"
        align="stretch"
      >
        {modes.map((m) => (
          <Button
            key={m}
            flex="1"
            borderRadius="full"
            variant={mode === m ? 'solid' : 'ghost'}
            bg={mode === m ? (m === 'ADMIN' ? 'yellow.400' : 'gray.200') : 'transparent'}
            color={mode === m && m === 'ADMIN' ? 'black' : 'gray.700'}
            onClick={() => setMode(m)}
            _hover={{ bg: mode === m ? (m === 'ADMIN' ? 'yellow.500' : 'gray.300') : 'whiteAlpha.400' }}
          >
            {m === 'ADMIN' ? 'Admin' : m === 'PERSONAL' ? 'Personal Trainer' : 'Aluno/Atleta'}
          </Button>
        ))}
      </HStack>

          <form onSubmit={handleSubmit}>
            <Stack spacing="4">
              <FormControl>
                <FormLabel fontWeight="bold" color="gray.800">
                  Email {mode === 'ATHLETE' ? 'do aluno' : 'ou Telefone'}
                </FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={FiMail} color="gray.500" />
                  </InputLeftElement>
                  <Input
                    bg="white"
                    borderColor="gray.200"
                    _hover={{ borderColor: 'gray.300' }}
                    _focus={{ borderColor: 'yellow.400', boxShadow: '0 0 0 1px #facc15' }}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                  />
                </InputGroup>
              </FormControl>

              <FormControl>
                <FormLabel fontWeight="bold" color="gray.800">
                  Senha
                </FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Icon as={FiLock} color="gray.500" />
                  </InputLeftElement>
                  <Input
                    bg="white"
                    borderColor="gray.200"
                    _hover={{ borderColor: 'gray.300' }}
                    _focus={{ borderColor: 'yellow.400', boxShadow: '0 0 0 1px #facc15' }}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </InputGroup>
              </FormControl>

              <ChakraLink color="gray.600" fontSize="sm" alignSelf="flex-start">
                Esqueci minha senha
              </ChakraLink>

              <Button
                type="submit"
                size="lg"
                borderRadius="full"
                fontWeight="bold"
                isLoading={loading}
                bg="#facc15"
                color="black"
                _hover={{ bg: '#eab308' }}
                boxShadow="0 12px 32px rgba(250,204,21,0.35)"
              >
                ENTRAR
              </Button>

              <Divider />
              <Flex justify="center" gap="2" fontSize="sm" color="gray.700">
                <Text>Não tem conta?</Text>
                <ChakraLink fontWeight="bold">Registre-se agora</ChakraLink>
              </Flex>
            </Stack>
          </form>
        </Box>
      </Box>
    </Flex>
  );
};
