import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Stack,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { FiArrowLeft, FiFileText, FiMessageSquare } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';
import { api } from '../services/api';

type FormFieldType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'MULTIPLE_CHOICE';

type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
};

type FormRequest = {
  id: string;
  status: 'PENDING' | 'RESPONDED';
  createdAt: string;
  respondedAt?: string | null;
  form: {
    id: string;
    title: string;
    description?: string | null;
    personal?: { id: string; name: string };
    fields: FormField[];
  };
  response?: { id: string; answers: Record<string, unknown>; createdAt: string } | null;
};

type ChatMessage = {
  id: string;
  athleteId: string;
  from: 'PERSONAL' | 'ATHLETE';
  text: string;
  createdAt: string;
};

const CHAT_STORAGE_KEY = 'hubgym_personal_chat_v1';

const formatTimeAgo = (date: string) => {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `ha ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `ha ${days}d`;
};

const loadChatStore = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChatMessage[]) : [];
  } catch {
    return [];
  }
};

const saveChatStore = (messages: ChatMessage[]) => {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
};

export const AthleteChatPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const formModal = useDisclosure();
  const athleteId = user?.athleteId || '';

  const [requests, setRequests] = useState<FormRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FormRequest | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [sendingResponse, setSendingResponse] = useState(false);

  const [allMessages, setAllMessages] = useState<ChatMessage[]>(() => loadChatStore());
  const [draftMessage, setDraftMessage] = useState('');

  const loadRequests = async () => {
    setLoadingRequests(true);
    try {
      const { data } = await api.get('/athlete/forms');
      setRequests(data || []);
    } catch {
      toast({ title: 'Nao foi possivel carregar os formularios', status: 'error' });
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    saveChatStore(allMessages);
  }, [allMessages]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === CHAT_STORAGE_KEY) {
        setAllMessages(loadChatStore());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests]);

  const personalName = useMemo(() => {
    return requests.find((request) => request.form?.personal?.name)?.form?.personal?.name || 'seu personal';
  }, [requests]);

  const messagesForAthlete = useMemo(() => {
    if (!athleteId) return [];
    return allMessages
      .filter((message) => message.athleteId === athleteId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [allMessages, athleteId]);

  const openForm = (request: FormRequest) => {
    if (request.status !== 'PENDING') return;
    setSelectedRequest(request);
    const initialAnswers = request.form.fields.reduce<Record<string, unknown>>((acc, field) => {
      acc[field.id] = field.type === 'BOOLEAN' ? false : '';
      return acc;
    }, {});
    setAnswers(initialAnswers);
    formModal.onOpen();
  };

  const closeForm = () => {
    formModal.onClose();
    setSelectedRequest(null);
    setAnswers({});
  };

  const updateAnswer = (fieldId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const sendMessage = () => {
    if (!athleteId) {
      toast({ title: 'Perfil do aluno nao encontrado', status: 'warning' });
      return;
    }
    const text = draftMessage.trim();
    if (!text) return;
    setAllMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        athleteId,
        from: 'ATHLETE',
        text,
        createdAt: new Date().toISOString()
      }
    ]);
    setDraftMessage('');
  };

  const submitResponse = async () => {
    if (!selectedRequest) return;
    const missingRequired = selectedRequest.form.fields.filter((field) => {
      if (!field.required) return false;
      const value = answers[field.id];
      return value === undefined || value === null || value === '';
    });

    if (missingRequired.length > 0) {
      toast({ title: 'Preencha os campos obrigatorios', status: 'warning' });
      return;
    }

    const payload = selectedRequest.form.fields.reduce<Record<string, unknown>>((acc, field) => {
      const value = answers[field.id];
      if (field.type === 'BOOLEAN') {
        acc[field.id] = Boolean(value);
        return acc;
      }
      if (value === undefined || value === null || value === '') return acc;
      if (field.type === 'NUMBER') {
        const asNumber = typeof value === 'number' ? value : Number(value);
        if (!Number.isNaN(asNumber)) acc[field.id] = asNumber;
        return acc;
      }
      acc[field.id] = value;
      return acc;
    }, {});

    setSendingResponse(true);
    try {
      await api.post(`/athlete/forms/${selectedRequest.id}/responses`, { answers: payload });
      toast({ title: 'Formulario enviado', status: 'success' });
      closeForm();
      await loadRequests();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Nao foi possivel enviar o formulario.';
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setSendingResponse(false);
    }
  };

  return (
    <Box minH="100vh" bg="#0a0a0a" color="white" fontFamily="'Inter', system-ui, sans-serif">
      <Flex align="center" justify="space-between" px={[4, 8]} py="6" wrap="wrap" gap="3">
        <Box>
          <Heading size="lg">Chat</Heading>
          <Text color="gray.300">Converse com o seu personal e responda formularios.</Text>
        </Box>
        <Button
          leftIcon={<FiArrowLeft />}
          variant="outline"
          borderColor="orange.400"
          color="orange.300"
          _hover={{ bg: 'orange.500', color: 'black' }}
          onClick={() => navigate('/athlete')}
        >
          Voltar
        </Button>
      </Flex>

      <Box px={[4, 8]} pb="10">
        <Tabs variant="enclosed" colorScheme="orange">
          <TabList>
            <Tab>Chat</Tab>
            <Tab>Formulario</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px="0" pt="6">
              <Box
                bg="#141414"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="2xl"
                p="6"
                boxShadow="lg"
              >
                <Stack spacing="4">
                  <Flex align="center" justify="space-between" wrap="wrap" gap="3">
                    <HStack spacing="3">
                      <Box
                        w="42px"
                        h="42px"
                        borderRadius="full"
                        bg="black"
                        border="1px solid"
                        borderColor="whiteAlpha.200"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Icon as={FiMessageSquare} color="orange.300" />
                      </Box>
                      <Box>
                        <Text fontWeight="bold" fontSize="lg">
                          Conversa com {personalName}
                        </Text>
                        <Text color="gray.400" fontSize="sm">
                          Envie mensagens e tire suas duvidas do treino.
                        </Text>
                      </Box>
                    </HStack>
                  </Flex>

                  <Box
                    bg="#0f0f10"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    borderRadius="lg"
                    p="4"
                    minH="320px"
                    maxH="360px"
                    overflowY="auto"
                  >
                    {messagesForAthlete.length === 0 ? (
                      <Flex align="center" justify="center" h="280px" color="gray.400">
                        Nenhuma mensagem ainda. Envie a primeira.
                      </Flex>
                    ) : (
                      <Stack spacing="3">
                        {messagesForAthlete.map((message) => (
                          <Flex key={message.id} justify={message.from === 'ATHLETE' ? 'flex-end' : 'flex-start'}>
                            <Box
                              maxW="72%"
                              bg={message.from === 'ATHLETE' ? '#facc15' : '#1f1f22'}
                              color={message.from === 'ATHLETE' ? 'black' : 'gray.100'}
                              borderRadius="lg"
                              px="3"
                              py="2"
                            >
                              <Text fontSize="sm" whiteSpace="pre-wrap">
                                {message.text}
                              </Text>
                              <Text fontSize="xs" opacity={0.8} mt="1">
                                {formatTimeAgo(message.createdAt)}
                              </Text>
                            </Box>
                          </Flex>
                        ))}
                      </Stack>
                    )}
                  </Box>

                  <Flex mt="2" gap="3" align="flex-end">
                    <Textarea
                      placeholder="Digite uma mensagem..."
                      value={draftMessage}
                      onChange={(e) => setDraftMessage(e.target.value)}
                      bg="#0f0f10"
                      borderColor="whiteAlpha.200"
                      color="white"
                      _hover={{ borderColor: 'whiteAlpha.400' }}
                      _focus={{ borderColor: 'orange.300', boxShadow: '0 0 0 1px #f6ad55' }}
                      rows={2}
                    />
                    <Button
                      colorScheme="orange"
                      bg="orange.400"
                      color="black"
                      _hover={{ bg: 'orange.500' }}
                      onClick={sendMessage}
                    >
                      Enviar
                    </Button>
                  </Flex>

                  <Text color="gray.500" fontSize="xs">
                    * Chat ainda e local (mock). Quando tiver backend de mensagens, trocamos para persistente.
                  </Text>
                </Stack>
              </Box>
            </TabPanel>

            <TabPanel px="0" pt="6">
              <Flex align="center" justify="space-between" mb="4" gap="3" wrap="wrap">
                <HStack spacing="2">
                  <Icon as={FiFileText} color="orange.300" />
                  <Text fontWeight="bold">Formularios enviados</Text>
                </HStack>
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="orange"
                  onClick={loadRequests}
                  isLoading={loadingRequests}
                >
                  Atualizar
                </Button>
              </Flex>

              <Box
                bg="#141414"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="2xl"
                p="5"
                boxShadow="lg"
              >
                {loadingRequests ? (
                  <Flex align="center" justify="center" py="10">
                    <Spinner />
                  </Flex>
                ) : (
                  <Stack spacing="4">
                    {sortedRequests.map((request) => {
                      const isPending = request.status === 'PENDING';
                      return (
                        <Flex
                          key={request.id}
                          bg="#0f0f10"
                          border="1px solid"
                          borderColor="whiteAlpha.200"
                          borderRadius="xl"
                          p="4"
                          justify="space-between"
                          align={['flex-start', null, 'center']}
                          wrap="wrap"
                          gap="4"
                        >
                          <HStack spacing="3" align="flex-start" flex="1" minW="240px">
                            <Box
                              w="40px"
                              h="40px"
                              borderRadius="full"
                              bg="black"
                              border="1px solid"
                              borderColor="whiteAlpha.200"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Icon as={FiFileText} color="orange.300" />
                            </Box>
                            <Box>
                              <Text fontWeight="bold">{request.form?.title || 'Formulario'}</Text>
                              <Text color="gray.400" fontSize="sm">
                                {request.form?.description || 'Sem descricao.'}
                              </Text>
                              <Text color="gray.500" fontSize="xs">
                                Personal: {request.form?.personal?.name || 'Seu personal'}
                              </Text>
                            </Box>
                          </HStack>

                          <Stack align={['flex-start', null, 'flex-end']} spacing="2">
                            <Badge colorScheme={isPending ? 'orange' : 'green'} variant="subtle">
                              {isPending ? 'Pendente' : 'Respondido'}
                            </Badge>
                            <Text fontSize="xs" color="gray.500">
                              {formatTimeAgo(request.createdAt)}
                            </Text>
                            {isPending && (
                              <Button
                                size="sm"
                                colorScheme="orange"
                                bg="orange.400"
                                color="black"
                                _hover={{ bg: 'orange.500' }}
                                onClick={() => openForm(request)}
                              >
                                Responder
                              </Button>
                            )}
                          </Stack>
                        </Flex>
                      );
                    })}

                    {sortedRequests.length === 0 && (
                      <Box
                        bg="#0f0f10"
                        borderRadius="lg"
                        border="1px dashed"
                        borderColor="gray.600"
                        p="6"
                        textAlign="center"
                        color="gray.400"
                      >
                        Nenhum formulario enviado ainda.
                      </Box>
                    )}
                  </Stack>
                )}
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <Modal isOpen={formModal.isOpen} onClose={closeForm} size="xl">
        <ModalOverlay />
        <ModalContent bg="#141414" color="white" border="1px solid" borderColor="whiteAlpha.200">
          <ModalHeader>{selectedRequest?.form?.title || 'Formulario'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb="6">
            {selectedRequest ? (
              <Stack spacing="4">
                <Text color="gray.400" fontSize="sm">
                  {selectedRequest.form?.description || 'Responda as perguntas abaixo.'}
                </Text>

                <Stack spacing="4">
                  {selectedRequest.form.fields.map((field) => (
                    <FormControl key={field.id} isRequired={field.required}>
                      <FormLabel>{field.label}</FormLabel>
                      {field.type === 'TEXT' && (
                        <Textarea
                          value={(answers[field.id] as string) ?? ''}
                          onChange={(e) => updateAnswer(field.id, e.target.value)}
                          bg="#0f0f10"
                          borderColor="whiteAlpha.200"
                        />
                      )}
                      {field.type === 'NUMBER' && (
                        <Input
                          type="number"
                          value={(answers[field.id] as string | number) ?? ''}
                          onChange={(e) => updateAnswer(field.id, e.target.value)}
                          bg="#0f0f10"
                          borderColor="whiteAlpha.200"
                        />
                      )}
                      {field.type === 'MULTIPLE_CHOICE' && (
                        <Select
                          placeholder="Selecione"
                          value={(answers[field.id] as string) ?? ''}
                          onChange={(e) => updateAnswer(field.id, e.target.value)}
                          bg="#0f0f10"
                          borderColor="whiteAlpha.200"
                        >
                          {(field.options || []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </Select>
                      )}
                      {field.type === 'BOOLEAN' && (
                        <HStack spacing="3">
                          <Switch
                            isChecked={Boolean(answers[field.id])}
                            onChange={(e) => updateAnswer(field.id, e.target.checked)}
                            colorScheme="orange"
                          />
                          <Text fontSize="sm" color="gray.400">
                            {Boolean(answers[field.id]) ? 'Sim' : 'Nao'}
                          </Text>
                        </HStack>
                      )}
                    </FormControl>
                  ))}
                </Stack>

                <Button
                  colorScheme="orange"
                  bg="orange.400"
                  color="black"
                  _hover={{ bg: 'orange.500' }}
                  onClick={submitResponse}
                  isLoading={sendingResponse}
                >
                  Enviar formulario
                </Button>
              </Stack>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};
