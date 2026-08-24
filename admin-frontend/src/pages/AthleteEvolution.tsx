import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  HStack,
  Icon,
  Progress,
  SimpleGrid,
  Stack,
  Text
} from '@chakra-ui/react';
import { FiActivity, FiArrowLeft, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

type CompletedSet = {
  setType?: string;
  load?: string;
  reps?: string;
  rir?: string;
  rest?: string;
  notes?: string;
  done?: boolean;
};

type CompletedExercise = {
  name?: string;
  muscle?: string;
  done?: boolean;
  sets?: CompletedSet[];
};

type CompletedTraining = {
  trainingId: string;
  completedAt: string;
  elapsedSeconds?: number;
  exercises: CompletedExercise[];
};

const COMPLETED_PREFIX = 'athlete.training.completed.';
const muscleGroups = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bracos', 'Core', 'Geral'] as const;

const toDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeGroup = (value?: string) => {
  const raw = (value || '').toLowerCase();
  if (raw.includes('peit')) return 'Peito';
  if (raw.includes('cost')) return 'Costas';
  if (raw.includes('pern')) return 'Pernas';
  if (raw.includes('ombr')) return 'Ombros';
  if (raw.includes('brac') || raw.includes('bra')) return 'Bracos';
  if (raw.includes('core')) return 'Core';
  return 'Geral';
};

const buildCompletedSessionKey = (trainingId: string, completedAt: string) =>
  `${COMPLETED_PREFIX}${trainingId}.${completedAt}`;

const loadCompletedTrainings = () => {
  const items: CompletedTraining[] = [];
  if (typeof window === 'undefined') return items;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key) keys.push(key);
  }

  keys.forEach((key) => {
    if (!key.startsWith(COMPLETED_PREFIX)) return;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as CompletedTraining;
      if (!parsed?.completedAt) return;
      const suffix = key.slice(COMPLETED_PREFIX.length);
      const hasTimestamp = suffix.includes('.');
      if (!hasTimestamp) {
        const trainingId = parsed.trainingId || suffix;
        const nextKey = buildCompletedSessionKey(trainingId, parsed.completedAt);
        if (nextKey !== key) {
          localStorage.setItem(nextKey, raw);
          localStorage.removeItem(key);
        }
      }
      items.push(parsed);
    } catch {
      // ignore broken entries
    }
  });

  return items.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
};

