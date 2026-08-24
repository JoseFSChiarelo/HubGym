import { useEffect, useMemo, useState } from 'react';
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
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
  Tag,
  Text,
  Textarea,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { FiArrowLeft, FiBookOpen, FiCopy, FiEdit, FiLink, FiPlus, FiSave, FiSearch, FiTrash2 } from 'react-icons/fi';
import { exerciseBank, exerciseGroups } from '../data/exerciseBank';
import type { ExerciseBankItem, ExerciseGroup } from '../data/exerciseBank';
import { api } from '../services/api';

type Athlete = { id: string; name: string; user?: { email?: string } };

type SetType = 'AQUECIMENTO' | 'RECONHECIMENTO' | 'VALIDA' | 'CLUSTER' | 'DROP';

type RoutineSet = {
  setType: SetType;
  load: string;
  reps: string;
  rir: string;
  rest: string;
  notes: string;
};

type RoutineExercise = {
  name: string;
  muscle: string;
  sets: RoutineSet[];
};

type Training = {
  id: string;
  title: string;
  notes: string | null;
  athleteId?: string | null;
  athlete?: Athlete | null;
  exercises: RoutineExercise[];
  createdAt: string;
  updatedAt: string;
};


export const PersonalTrainingsPage = () => {
  const toast = useToast();
  const [mode, setMode] = useState<'home' | 'create' | 'library'>('home');

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);

  const [library, setLibrary] = useState<Training[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');

  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('Novo treino');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftAthleteId, setDraftAthleteId] = useState<string>('');
  const [draftExercises, setDraftExercises] = useState<RoutineExercise[]>([]);

  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseGroup, setExerciseGroup] = useState<ExerciseGroup | 'Todos'>('Todos');

  const linkModal = useDisclosure();
  const [linkingTrainingId, setLinkingTrainingId] = useState<string | null>(null);
  const [linkAthleteId, setLinkAthleteId] = useState<string>('');

  const ensureAthletesLoaded = async () => {
    if (loadingAthletes) return;
    if (athletes.length > 0) return;
    setLoadingAthletes(true);
    try {
      const { data } = await api.get('/personal/athletes');
      setAthletes((data || []).map((a: any) => ({ id: a.id, name: a.name, user: a.user })));
    } catch {
      toast({ title: 'Não foi possível carregar os alunos', status: 'error' });
    } finally {
      setLoadingAthletes(false);
    }
  };

  const loadLibraryFromDb = async (query?: string) => {
    setLoadingLibrary(true);
    try {
      const { data } = await api.get('/personal/trainings', { params: query ? { q: query } : undefined });
      setLibrary(data || []);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Não foi possível carregar a biblioteca de treinos';
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setLoadingLibrary(false);
    }
  };

  useEffect(() => {
    loadLibraryFromDb();
  }, []);

  const resetDraft = () => {
    setDraftId(null);
    setDraftTitle('Novo treino');
    setDraftNotes('');
    setDraftAthleteId('');
    setDraftExercises([]);
  };

  const openCreate = async () => {
    await ensureAthletesLoaded();
    resetDraft();
    setMode('create');
  };

  const openLibrary = async () => {
    await ensureAthletesLoaded();
    await loadLibraryFromDb(librarySearch.trim() || undefined);
    setMode('library');
  };

  const addExerciseFromBank = (item: ExerciseBankItem) => {
    setDraftExercises((prev) => [
      ...prev,
      {
        name: item.name,
        muscle: item.group,
        sets: [{ setType: 'VALIDA', load: '', reps: '', rir: '', rest: '', notes: '' }]
      }
    ]);
  };

  const updateExercise = (exerciseIdx: number, patch: Partial<RoutineExercise>) => {
    setDraftExercises((prev) => prev.map((ex, idx) => (idx === exerciseIdx ? { ...ex, ...patch } : ex)));
  };

  const updateSet = (exerciseIdx: number, setIdx: number, patch: Partial<RoutineSet>) => {
    setDraftExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIdx) return ex;
        return { ...ex, sets: ex.sets.map((s, sIdx) => (sIdx === setIdx ? { ...s, ...patch } : s)) };
      })
    );
  };

  const addSet = (exerciseIdx: number) => {
    setDraftExercises((prev) =>
      prev.map((ex, idx) =>
        idx === exerciseIdx
          ? { ...ex, sets: [...ex.sets, { setType: 'VALIDA', load: '', reps: '', rir: '', rest: '', notes: '' }] }
          : ex
      )
    );
  };

  const removeSet = (exerciseIdx: number, setIdx: number) => {
    setDraftExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIdx) return ex;
        const nextSets = ex.sets.filter((_, i) => i !== setIdx);
        return {
          ...ex,
          sets:
            nextSets.length > 0 ? nextSets : [{ setType: 'VALIDA', load: '', reps: '', rir: '', rest: '', notes: '' }]
        };
      })
    );
  };

  const removeExercise = (exerciseIdx: number) => {
    setDraftExercises((prev) => prev.filter((_, idx) => idx !== exerciseIdx));
  };

  const saveTraining = async () => {
    const payload = {
      title: draftTitle.trim() || 'Treino sem título',
      notes: draftNotes || null,
      athleteId: draftAthleteId || null,
      exercises: draftExercises
    };

    try {
      if (draftId) {
        const { data } = await api.put(`/personal/trainings/${draftId}`, payload);
        setDraftId(data.id);
      } else {
        const { data } = await api.post('/personal/trainings', payload);
        setDraftId(data.id);
      }
      toast({ title: 'Treino salvo na biblioteca', status: 'success' });
      await loadLibraryFromDb(librarySearch.trim() || undefined);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Não foi possível salvar o treino';
      toast({ title: 'Erro', description: message, status: 'error' });
    }
  };

  const editFromLibrary = (training: Training) => {
    const normalizedExercises: RoutineExercise[] = (training.exercises || []).map((exercise: any) => ({
      name: exercise?.name ?? 'Exercício',
      muscle: exercise?.muscle ?? 'Geral',
      sets: (exercise?.sets || []).map((set: any) => ({
        setType: (set?.setType as SetType) ?? 'VALIDA',
        load: String(set?.load ?? ''),
        reps: String(set?.reps ?? ''),
        rir: String(set?.rir ?? ''),
        rest: String(set?.rest ?? ''),
        notes: String(set?.notes ?? '')
      }))
    }));

    setDraftId(training.id);
    setDraftTitle(training.title);
    setDraftNotes(training.notes || '');
    setDraftAthleteId(training.athleteId || '');
    setDraftExercises(normalizedExercises);
    setMode('create');
  };

  const deleteFromLibrary = (id: string) => {
    const run = async () => {
      try {
        await api.delete(`/personal/trainings/${id}`);
        toast({ title: 'Treino removido', status: 'info' });
        await loadLibraryFromDb(librarySearch.trim() || undefined);
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Não foi possível remover o treino';
        toast({ title: 'Erro', description: message, status: 'error' });
      }
    };
    run();
  };

  const openLinkModal = (training: Training) => {
    setLinkingTrainingId(training.id);
    setLinkAthleteId(training.athleteId || '');
    linkModal.onOpen();
  };

  const confirmLink = () => {
    if (!linkingTrainingId) return;
    const run = async () => {
      try {
        await api.patch(`/personal/trainings/${linkingTrainingId}/assign`, { athleteId: linkAthleteId || null });
        linkModal.onClose();
        toast({ title: 'Treino vinculado ao aluno', status: 'success' });
        await loadLibraryFromDb(librarySearch.trim() || undefined);
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Não foi possível vincular o treino';
        toast({ title: 'Erro', description: message, status: 'error' });
      }
    };
    run();
  };

  const filteredExerciseBank = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase();
    return exerciseBank.filter((item) => {
      const groupOk = exerciseGroup === 'Todos' || item.group === exerciseGroup;
      const queryOk = !q || item.name.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q);
      return groupOk && queryOk;
    });
  }, [exerciseGroup, exerciseSearch]);

  const exerciseGroupOptions: Array<ExerciseGroup | 'Todos'> = ['Todos', ...exerciseGroups];

  const filteredLibrary = useMemo(() => {
    const sorted = [...library].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return sorted;
  }, [library]);

  const resolveAthleteLabel = (training: Training) => {
    if (!training.athleteId) return 'Não vinculado';
    if (training.athlete) {
      return training.athlete.user?.email ? `${training.athlete.name} (${training.athlete.user.email})` : training.athlete.name;
    }
    const athlete = athletes.find((a) => a.id === training.athleteId);
    if (!athlete) return 'Aluno não encontrado';
    return athlete.user?.email ? `${athlete.name} (${athlete.user.email})` : athlete.name;
  };

  const setTypeOptions: Array<{ value: SetType; label: string }> = [
    { value: 'AQUECIMENTO', label: 'Aquecimento' },
    { value: 'RECONHECIMENTO', label: 'Reconhecimento' },
    { value: 'VALIDA', label: 'Válida' },
    { value: 'CLUSTER', label: 'Cluster' },
    { value: 'DROP', label: 'Drop' }
  ];

  return (
    <Box bg="#0f0f10" color="gray.100">
      <Flex justify="space-between" align="center" mb="6" wrap="wrap" gap="3">
        <Box>
          <Heading size="lg">Treino</Heading>
          <Text color="gray.400">Crie novos treinos e gerencie sua biblioteca particular.</Text>
        </Box>
        {mode !== 'home' && (
          <Button leftIcon={<FiArrowLeft />} variant="ghost" onClick={() => setMode('home')}>
            Voltar
          </Button>
        )}
      </Flex>

      {mode === 'home' && (
        <SimpleGrid columns={[1, null, 2]} spacing="4">
          <Box bg="#18181b" p="6" borderRadius="xl" border="1px solid" borderColor="blackAlpha.300" boxShadow="lg">
            <HStack spacing="3" mb="2">
              <Icon as={FiPlus} color="yellow.300" />
              <Heading size="md" color="white">
                Criar
              </Heading>
            </HStack>
            <Text color="gray.400" mb="4">
              Forje um novo treino usando a biblioteca de exercícios do app e vincule a um aluno.
            </Text>
            <Button bg="#facc15" color="black" _hover={{ bg: '#eab308' }} onClick={openCreate}>
              Criar treino
            </Button>
          </Box>

          <Box bg="#18181b" p="6" borderRadius="xl" border="1px solid" borderColor="blackAlpha.300" boxShadow="lg">
            <HStack spacing="3" mb="2">
              <Icon as={FiBookOpen} color="yellow.300" />
              <Heading size="md" color="white">
                Acessar Biblioteca
              </Heading>
            </HStack>
            <Text color="gray.400" mb="4">
              Pesquise treinos criados por você, edite ou vincule a um aluno.
            </Text>
            <Button bg="#facc15" color="black" _hover={{ bg: '#eab308' }} onClick={openLibrary}>
              Abrir biblioteca
            </Button>
          </Box>
        </SimpleGrid>
      )}

      {mode === 'library' && (
        <Box bg="#18181b" p="6" borderRadius="xl" border="1px solid" borderColor="blackAlpha.300" boxShadow="lg">
          <Flex justify="space-between" align="center" mb="4" gap="3" wrap="wrap">
            <Box>
              <Heading size="md">Biblioteca particular</Heading>
              <Text color="gray.400">Seus treinos salvos no sistema.</Text>
            </Box>
            <HStack spacing="2" w={['full', null, 'auto']}>
              <Input
                placeholder="Pesquisar treino pelo título..."
                value={librarySearch}
                onChange={async (e) => {
                  const value = e.target.value;
                  setLibrarySearch(value);
                  await loadLibraryFromDb(value.trim() || undefined);
                }}
                bg="#0f0f10"
                maxW="420px"
              />
              <Button leftIcon={<FiPlus />} bg="#facc15" color="black" _hover={{ bg: '#eab308' }} onClick={openCreate}>
                Novo
              </Button>
            </HStack>
          </Flex>

          <Stack spacing="3">
            {loadingLibrary && (
              <Flex align="center" justify="center" py="8" color="gray.400">
                Carregando...
              </Flex>
            )}

            {!loadingLibrary &&
              filteredLibrary.map((t) => (
                <Box key={t.id} bg="#0f0f10" borderRadius="lg" border="1px solid" borderColor="blackAlpha.400" p="4">
                  <Flex justify="space-between" align={['flex-start', null, 'center']} gap="3" wrap="wrap">
                    <Box>
                      <HStack spacing="2" mb="1" wrap="wrap">
                        <Text fontWeight="bold" color="white">
                          {t.title}
                        </Text>
                        <Tag colorScheme={t.athleteId ? 'yellow' : 'gray'} variant="subtle">
                          {resolveAthleteLabel(t)}
                        </Tag>
                        <Tag colorScheme="purple" variant="subtle">
                          {t.exercises?.length || 0} exercícios
                        </Tag>
                      </HStack>
                      {t.notes && (
                        <Text color="gray.400" fontSize="sm" noOfLines={2}>
                          {t.notes}
                        </Text>
                      )}
                    </Box>
                    <HStack spacing="2">
                      <Button size="sm" leftIcon={<FiEdit />} variant="outline" colorScheme="yellow" onClick={() => editFromLibrary(t)}>
                        Editar
                      </Button>
                      <Button size="sm" leftIcon={<FiLink />} variant="ghost" colorScheme="blue" onClick={() => openLinkModal(t)}>
                        Vincular
                      </Button>
                      <Button size="sm" leftIcon={<FiTrash2 />} variant="ghost" colorScheme="red" onClick={() => deleteFromLibrary(t.id)}>
                        Remover
                      </Button>
                    </HStack>
                  </Flex>
                </Box>
              ))}

            {!loadingLibrary && filteredLibrary.length === 0 && (
              <Box bg="#0f0f10" borderRadius="lg" border="1px dashed" borderColor="gray.600" p="6" textAlign="center" color="gray.400">
                Nenhum treino encontrado. Crie o primeiro!
              </Box>
            )}
          </Stack>
        </Box>
      )}

      {mode === 'create' && (
        <Flex gap="6" direction={['column', null, 'row']}>
          <Box flex="2">
            <Box bg="#18181b" p="6" borderRadius="xl" border="1px solid" borderColor="blackAlpha.300" boxShadow="lg">
              <Flex justify="space-between" align="center" mb="4" wrap="wrap" gap="3">
                <HStack spacing="2" color="yellow.400" fontWeight="bold">
                  <Icon as={FiPlus} />
                  <Text textTransform="uppercase" fontSize="sm">
                    {draftId ? 'Editar treino' : 'Novo treino'}
                  </Text>
                </HStack>
                <HStack spacing="3">
                  <Button
                    leftIcon={<FiCopy />}
                    variant="outline"
                    colorScheme="yellow"
                    borderRadius="full"
                    borderColor="yellow.400"
                    _hover={{ bg: '#1f1f22' }}
                    onClick={() => {
                      resetDraft();
                      toast({ title: 'Novo treino iniciado', status: 'info' });
                    }}
                  >
                    Novo do zero
                  </Button>
                  <Button leftIcon={<FiSave />} colorScheme="yellow" borderRadius="full" bg="#facc15" color="black" onClick={saveTraining}>
                    Salvar
                  </Button>
                </HStack>
              </Flex>

              <SimpleGrid columns={[1, null, 2]} spacing="4">
                <FormControl>
                  <FormLabel>Título do treino</FormLabel>
                  <Input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    bg="#0f0f10"
                    borderColor="blackAlpha.400"
                    _hover={{ borderColor: 'gray.500' }}
                    _focus={{ borderColor: 'yellow.400', boxShadow: '0 0 0 1px #facc15' }}
                    color="gray.100"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Vincular ao aluno</FormLabel>
                  <Select
                    value={draftAthleteId}
                    onChange={(e) => setDraftAthleteId(e.target.value)}
                    bg="#0f0f10"
                    borderColor="blackAlpha.400"
                    color="gray.100"
                    _hover={{ borderColor: 'gray.500' }}
                    _focus={{ borderColor: 'yellow.400', boxShadow: '0 0 0 1px #facc15' }}
                  >
                    <option value="">Não vincular agora</option>
                    {athletes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.user?.email ? `${a.name} (${a.user.email})` : a.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl mt="4">
                <FormLabel>Notas do treinador</FormLabel>
                <Textarea
                  placeholder="Adicione orientações gerais para este treino..."
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  bg="#0f0f10"
                  borderColor="blackAlpha.400"
                  _hover={{ borderColor: 'gray.500' }}
                  _focus={{ borderColor: 'yellow.400', boxShadow: '0 0 0 1px #facc15' }}
                  color="gray.100"
                />
              </FormControl>
            </Box>

            <Box mt="6" bg="#18181b" p="6" borderRadius="xl" border="1px solid" borderColor="blackAlpha.300" boxShadow="lg">
              <Flex justify="space-between" align="center" mb="4" wrap="wrap" gap="2">
                <Heading size="md" color="white">
                  Rotina
                </Heading>
                <Text color="gray.400" fontSize="sm">
                  Adicione exercícios pela biblioteca ao lado.
                </Text>
              </Flex>

              <Stack spacing="5">
                {draftExercises.map((ex, idx) => (
                  <Box key={`${ex.name}-${idx}`} border="1px solid" borderColor="blackAlpha.400" borderRadius="lg" p="4" bg="#0f0f10">
                    <Flex justify="space-between" align="center" mb="3" gap="3" wrap="wrap">
                      <Box>
                        <Input
                          value={ex.name}
                          onChange={(e) => updateExercise(idx, { name: e.target.value })}
                          bg="#111113"
                          borderColor="blackAlpha.500"
                          color="white"
                          fontWeight="bold"
                        />
                        <HStack spacing="2" mt="2" wrap="wrap">
                          <Tag colorScheme="yellow" size="sm">
                            {ex.muscle}
                          </Tag>
                        </HStack>
                      </Box>
                      <Button size="sm" variant="ghost" colorScheme="red" onClick={() => removeExercise(idx)} leftIcon={<FiTrash2 />}>
                        Remover
                      </Button>
                    </Flex>

                    <Box border="1px solid" borderColor="blackAlpha.400" borderRadius="md" overflow="hidden">
                      <Flex bg="#18181b" fontWeight="bold" color="gray.300" p="2" fontSize="sm">
                        <Text flex="1" textAlign="center">
                          Set
                        </Text>
                        <Text flex="1" textAlign="center">
                          Tipo
                        </Text>
                        <Text flex="1" textAlign="center">
                          Kg
                        </Text>
                        <Text flex="1" textAlign="center">
                          Reps
                        </Text>
                        <Text flex="1" textAlign="center">
                          RPE
                        </Text>
                        <Text flex="1" textAlign="center">
                          Rest
                        </Text>
                        <Text flex="2" textAlign="center">
                          Notas
                        </Text>
                        <Text w="40px" />
                      </Flex>

                      {ex.sets.map((set, sIdx) => (
                        <Flex key={sIdx} p="2" align="center" fontSize="sm" bg="#111113" gap="2">
                          <Text flex="1" textAlign="center">
                            {sIdx + 1}
                          </Text>
                          <Select
                            flex="1"
                            size="sm"
                            variant="filled"
                            value={set.setType || 'VALIDA'}
                            onChange={(e) => updateSet(idx, sIdx, { setType: e.target.value as SetType })}
                            bg="#18181b"
                            borderColor="blackAlpha.500"
                            color="white"
                          >
                            {setTypeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </Select>
                          <Input flex="1" textAlign="center" variant="filled" value={set.load} onChange={(e) => updateSet(idx, sIdx, { load: e.target.value })} />
                          <Input flex="1" textAlign="center" variant="filled" value={set.reps} onChange={(e) => updateSet(idx, sIdx, { reps: e.target.value })} />
                          <Input flex="1" textAlign="center" variant="filled" value={set.rir} onChange={(e) => updateSet(idx, sIdx, { rir: e.target.value })} />
                          <Input flex="1" textAlign="center" variant="filled" value={set.rest} onChange={(e) => updateSet(idx, sIdx, { rest: e.target.value })} />
                          <Input flex="2" textAlign="center" variant="filled" value={set.notes || ''} onChange={(e) => updateSet(idx, sIdx, { notes: e.target.value })} />
                          <Button size="xs" variant="ghost" colorScheme="red" onClick={() => removeSet(idx, sIdx)} aria-label="remover set">
                            <FiTrash2 />
                          </Button>
                        </Flex>
                      ))}
                    </Box>

                    <Button mt="3" size="sm" variant="ghost" color="yellow.600" leftIcon={<FiPlus />} onClick={() => addSet(idx)}>
                      Adicionar set
                    </Button>
                  </Box>
                ))}
              </Stack>

              {draftExercises.length === 0 && (
                <Flex mt="4" align="center" justify="center" border="2px dashed" borderColor="gray.600" p="8" borderRadius="lg" color="gray.400" textAlign="center">
                  Adicione exercícios pela biblioteca ao lado para começar.
                </Flex>
              )}
            </Box>
          </Box>

          <Box flex="1" bg="#18181b" p="5" borderRadius="xl" border="1px solid" borderColor="blackAlpha.300" boxShadow="lg" h="fit-content" position="sticky" top="6">
            <Heading size="sm" mb="4" color="white">
              Biblioteca de exercícios (app)
            </Heading>

            <InputGroup mb="3">
              <InputLeftElement pointerEvents="none">
                <FiSearch color="#888" />
              </InputLeftElement>
              <Input
                placeholder="Buscar exercício..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                bg="#0f0f10"
                borderColor="blackAlpha.400"
                color="gray.100"
                _hover={{ borderColor: 'gray.500' }}
                _focus={{ borderColor: 'yellow.400', boxShadow: '0 0 0 1px #facc15' }}
              />
            </InputGroup>

            <HStack spacing="2" mb="3" flexWrap="wrap">
              {exerciseGroupOptions.map((g) => (
                <Button
                  key={g}
                  size="sm"
                  borderRadius="full"
                  variant={exerciseGroup === g ? 'solid' : 'outline'}
                  bg={exerciseGroup === g ? '#facc15' : 'transparent'}
                  color={exerciseGroup === g ? 'black' : 'gray.200'}
                  borderColor="gray.500"
                  _hover={{ bg: exerciseGroup === g ? '#eab308' : '#1f1f22' }}
                  onClick={() => setExerciseGroup(g)}
                >
                  {g}
                </Button>
              ))}
            </HStack>

            <Stack spacing="3">
              {filteredExerciseBank.map((ex) => (
                <Flex key={`${ex.name}-${ex.group}`} align="center" justify="space-between" bg="#0f0f10" p="3" borderRadius="md" border="1px solid" borderColor="blackAlpha.400">
                  <Box>
                    <Text fontWeight="bold" color="white">
                      {ex.name}
                    </Text>
                    <Text fontSize="sm" color="gray.400">
                      {ex.detail}
                    </Text>
                  </Box>
                  <Button size="sm" variant="ghost" color="yellow.400" _hover={{ color: '#facc15' }} onClick={() => addExerciseFromBank(ex)}>
                    <FiPlus />
                  </Button>
                </Flex>
              ))}

              {filteredExerciseBank.length === 0 && (
                <Box bg="#0f0f10" borderRadius="lg" border="1px dashed" borderColor="gray.600" p="6" textAlign="center" color="gray.400">
                  Nenhum exercício encontrado.
                </Box>
              )}
            </Stack>

            <Divider my="4" borderColor="blackAlpha.500" />
            <Button w="full" leftIcon={<FiBookOpen />} variant="outline" colorScheme="yellow" onClick={openLibrary}>
              Ir para biblioteca de treinos
            </Button>
          </Box>
        </Flex>
      )}

      <Modal isOpen={linkModal.isOpen} onClose={linkModal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent bg="#18181b" color="gray.100" border="1px solid" borderColor="blackAlpha.400">
          <ModalHeader>Vincular treino a um aluno</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Aluno</FormLabel>
              <Select value={linkAthleteId} onChange={(e) => setLinkAthleteId(e.target.value)} bg="#0f0f10">
                <option value="">Não vincular</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.user?.email ? `${a.name} (${a.user.email})` : a.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            <Text mt="3" color="gray.400" fontSize="sm">
              Isso salva o vínculo no banco de dados (biblioteca particular).
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={linkModal.onClose}>
              Cancelar
            </Button>
            <Button leftIcon={<FiLink />} bg="#facc15" color="black" _hover={{ bg: '#eab308' }} onClick={confirmLink}>
              Vincular
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};
