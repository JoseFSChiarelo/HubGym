import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Stack,
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
import { FiBell, FiFileText, FiSearch, FiSend } from 'react-icons/fi';
import { api } from '../services/api';

type Athlete = { id: string; name: string; user?: { email?: string } };

type ChatMessage = {
  id: string;
  athleteId: string;
  from: 'PERSONAL' | 'ATHLETE';
  text: string;
  createdAt: string;
};

type FormField = {
  id: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'MULTIPLE_CHOICE';
  required?: boolean;
  options?: string[];
};

type FormResponse = {
  id: string;
  createdAt: string;
  answers: any;
  athlete: { id: string; name: string; user?: { email?: string } };
  form: { id: string; title: string; fields?: FormField[] };
};

type Notice = {
  id: string;
  title?: string | null;
  message: string;
  createdAt: string;
};

const CHAT_STORAGE_KEY = 'hubgym_personal_chat_v1';

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

const formatAnswerValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '--';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '--';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const buildAnswerItems = (response: FormResponse) => {
  const answers = (response.answers ?? {}) as Record<string, unknown>;
  const fields = response.form?.fields ?? [];

  if (fields.length > 0) {
    return fields.map((field) => ({
      id: field.id,
      label: field.label,
      value: answers[field.id]
    }));
  }

  return Object.entries(answers).map(([id, value]) => ({
    id,
    label: id,
    value
  }));
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

export const PersonalChatPage = () => {
  const toast = useToast();
  const responseModal = useDisclosure();

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');

  const [allMessages, setAllMessages] = useState<ChatMessage[]>(() => loadChatStore());
  const [draftMessage, setDraftMessage] = useState('');

  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [sendingNotice, setSendingNotice] = useState(false);

  const loadAthletes = async () => {
    setLoadingAthletes(true);
    try {
      const { data } = await api.get('/personal/athletes');
      const mapped = (data || []).map((a: any) => ({ id: a.id, name: a.name, user: a.user }));
      setAthletes(mapped);
      if (!selectedAthleteId && mapped.length > 0) setSelectedAthleteId(mapped[0].id);
    } catch {
      toast({ title: 'Não foi possível carregar os alunos', status: 'error' });
    } finally {
      setLoadingAthletes(false);
    }
  };

  const loadRecentResponses = async () => {
    setLoadingResponses(true);
    try {
      const { data } = await api.get('/personal/forms/recent-responses', { params: { limit: 50 } });
      setResponses(data || []);
    } catch {
      toast({ title: 'Não foi possível carregar os formulários respondidos', status: 'error' });
    } finally {
      setLoadingResponses(false);
    }
  };

  const loadNotices = async () => {
    setLoadingNotices(true);
    try {
      const { data } = await api.get('/personal/notices', { params: { limit: 20 } });
      setNotices(data || []);
    } catch {
      toast({ title: 'Nao foi possivel carregar os avisos', status: 'error' });
    } finally {
      setLoadingNotices(false);
    }
  };

  useEffect(() => {
    loadAthletes();
    loadRecentResponses();
    loadNotices();
  }, []);

  useEffect(() => {
    saveChatStore(allMessages);
  }, [allMessages]);

  const filteredAthletes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter((a) => (a.name || '').toLowerCase().includes(q) || (a.user?.email || '').toLowerCase().includes(q));
  }, [athletes, search]);

  const messagesForSelectedAthlete = useMemo(() => {
    if (!selectedAthleteId) return [];
    return allMessages
      .filter((m) => m.athleteId === selectedAthleteId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [allMessages, selectedAthleteId]);

  const lastMessageByAthlete = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const msg of allMessages) {
      const prev = map.get(msg.athleteId);
      if (!prev || new Date(msg.createdAt).getTime() > new Date(prev.createdAt).getTime()) map.set(msg.athleteId, msg);
    }
    return map;
  }, [allMessages]);

  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.id === selectedAthleteId) || null,
    [athletes, selectedAthleteId]
  );

  const sendMessage = () => {
    if (!selectedAthleteId) {
      toast({ title: 'Selecione um aluno para conversar', status: 'warning' });
      return;
    }
    const text = draftMessage.trim();
    if (!text) return;
    setAllMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, athleteId: selectedAthleteId, from: 'PERSONAL', text, createdAt: new Date().toISOString() }
    ]);
    setDraftMessage('');
  };

  const sendNotice = async () => {
    const message = noticeMessage.trim();
    const title = noticeTitle.trim();

    if (!message) {
      toast({ title: 'Informe a mensagem do aviso', status: 'warning' });
      return;
    }

    setSendingNotice(true);
    try {
      await api.post('/personal/notices', {
        title: title ? title : undefined,
        message
      });
      toast({ title: 'Aviso enviado', status: 'success' });
      setNoticeTitle('');
      setNoticeMessage('');
      await loadNotices();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Nao foi possivel enviar o aviso.';
      toast({ title: 'Erro', description: msg, status: 'error' });
    } finally {
      setSendingNotice(false);
    }
  };

  const filteredResponses = useMemo(() => {
    if (!selectedAthleteId) return responses;
    return responses.filter((r) => r.athlete?.id === selectedAthleteId);
  }, [responses, selectedAthleteId]);

  const openResponse = async (response: FormResponse) => {
    setSelectedResponse(response);
    responseModal.onOpen();

    if (!response.form?.id) return;
    if (response.form?.fields && response.form.fields.length > 0) return;

    try {
      const { data } = await api.get(`/personal/forms/${response.form.id}`);
      const fields = Array.isArray(data?.fields) ? data.fields : [];
      if (fields.length === 0) return;
      setSelectedResponse((prev) => {
        if (!prev || prev.id !== response.id) return prev;
        return { ...prev, form: { ...prev.form, fields } };
      });
    } catch {
      // Mantem o fallback com IDs caso nao consiga carregar os campos.
    }
  };

  const answerItems = selectedResponse ? buildAnswerItems(selectedResponse) : [];

  return (
    <Flex gap="6" direction={['column', null, 'row']} bg="#0f0f10" color="gray.100">
      <Box
        w={['full', null, '320px']}
        bg="#18181b"
        p="5"
        borderRadius="xl"
        border="1px solid"
        borderColor="blackAlpha.300"
        boxShadow="lg"
        h="fit-content"
      >
        <Heading size="md" color="white" mb="2">
          Conversas
        </Heading>
        <Text color="gray.400" fontSize="sm" mb="4">
          Pesquise alunos para iniciar ou entrar em uma conversa.
        </Text>

        <InputGroup mb="3">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="#888" />
          </InputLeftElement>
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            bg="#0f0f10"
            borderColor="blackAlpha.400"
            color="gray.100"
            _hover={{ borderColor: 'gray.500' }}
            _focus={{ borderColor: 'yellow.400', boxShadow: '0 0 0 1px #facc15' }}
          />
        </InputGroup>

        {loadingAthletes ? (
          <Flex align="center" justify="center" py="10">
            <Spinner />
          </Flex>
        ) : (
          <Stack spacing="2" maxH={['auto', null, '520px']} overflowY="auto">
            {filteredAthletes.map((a) => {
              const last = lastMessageByAthlete.get(a.id);
              const isActive = a.id === selectedAthleteId;
              return (
                <Button
                  key={a.id}
                  onClick={() => setSelectedAthleteId(a.id)}
                  justifyContent="flex-start"
                  variant="ghost"
                  bg={isActive ? '#1f1f22' : 'transparent'}
                  _hover={{ bg: '#1f1f22' }}
                  p="3"
                  borderRadius="lg"
                  h="auto"
                >
                  <HStack spacing="3" w="full" align="flex-start">
                    <Avatar name={a.name} size="sm" />
                    <Box textAlign="left" flex="1" minW="0">
                      <Flex justify="space-between" align="center" gap="2">
                        <Text fontWeight="bold" color="white" noOfLines={1}>
                          {a.name}
                        </Text>
                        {last && (
                          <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">
                            {formatTimeAgo(last.createdAt)}
                          </Text>
                        )}
                      </Flex>
                      <Text fontSize="xs" color="gray.400" noOfLines={1}>
                        {a.user?.email || 'Sem email'}
                      </Text>
                      <Text fontSize="xs" color="gray.500" noOfLines={1}>
                        {last ? (last.from === 'PERSONAL' ? `Você: ${last.text}` : last.text) : 'Sem mensagens ainda'}
                      </Text>
                    </Box>
                  </HStack>
                </Button>
              );
            })}

            {filteredAthletes.length === 0 && (
              <Box
                bg="#0f0f10"
                borderRadius="lg"
                border="1px dashed"
                borderColor="gray.600"
                p="6"
                textAlign="center"
                color="gray.400"
              >
                Nenhum aluno encontrado.
              </Box>
            )}
          </Stack>
        )}
      </Box>

      <Box
        flex="1"
        bg="#18181b"
        p="6"
        borderRadius="xl"
        border="1px solid"
        borderColor="blackAlpha.300"
        boxShadow="lg"
      >
        <Flex justify="space-between" align="center" mb="4" gap="3" wrap="wrap">
          <Box>
            <Heading size="md" color="white">
              {selectedAthlete ? selectedAthlete.name : 'Selecione um aluno'}
            </Heading>
            <Text color="gray.400" fontSize="sm">
              {selectedAthlete?.user?.email || '—'}
            </Text>
          </Box>

          <Select
            value={selectedAthleteId}
            onChange={(e) => setSelectedAthleteId(e.target.value)}
            bg="#0f0f10"
            borderColor="blackAlpha.400"
            color="gray.100"
            maxW="360px"
          >
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.user?.email ? `${a.name} (${a.user.email})` : a.name}
              </option>
            ))}
          </Select>
        </Flex>

        <Tabs variant="enclosed" colorScheme="yellow">
          <TabList>
            <Tab>Chat</Tab>
            <Tab>Formul?rios</Tab>
            <Tab>Avisos</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px="0" pt="5">
              <Box
                bg="#0f0f10"
                border="1px solid"
                borderColor="blackAlpha.400"
                borderRadius="lg"
                p="4"
                minH="360px"
                maxH="360px"
                overflowY="auto"
              >
                {messagesForSelectedAthlete.length === 0 ? (
                  <Flex align="center" justify="center" h="340px" color="gray.400">
                    Nenhuma mensagem ainda. Envie a primeira.
                  </Flex>
                ) : (
                  <Stack spacing="3">
                    {messagesForSelectedAthlete.map((m) => (
                      <Flex key={m.id} justify={m.from === 'PERSONAL' ? 'flex-end' : 'flex-start'}>
                        <Box
                          maxW="72%"
                          bg={m.from === 'PERSONAL' ? '#facc15' : '#1f1f22'}
                          color={m.from === 'PERSONAL' ? 'black' : 'gray.100'}
                          borderRadius="lg"
                          px="3"
                          py="2"
                        >
                          <Text fontSize="sm" whiteSpace="pre-wrap">
                            {m.text}
                          </Text>
                          <Text fontSize="xs" opacity={0.8} mt="1">
                            {formatTimeAgo(m.createdAt)}
                          </Text>
                        </Box>
                      </Flex>
                    ))}
                  </Stack>
                )}
              </Box>

              <Flex mt="4" gap="3" align="flex-end">
                <Textarea
                  placeholder="Digite uma mensagem..."
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  bg="#0f0f10"
                  borderColor="blackAlpha.400"
                  color="gray.100"
                  _hover={{ borderColor: 'gray.500' }}
                  _focus={{ borderColor: 'yellow.400', boxShadow: '0 0 0 1px #facc15' }}
                  rows={2}
                />
                <Button leftIcon={<FiSend />} bg="#facc15" color="black" _hover={{ bg: '#eab308' }} onClick={sendMessage}>
                  Enviar
                </Button>
              </Flex>

              <Text mt="3" color="gray.500" fontSize="xs">
                * Chat ainda é local (mock). Quando tiver backend de mensagens, trocamos para persistente.
              </Text>
            </TabPanel>

            <TabPanel px="0" pt="5">
              <Flex justify="space-between" align="center" mb="3" gap="3" wrap="wrap">
                <HStack spacing="2">
                  <Icon as={FiFileText} color="yellow.300" />
                  <Text fontWeight="bold">Formulários respondidos</Text>
                </HStack>
                <Button size="sm" variant="outline" colorScheme="yellow" onClick={loadRecentResponses}>
                  Atualizar
                </Button>
              </Flex>

              <Box bg="#0f0f10" border="1px solid" borderColor="blackAlpha.400" borderRadius="lg" p="4">
                {loadingResponses ? (
                  <Flex align="center" justify="center" py="10">
                    <Spinner />
                  </Flex>
                ) : (
                  <Stack spacing="3">
                    {filteredResponses.map((r) => (
                      <Button
                        key={r.id}
                        onClick={() => openResponse(r)}
                        justifyContent="flex-start"
                        variant="ghost"
                        bg="#111113"
                        _hover={{ bg: '#1f1f22' }}
                        p="3"
                        borderRadius="lg"
                        h="auto"
                      >
                        <HStack spacing="3" w="full" align="flex-start">
                          <Avatar name={r.athlete?.name} size="sm" />
                          <Box textAlign="left" flex="1" minW="0">
                            <Flex justify="space-between" align="center" gap="2">
                              <Text fontWeight="bold" color="white" noOfLines={1}>
                                {r.form?.title || 'Formulário'}
                              </Text>
                              <Badge colorScheme="yellow" variant="subtle">
                                {formatTimeAgo(r.createdAt)}
                              </Badge>
                            </Flex>
                            <Text fontSize="xs" color="gray.400" noOfLines={1}>
                              {r.athlete?.name} • {r.athlete?.user?.email || 'Sem email'}
                            </Text>
                          </Box>
                        </HStack>
                      </Button>
                    ))}

                    {filteredResponses.length === 0 && (
                      <Box
                        bg="#0f0f10"
                        borderRadius="lg"
                        border="1px dashed"
                        borderColor="gray.600"
                        p="6"
                        textAlign="center"
                        color="gray.400"
                      >
                        Nenhum formulário respondido para este aluno ainda.
                      </Box>
                    )}
                  </Stack>
                )}
              </Box>
            </TabPanel>

            <TabPanel px="0" pt="5">
              <Flex justify="space-between" align="center" mb="3" gap="3" wrap="wrap">
                <HStack spacing="2">
                  <Icon as={FiBell} color="yellow.300" />
                  <Text fontWeight="bold">Avisos para alunos</Text>
                </HStack>
                <Button size="sm" variant="outline" colorScheme="yellow" onClick={loadNotices}>
                  Atualizar
                </Button>
              </Flex>

              <Box bg="#0f0f10" border="1px solid" borderColor="blackAlpha.400" borderRadius="lg" p="4">
                <Stack spacing="3">
                  <Input
                    placeholder="Titulo (opcional)"
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                    bg="#0f0f10"
                    borderColor="blackAlpha.400"
                    color="gray.100"
                    _hover={{ borderColor: 'gray.500' }}
                    _focus={{ borderColor: 'yellow.400', boxShadow: '0 0 0 1px #facc15' }}
                  />
                  <Textarea
                    placeholder="Escreva o aviso para todos os alunos..."
                    value={noticeMessage}
                    onChange={(e) => setNoticeMessage(e.target.value)}
                    bg="#0f0f10"
                    borderColor="blackAlpha.400"
                    color="gray.100"
                    _hover={{ borderColor: 'gray.500' }}
                    _focus={{ borderColor: 'yellow.400', boxShadow: '0 0 0 1px #facc15' }}
                    rows={3}
                  />
                  <Button
                    leftIcon={<FiSend />}
                    bg="#facc15"
                    color="black"
                    _hover={{ bg: '#eab308' }}
                    onClick={sendNotice}
                    isLoading={sendingNotice}
                    alignSelf="flex-start"
                  >
                    Enviar aviso
                  </Button>
                </Stack>
              </Box>

              <Box mt="4" bg="#0f0f10" border="1px solid" borderColor="blackAlpha.400" borderRadius="lg" p="4">
                {loadingNotices ? (
                  <Flex align="center" justify="center" py="6">
                    <Spinner />
                  </Flex>
                ) : (
                  <Stack spacing="3">
                    {notices.map((notice) => (
                      <Box
                        key={notice.id}
                        bg="#111113"
                        border="1px solid"
                        borderColor="blackAlpha.400"
                        borderRadius="lg"
                        p="3"
                      >
                        <Flex justify="space-between" align="center" mb="1">
                          <Text fontWeight="bold">{notice.title || 'Aviso do personal'}</Text>
                          <Badge colorScheme="yellow" variant="subtle">
                            {formatTimeAgo(notice.createdAt)}
                          </Badge>
                        </Flex>
                        <Text color="gray.400" fontSize="sm">
                          {notice.message}
                        </Text>
                      </Box>
                    ))}

                    {notices.length === 0 && (
                      <Box
                        bg="#111113"
                        borderRadius="lg"
                        border="1px dashed"
                        borderColor="gray.600"
                        p="6"
                        textAlign="center"
                        color="gray.400"
                      >
                        Nenhum aviso enviado ainda.
                      </Box>
                    )}
                  </Stack>
                )}
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <Modal isOpen={responseModal.isOpen} onClose={responseModal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg="#18181b" color="gray.100" border="1px solid" borderColor="blackAlpha.400">
          <ModalHeader>Resposta do formulário</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedResponse && (
              <Box>
                <Text fontWeight="bold" mb="1">
                  {selectedResponse.form?.title}
                </Text>
                <Text color="gray.400" fontSize="sm" mb="4">
                  {selectedResponse.athlete?.name} • {formatTimeAgo(selectedResponse.createdAt)}
                </Text>
                <Divider borderColor="blackAlpha.500" mb="4" />
                {answerItems.length === 0 ? (
                  <Text color="gray.500" fontSize="sm">
                    Sem respostas enviadas.
                  </Text>
                ) : (
                  <Stack spacing="3">
                    {answerItems.map((item) => (
                      <Box
                        key={item.id}
                        bg="#0f0f10"
                        border="1px solid"
                        borderColor="blackAlpha.400"
                        borderRadius="lg"
                        p="4"
                      >
                        <Text fontWeight="bold" mb="1">
                          {item.label}
                        </Text>
                        <Text color="gray.300" fontSize="sm">
                          {formatAnswerValue(item.value)}
                        </Text>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
};