const buildRadarPoints = (center: number, radius: number, values: number[]) => {
  const count = values.length;
  if (count === 0) return '';
  const points = values.map((value, idx) => {
    const angle = (Math.PI * 2 * idx) / count - Math.PI / 2;
    const pointRadius = radius * value;
    const x = center + pointRadius * Math.cos(angle);
    const y = center + pointRadius * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return points.join(' ');
};

export const AthleteEvolutionPage = () => {
  const navigate = useNavigate();
  const [completedTrainings, setCompletedTrainings] = useState<CompletedTraining[]>([]);

  useEffect(() => {
    setCompletedTrainings(loadCompletedTrainings());
  }, []);

  const muscleFocus = useMemo(() => {
    const totals = new Map<string, number>();
    let totalSets = 0;

    completedTrainings.forEach((session) => {
      session.exercises?.forEach((exercise) => {
        const muscle = normalizeGroup(exercise.muscle);
        const sets = exercise.sets || [];
        const doneSets = sets.filter((set) => set.done !== false);
        const count = doneSets.length > 0 ? doneSets.length : sets.length;
        if (count === 0) return;
        totalSets += count;
        totals.set(muscle, (totals.get(muscle) || 0) + count);
      });
    });

    return muscleGroups.map((group) => {
      const value = totals.get(group) || 0;
      const percent = totalSets > 0 ? Math.round((value / totalSets) * 100) : 0;
      const level = totalSets > 0 ? Math.max(1, Math.round(percent / 5)) : 0;
      return { group, value, percent, level };
    });
  }, [completedTrainings]);

  const rankedMuscleFocus = useMemo(() => {
    return [...muscleFocus].sort((a, b) => {
      if (b.percent !== a.percent) return b.percent - a.percent;
      return a.group.localeCompare(b.group);
    });
  }, [muscleFocus]);

  const maxLoadStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        maxLoad: number;
        sets: number;
      }
    >();

    completedTrainings.forEach((session) => {
      session.exercises?.forEach((exercise) => {
        const name = exercise.name || 'Exercicio';
        const sets = exercise.sets || [];
        const doneSets = sets.filter((set) => set.done !== false);
        const setsToUse = doneSets.length > 0 ? doneSets : sets;
        setsToUse.forEach((set) => {
          const loadValue = Number(String(set.load ?? '').replace(',', '.').replace(/[^\d.]/g, ''));
          const entry = stats.get(name) || { maxLoad: 0, sets: 0 };
          entry.sets += 1;
          if (Number.isFinite(loadValue) && loadValue > entry.maxLoad) {
            entry.maxLoad = loadValue;
          }
          stats.set(name, entry);
        });
      });
    });

    return Array.from(stats.entries())
      .map(([name, info]) => ({ name, maxLoad: info.maxLoad, sets: info.sets }))
      .sort((a, b) => b.maxLoad - a.maxLoad);
  }, [completedTrainings]);

  const attendanceSummary = useMemo(() => {
    const now = new Date();
    const startWeek = new Date(now);
    startWeek.setDate(now.getDate() - 6);
    const month = now.getMonth();
    const year = now.getFullYear();

    const weekDays = new Set<string>();
    const monthDays = new Set<string>();
    const yearDays = new Set<string>();

    completedTrainings.forEach((session) => {
      const date = new Date(session.completedAt);
      if (Number.isNaN(date.getTime())) return;
      const key = toDayKey(date);
      if (date >= startWeek) weekDays.add(key);
      if (date.getFullYear() === year && date.getMonth() === month) monthDays.add(key);
      if (date.getFullYear() === year) yearDays.add(key);
    });

    return {
      weekCount: weekDays.size,
      monthCount: monthDays.size,
      yearCount: yearDays.size,
      recent: completedTrainings.slice(0, 6)
    };
  }, [completedTrainings]);

  const radarData = useMemo(() => {
    const values = muscleFocus.map((item) => Math.min(1, Math.max(0, item.percent / 100)));
    const size = 260;
    const center = size / 2;
    const radius = 95;
    const rings = [0.25, 0.5, 0.75, 1].map((level) => ({
      level,
      points: buildRadarPoints(center, radius, values.map(() => level))
    }));
    const axes = muscleFocus.map((_, idx) => {
      const angle = (Math.PI * 2 * idx) / muscleFocus.length - Math.PI / 2;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
        angle
      };
    });
    const polygon = buildRadarPoints(center, radius, values);
    return { size, center, radius, rings, axes, polygon };
  }, [muscleFocus]);

  return (
    <Box minH="100vh" bg="#0a0a0a" color="white" fontFamily="'Inter', system-ui, sans-serif">
      <Flex align="center" justify="space-between" px={[4, 8]} py="6" wrap="wrap" gap="3">
        <Box>
          <Heading size="lg">Evolucao</Heading>
          <Text color="gray.300">Acompanhe seu progresso em treinos e habitos.</Text>
        </Box>
        <HStack spacing="3">
          <Button
            variant="outline"
            borderColor="orange.400"
            color="orange.300"
            _hover={{ bg: 'orange.500', color: 'black' }}
            onClick={() => setCompletedTrainings(loadCompletedTrainings())}
          >
            Atualizar
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
          <SimpleGrid columns={[1, null, 2]} spacing="6">
            <Box bg="#141414" border="1px solid" borderColor="whiteAlpha.200" borderRadius="2xl" p="6" boxShadow="lg">
              <HStack spacing="3" mb="4">
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
                  <Icon as={FiTrendingUp} color="orange.300" />
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="lg">
                    Mapa de foco muscular (RPG)
                  </Text>
                  <Text color="gray.400" fontSize="sm">
                    Distribuicao de series concluidas por grupo muscular.
                  </Text>
                </Box>
              </HStack>

              <Stack spacing="4">
                <Flex justify="center">
                  <Box
                    as="svg"
                    width="260px"
                    height="260px"
                    viewBox={`0 0 ${radarData.size} ${radarData.size}`}
                  >
                    {radarData.rings.map((ring) => (
                      <polygon
                        key={`ring-${ring.level}`}
                        points={ring.points}
                        fill="none"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="1"
                      />
                    ))}
                    {radarData.axes.map((axis, idx) => (
                      <line
                        key={`axis-${idx}`}
                        x1={radarData.center}
                        y1={radarData.center}
                        x2={axis.x}
                        y2={axis.y}
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="1"
                      />
                    ))}
                    <polygon points={radarData.polygon} fill="rgba(251, 202, 21, 0.22)" stroke="#facc15" strokeWidth="2" />
                    {radarData.axes.map((axis, idx) => {
                      const labelRadius = radarData.radius + 18;
                      const labelX = radarData.center + labelRadius * Math.cos(axis.angle);
                      const labelY = radarData.center + labelRadius * Math.sin(axis.angle);
                      const anchor = Math.cos(axis.angle) > 0.2 ? 'start' : Math.cos(axis.angle) < -0.2 ? 'end' : 'middle';
                      return (
                        <text
                          key={`label-${idx}`}
                          x={labelX}
                          y={labelY}
                          fill="rgba(255,255,255,0.7)"
                          fontSize="12"
                          textAnchor={anchor}
                          dominantBaseline="middle"
                        >
                          {muscleFocus[idx]?.group}
                        </text>
                      );
                    })}
                  </Box>
                </Flex>

                <SimpleGrid columns={[2, null, 3]} spacing="3">
                  {rankedMuscleFocus.map((item, idx) => (
                    <Box key={item.group} bg="blackAlpha.400" borderRadius="lg" p="3" border="1px solid" borderColor="whiteAlpha.100">
                      <Text fontWeight="bold">{item.group}</Text>
                      <HStack spacing="2" mt="1">
                        <Badge colorScheme={item.level >= 12 ? 'green' : item.level >= 6 ? 'yellow' : 'gray'}>
                          Foco {idx + 1}
                        </Badge>
                        <Text color="gray.400" fontSize="sm">
                          {item.percent}%
                        </Text>
                      </HStack>
                    </Box>
                  ))}
                </SimpleGrid>

                {completedTrainings.length === 0 && (
                  <Box border="1px dashed" borderColor="gray.600" borderRadius="lg" p="4" textAlign="center" color="gray.400">
                    Nenhum treino concluido ainda.
                  </Box>
                )}
              </Stack>
            </Box>

            <Box bg="#141414" border="1px solid" borderColor="whiteAlpha.200" borderRadius="2xl" p="6" boxShadow="lg">
              <HStack spacing="3" mb="4">
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
                  <Icon as={FiActivity} color="orange.300" />
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="lg">
                    Evolucao de cargas (recorde)
                  </Text>
                  <Text color="gray.400" fontSize="sm">
                    Maior carga registrada por exercicio.
                  </Text>
                </Box>
              </HStack>

              <Stack spacing="3">
                <Box maxH="420px" overflowY="auto" pr="1">
                  <Stack spacing="3">
                    {maxLoadStats.map((item) => (
                      <Box key={item.name} bg="blackAlpha.400" borderRadius="lg" p="3" border="1px solid" borderColor="whiteAlpha.100">
                        <Flex justify="space-between" align="center" mb="2">
                          <Text fontWeight="bold">{item.name}</Text>
                          <Badge colorScheme="orange">{item.maxLoad} kg</Badge>
                        </Flex>
                        <Progress
                          value={maxLoadStats[0]?.maxLoad ? (item.maxLoad / maxLoadStats[0].maxLoad) * 100 : 0}
                          size="sm"
                          colorScheme="orange"
                          bg="whiteAlpha.200"
                          borderRadius="full"
                        />
                        <Text color="gray.500" fontSize="xs" mt="2">
                          {item.sets} series registradas
                        </Text>
                      </Box>
                    ))}
                    {maxLoadStats.length === 0 && (
                      <Box border="1px dashed" borderColor="gray.600" borderRadius="lg" p="4" textAlign="center" color="gray.400">
                        Nenhuma carga registrada ainda.
                      </Box>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </SimpleGrid>

          <Box bg="#141414" border="1px solid" borderColor="whiteAlpha.200" borderRadius="2xl" p="6" boxShadow="lg">
            <HStack spacing="3" mb="4">
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
                <Icon as={FiCalendar} color="orange.300" />
              </Box>
              <Box>
                <Text fontWeight="bold" fontSize="lg">
                  Anotacoes de treinos
                </Text>
                <Text color="gray.400" fontSize="sm">
                  Dias com treino concluido na semana, mes e ano.
                </Text>
              </Box>
            </HStack>

            <SimpleGrid columns={[1, null, 3]} spacing="4" mb="6">
              <Box bg="blackAlpha.400" borderRadius="lg" p="4" border="1px solid" borderColor="whiteAlpha.100">
                <Text color="gray.400" fontSize="sm">
                  Semana
                </Text>
                <Text fontSize="3xl" fontWeight="bold">
                  {attendanceSummary.weekCount}
                </Text>
                <Text color="gray.500" fontSize="sm">
                  dias treinados
                </Text>
              </Box>
              <Box bg="blackAlpha.400" borderRadius="lg" p="4" border="1px solid" borderColor="whiteAlpha.100">
                <Text color="gray.400" fontSize="sm">
                  Mes
                </Text>
                <Text fontSize="3xl" fontWeight="bold">
                  {attendanceSummary.monthCount}
                </Text>
                <Text color="gray.500" fontSize="sm">
                  dias treinados
                </Text>
              </Box>
              <Box bg="blackAlpha.400" borderRadius="lg" p="4" border="1px solid" borderColor="whiteAlpha.100">
                <Text color="gray.400" fontSize="sm">
                  Ano
                </Text>
                <Text fontSize="3xl" fontWeight="bold">
                  {attendanceSummary.yearCount}
                </Text>
                <Text color="gray.500" fontSize="sm">
                  dias treinados
                </Text>
              </Box>
            </SimpleGrid>

            <Divider borderColor="whiteAlpha.200" mb="4" />

            <Stack spacing="3">
              {attendanceSummary.recent.map((session) => {
                const date = new Date(session.completedAt);
                return (
                  <Flex
                    key={`${session.trainingId}-${session.completedAt}`}
                    justify="space-between"
                    align="center"
                    bg="blackAlpha.400"
                    borderRadius="lg"
                    p="3"
                    border="1px solid"
                    borderColor="whiteAlpha.100"
                  >
                    <Text fontWeight="bold">
                      {Number.isNaN(date.getTime()) ? 'Treino concluido' : date.toLocaleDateString('pt-BR')}
                    </Text>
                    <Text color="gray.400" fontSize="sm">
                      {Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </Flex>
                );
              })}
              {attendanceSummary.recent.length === 0 && (
                <Box border="1px dashed" borderColor="gray.600" borderRadius="lg" p="4" textAlign="center" color="gray.400">
                  Nenhum treino concluido ainda.
                </Box>
              )}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};
