import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
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
  Text,
  Textarea,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { FiArrowLeft, FiEdit2, FiPlay, FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { exerciseBank, exerciseGroups } from '../data/exerciseBank';
import type { ExerciseGroup } from '../data/exerciseBank';
import { useAuth } from '../modules/auth/AuthContext';
import {
  MAX_CUSTOM_TRAININGS,
  generateCustomTrainingId,
  loadCustomTrainings,
  saveCustomTrainings
} from '../modules/athlete/customTrainings';
import type { CustomExercise, CustomSet, CustomSetType, CustomTraining } from '../modules/athlete/customTrainings';
import { api } from '../services/api';

type Training = {
  id: string;
  title: string;
  notes?: string | null;
  updatedAt: string;
  personal?: { id: string; name?: string | null };
};

const createEmptySet = (): CustomSet => ({
  setType: 'VALIDA',
  load: '',
  reps: '',
  rir: '',
  rest: '',
  notes: ''
});

const cloneExercises = (exercises: CustomExercise[]) =>
  exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => ({ ...set }))
  }));

const setTypeOptions: Array<{ value: CustomSetType; label: string }> = [
  { value: 'AQUECIMENTO', label: 'Aquecimento' },
  { value: 'RECONHECIMENTO', label: 'Reconhecimento' },
  { value: 'VALIDA', label: 'Valida' },
  { value: 'CLUSTER', label: 'Cluster' },
  { value: 'DROP', label: 'Drop' }
];

export const AthleteTrainingsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [customTrainings, setCustomTrainings] = useState<CustomTraining[]>([]);
  const [loading, setLoading] = useState(false);
  const [trainerTrainingBlocked, setTrainerTrainingBlocked] = useState(false);
  const [trainerTrainingBlockMessage, setTrainerTrainingBlockMessage] = useState('');

  const draftModal = useDisclosure();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('Novo treino');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftExercises, setDraftExercises] = useState<CustomExercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseGroup, setExerciseGroup] = useState<ExerciseGroup | 'Todos'>('Todos');

  const loadTrainings = async () => {
    setLoading(true);
    setTrainerTrainingBlocked(false);
    setTrainerTrainingBlockMessage('');
    try {
      const { data } = await api.get('/athlete/trainings');
      setTrainings(data || []);
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const message = err?.response?.data?.message || 'Nao foi possivel carregar os treinos.';
      if (code === 'TRAINING_BLOCKED') {
        setTrainings([]);
        setTrainerTrainingBlocked(true);
        setTrainerTrainingBlockMessage(message);
        return;
      }
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainings();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setCustomTrainings(loadCustomTrainings(user.id));
  }, [user?.id]);

  const orderedTrainings = useMemo(() => {
    return [...trainings].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [trainings]);

  const orderedCustomTrainings = useMemo(() => {
    return [...customTrainings].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [customTrainings]);

  const filteredExerciseBank = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase();
    return exerciseBank.filter((item) => {
      const groupOk = exerciseGroup === 'Todos' || item.group === exerciseGroup;
      const queryOk = !q || item.name.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q);
      return groupOk && queryOk;
    });
  }, [exerciseGroup, exerciseSearch]);

  const exerciseGroupOptions: Array<ExerciseGroup | 'Todos'> = ['Todos', ...exerciseGroups];

  const remainingSlots = Math.max(0, MAX_CUSTOM_TRAININGS - customTrainings.length);
  const canCreateCustom = remainingSlots > 0;

  const persistCustomTrainings = (next: CustomTraining[]) => {
    if (!user?.id) return;
    saveCustomTrainings(user.id, next);
    setCustomTrainings(next);
  };

  const resetDraft = () => {
    setDraftId(null);
    setDraftTitle('Novo treino');
    setDraftNotes('');
    setDraftExercises([]);
    setExerciseSearch('');
    setExerciseGroup('Todos');
  };

  const openCreate = () => {
    if (!canCreateCustom) {
      toast({ title: 'Limite de treinos atingido', description: 'Voce pode criar ate 2 treinos.', status: 'warning' });
      return;
    }
    resetDraft();
    draftModal.onOpen();
  };

  const openEdit = (training: CustomTraining) => {
    setDraftId(training.id);
    setDraftTitle(training.title);
    setDraftNotes(training.notes || '');
    setDraftExercises(cloneExercises(training.exercises || []));
    draftModal.onOpen();
  };

  const addExerciseFromBank = (name: string, muscle: string) => {
    setDraftExercises((prev) => [...prev, { name, muscle, sets: [createEmptySet()] }]);
  };

  const addBlankExercise = () => {
    setDraftExercises((prev) => [...prev, { name: 'Novo exercicio', muscle: 'Geral', sets: [createEmptySet()] }]);
  };

  const updateExercise = (exerciseIdx: number, patch: Partial<CustomExercise>) => {
    setDraftExercises((prev) => prev.map((ex, idx) => (idx === exerciseIdx ? { ...ex, ...patch } : ex)));
  };

  const updateSet = (exerciseIdx: number, setIdx: number, patch: Partial<CustomSet>) => {
    setDraftExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIdx) return ex;
        return { ...ex, sets: ex.sets.map((set, sIdx) => (sIdx === setIdx ? { ...set, ...patch } : set)) };
      })
    );
  };

  const addSet = (exerciseIdx: number) => {
    setDraftExercises((prev) =>
      prev.map((ex, idx) => (idx === exerciseIdx ? { ...ex, sets: [...ex.sets, createEmptySet()] } : ex))
    );
  };

  const removeSet = (exerciseIdx: number, setIdx: number) => {
    setDraftExercises((prev) =>
      prev.map((ex, idx) => {
        if (idx !== exerciseIdx) return ex;
        const nextSets = ex.sets.filter((_, sIdx) => sIdx !== setIdx);
        return { ...ex, sets: nextSets.length > 0 ? nextSets : [createEmptySet()] };
      })
    );
  };

  const removeExercise = (exerciseIdx: number) => {
    setDraftExercises((prev) => prev.filter((_, idx) => idx !== exerciseIdx));
  };

  const saveDraft = () => {
    if (!user?.id) return;
    if (!draftId && !canCreateCustom) {
      toast({ title: 'Limite de treinos atingido', description: 'Voce pode criar ate 2 treinos.', status: 'warning' });
      return;
    }
    if (draftExercises.length === 0) {
      toast({ title: 'Adicione exercicios', description: 'Inclua pelo menos um exercicio no treino.', status: 'warning' });
      return;
    }

    const now = new Date().toISOString();
    const existing = draftId ? customTrainings.find((t) => t.id === draftId) : null;
    const nextTraining: CustomTraining = {
      id: draftId || generateCustomTrainingId(),
      title: draftTitle.trim() || 'Treino sem titulo',
      notes: draftNotes.trim() ? draftNotes : null,
      exercises: cloneExercises(draftExercises),
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    const nextList = existing
      ? customTrainings.map((t) => (t.id === nextTraining.id ? nextTraining : t))
      : [...customTrainings, nextTraining];

    persistCustomTrainings(nextList);
    toast({ title: 'Treino salvo', status: 'success' });
    draftModal.onClose();
  };

  const deleteCustomTraining = (id: string) => {
    const nextList = customTrainings.filter((t) => t.id !== id);
    persistCustomTrainings(nextList);
    toast({ title: 'Treino removido', status: 'info' });
  };

  const openTraining = (id: string, mode?: 'inspect') => {
    if (mode === 'inspect') {
      navigate(`/athlete/trainings/${id}`, { state: { mode } });
      return;
    }
    navigate(`/athlete/trainings/${id}`, { state: { autoStart: true } });
  };

  return (
    <Box minH="100vh" bg="#0a0a0a" color="white" fontFamily="'Inter', system-ui, sans-serif">
      <Flex align="center" justify="space-between" px={[4, 8]} py="6" wrap="wrap" gap="3">
        <Box>
          <Heading size="lg">Treinos</Heading>
          <Text color="gray.300">Treinos do personal e treinos criados por voce.</Text>
        </Box>
        <HStack spacing="3">
          <Button
            leftIcon={<FiPlus />}
            colorScheme="orange"
            bg="orange.400"
            color="black"
            _hover={{ bg: 'orange.500' }}
            onClick={openCreate}
            isDisabled={!canCreateCustom}
          >
            Criar treino
          </Button>
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
        </HStack>
      </Flex>

      <Box px={[4, 8]} pb="10">
        <Stack spacing="6">
          <Box>
            <Flex justify="space-between" align="center" flexWrap="wrap" gap="3" mb="3">
              <Heading size="md">Meus treinos</Heading>
              <Badge colorScheme={canCreateCustom ? 'green' : 'red'} variant="subtle">
                {remainingSlots} de {MAX_CUSTOM_TRAININGS} disponiveis
              </Badge>
            </Flex>
            <Text color="gray.400" fontSize="sm" mb="4">
              Voce pode criar ate dois treinos adicionais usando a biblioteca de exercicios.
            </Text>

            <Stack spacing="4">
              {orderedCustomTrainings.map((training) => (
                <Box
                  key={training.id}
                  bg="#141414"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  borderRadius="2xl"
                  p="5"
                  boxShadow="lg"
                >
                  <Stack spacing="3">
                    <Box>
                      <Text fontWeight="bold" fontSize="lg">
                        {training.title || 'Treino'}
                      </Text>
                      <Text color="gray.400" fontSize="sm" mt="1">
                        Treino criado por voce
                      </Text>
                      {training.notes && (
                        <Text color="gray.400" fontSize="sm" mt="2">
                          {training.notes}
                        </Text>
                      )}
                    </Box>

                    <Stack direction={['column', 'row']} spacing="2">
                      <Button
                        leftIcon={<FiPlay />}
                        colorScheme="orange"
                        bg="orange.400"
                        color="black"
                        _hover={{ bg: 'orange.500' }}
                        onClick={() => openTraining(training.id)}
                      >
                        Iniciar treino
                      </Button>
                      <Button variant="outline" colorScheme="orange" onClick={() => openTraining(training.id, 'inspect')}>
                        Inspecionar treino
                      </Button>
                      <Button leftIcon={<FiEdit2 />} variant="ghost" colorScheme="yellow" onClick={() => openEdit(training)}>
                        Editar
                      </Button>
                      <Button leftIcon={<FiTrash2 />} variant="ghost" colorScheme="red" onClick={() => deleteCustomTraining(training.id)}>
                        Excluir
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))}

              {orderedCustomTrainings.length === 0 && (
                <Box bg="#141414" borderRadius="lg" border="1px dashed" borderColor="gray.600" p="6" textAlign="center" color="gray.400">
                  Voce ainda nao criou treinos personalizados.
                </Box>
              )}
            </Stack>
          </Box>

          <Divider borderColor="whiteAlpha.200" />

          <Box>
            <Heading size="md" mb="4">
              Treinos do personal
            </Heading>
            {loading && (
              <Flex align="center" justify="center" py="10" color="gray.400">
                Carregando...
              </Flex>
            )}

            {!loading && trainerTrainingBlocked ? (
              <Box bg="#141414" borderRadius="lg" border="1px dashed" borderColor="orange.300" p="6" textAlign="center" color="orange.200">
                {trainerTrainingBlockMessage || 'Treinos do personal bloqueados. Pagamento pendente.'}
              </Box>
            ) : (
              !loading && (
              <Stack spacing="4">
                {orderedTrainings.map((training) => {
                  return (
                    <Box
                      key={training.id}
                      bg="#141414"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      borderRadius="2xl"
                      p="5"
                      boxShadow="lg"
                    >
                      <Stack spacing="3">
                        <Box>
                          <Text fontWeight="bold" fontSize="lg">
                            {training.title || 'Treino'}
                          </Text>
                          <Text color="gray.400" fontSize="sm" mt="1">
                            {training.personal?.name ? `Personal: ${training.personal.name}` : 'Personal nao informado'}
                          </Text>
                          {training.notes && (
                            <Text color="gray.400" fontSize="sm" mt="2">
                              {training.notes}
                            </Text>
                          )}
                        </Box>

                        <Stack direction={['column', 'row']} spacing="2">
                          <Button
                            leftIcon={<FiPlay />}
                            colorScheme="orange"
                            bg="orange.400"
                            color="black"
                            _hover={{ bg: 'orange.500' }}
                            onClick={() => openTraining(training.id)}
                          >
                            Iniciar treino
                          </Button>
                          <Button variant="outline" colorScheme="orange" onClick={() => openTraining(training.id, 'inspect')}>
                            Inspecionar treino
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })}

                {orderedTrainings.length === 0 && (
                  <Box bg="#141414" borderRadius="lg" border="1px dashed" borderColor="gray.600" p="6" textAlign="center" color="gray.400">
                    Nenhum treino vinculado para este aluno.
                  </Box>
                )}
              </Stack>
              )
            )}
          </Box>
        </Stack>
      </Box>

      <Modal isOpen={draftModal.isOpen} onClose={draftModal.onClose} size="6xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent bg="#111111" color="white" border="1px solid" borderColor="whiteAlpha.200">
          <ModalHeader>{draftId ? 'Editar treino' : 'Criar treino'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={[1, null, 2]} spacing="6">
              <Stack spacing="4">
                <FormControl>
                  <FormLabel>Titulo do treino</FormLabel>
                  <Input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    bg="#0f0f0f"
                    borderColor="whiteAlpha.200"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Notas</FormLabel>
                  <Textarea
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    bg="#0f0f0f"
                    borderColor="whiteAlpha.200"
                  />
                </FormControl>

                <Flex justify="space-between" align="center" gap="3">
                  <Heading size="sm">Exercicios do treino</Heading>
                  <Button size="sm" leftIcon={<FiPlus />} variant="outline" colorScheme="orange" onClick={addBlankExercise}>
                    Adicionar exercicio
                  </Button>
                </Flex>

                <Stack spacing="4">
                  {draftExercises.map((exercise, exerciseIdx) => (
                    <Box key={`${exercise.name}-${exerciseIdx}`} bg="#0f0f0f" borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200" p="4">
                      <Stack spacing="3">
                        <Flex justify="space-between" align="center" gap="3" wrap="wrap">
                          <FormControl flex="1" minW="200px">
                            <FormLabel>Nome</FormLabel>
                            <Input
                              value={exercise.name}
                              onChange={(e) => updateExercise(exerciseIdx, { name: e.target.value })}
                              bg="#141414"
                              borderColor="whiteAlpha.200"
                            />
                          </FormControl>
                          <FormControl maxW="200px">
                            <FormLabel>Grupo</FormLabel>
                            <Select
                              value={exercise.muscle}
                              onChange={(e) => updateExercise(exerciseIdx, { muscle: e.target.value })}
                              bg="#141414"
                              borderColor="whiteAlpha.200"
                            >
                              {exerciseGroups.map((group) => (
                                <option key={group} value={group}>
                                  {group}
                                </option>
                              ))}
                            </Select>
                          </FormControl>
                          <IconButton
                            aria-label="Remover exercicio"
                            icon={<FiTrash2 />}
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => removeExercise(exerciseIdx)}
                          />
                        </Flex>

                        <Stack spacing="3">
                          {exercise.sets.map((set, setIdx) => (
                            <Box key={`set-${setIdx}`} bg="#141414" borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200" p="3">
                              <Flex justify="space-between" align="center" mb="3" gap="2">
                                <Text fontWeight="bold">Serie {setIdx + 1}</Text>
                                <IconButton
                                  aria-label="Remover serie"
                                  icon={<FiTrash2 />}
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={() => removeSet(exerciseIdx, setIdx)}
                                />
                              </Flex>
                              <SimpleGrid columns={[1, 2, 3]} spacing="3">
                                <FormControl>
                                  <FormLabel>Tipo</FormLabel>
                                  <Select
                                    value={set.setType}
                                    onChange={(e) => updateSet(exerciseIdx, setIdx, { setType: e.target.value as CustomSetType })}
                                    bg="#0f0f0f"
                                    borderColor="whiteAlpha.200"
                                  >
                                    {setTypeOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </Select>
                                </FormControl>
                                <FormControl>
                                  <FormLabel>Peso</FormLabel>
                                  <Input
                                    value={set.load}
                                    onChange={(e) => updateSet(exerciseIdx, setIdx, { load: e.target.value })}
                                    bg="#0f0f0f"
                                    borderColor="whiteAlpha.200"
                                  />
                                </FormControl>
                                <FormControl>
                                  <FormLabel>Reps</FormLabel>
                                  <Input
                                    value={set.reps}
                                    onChange={(e) => updateSet(exerciseIdx, setIdx, { reps: e.target.value })}
                                    bg="#0f0f0f"
                                    borderColor="whiteAlpha.200"
                                  />
                                </FormControl>
                                <FormControl>
                                  <FormLabel>RIR</FormLabel>
                                  <Input
                                    value={set.rir}
                                    onChange={(e) => updateSet(exerciseIdx, setIdx, { rir: e.target.value })}
                                    bg="#0f0f0f"
                                    borderColor="whiteAlpha.200"
                                  />
                                </FormControl>
                                <FormControl>
                                  <FormLabel>Descanso</FormLabel>
                                  <Input
                                    value={set.rest}
                                    onChange={(e) => updateSet(exerciseIdx, setIdx, { rest: e.target.value })}
                                    bg="#0f0f0f"
                                    borderColor="whiteAlpha.200"
                                  />
                                </FormControl>
                                <FormControl>
                                  <FormLabel>Notas</FormLabel>
                                  <Input
                                    value={set.notes || ''}
                                    onChange={(e) => updateSet(exerciseIdx, setIdx, { notes: e.target.value })}
                                    bg="#0f0f0f"
                                    borderColor="whiteAlpha.200"
                                  />
                                </FormControl>
                              </SimpleGrid>
                            </Box>
                          ))}
                        </Stack>

                        <Button size="sm" variant="outline" colorScheme="orange" onClick={() => addSet(exerciseIdx)}>
                          Adicionar serie
                        </Button>
                      </Stack>
                    </Box>
                  ))}

                  {draftExercises.length === 0 && (
                    <Box borderRadius="lg" border="1px dashed" borderColor="gray.600" p="5" textAlign="center" color="gray.400">
                      Adicione exercicios para montar seu treino.
                    </Box>
                  )}
                </Stack>
              </Stack>

              <Box bg="#0f0f0f" borderRadius="xl" border="1px solid" borderColor="whiteAlpha.200" p="4">
                <Heading size="sm" mb="3">
                  Biblioteca de exercicios
                </Heading>
                <Input
                  placeholder="Buscar exercicio..."
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  bg="#141414"
                  borderColor="whiteAlpha.200"
                  mb="3"
                />

                <HStack spacing="2" mb="3" flexWrap="wrap">
                  {exerciseGroupOptions.map((group) => (
                    <Button
                      key={group}
                      size="sm"
                      variant={exerciseGroup === group ? 'solid' : 'outline'}
                      colorScheme="orange"
                      onClick={() => setExerciseGroup(group)}
                    >
                      {group}
                    </Button>
                  ))}
                </HStack>

                <Stack spacing="3">
                  {filteredExerciseBank.map((ex) => (
                    <Flex key={`${ex.name}-${ex.group}`} align="center" justify="space-between" bg="#141414" p="3" borderRadius="md" border="1px solid" borderColor="whiteAlpha.200">
                      <Box>
                        <Text fontWeight="bold">{ex.name}</Text>
                        <Text fontSize="sm" color="gray.400">
                          {ex.detail}
                        </Text>
                      </Box>
                      <Button size="sm" variant="ghost" colorScheme="orange" onClick={() => addExerciseFromBank(ex.name, ex.group)}>
                        <FiPlus />
                      </Button>
                    </Flex>
                  ))}

                  {filteredExerciseBank.length === 0 && (
                    <Box borderRadius="lg" border="1px dashed" borderColor="gray.600" p="5" textAlign="center" color="gray.400">
                      Nenhum exercicio encontrado.
                    </Box>
                  )}
                </Stack>
              </Box>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={draftModal.onClose}>
              Cancelar
            </Button>
            <Button leftIcon={<FiSave />} colorScheme="orange" bg="orange.400" color="black" _hover={{ bg: 'orange.500' }} onClick={saveDraft}>
              Salvar treino
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};
