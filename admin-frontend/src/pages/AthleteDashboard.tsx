import { useEffect, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  HStack,
  Icon,
  IconButton,
  Stack,
  Text,
  VStack,
  useToast
} from '@chakra-ui/react';
import {
  FiBell,
  FiCalendar,
  FiChevronRight,
  FiMenu,
  FiMessageSquare,
  FiPlay,
  FiTarget,
  FiTrendingUp,
  FiUser
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';
import { api } from '../services/api';

type TodayTraining = {
  id: string;
  title: string;
  notes?: string | null;
  exercises?: unknown;
};

type PersonalNotice = {
  id: string;
  title?: string | null;
  message: string;
  createdAt: string;
};

const weekDayKeys = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

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

const quickActions = [
  { title: 'Treino', subtitle: 'Plano atual', icon: FiTarget, to: '/athlete/trainings' },
  { title: 'Evolução', subtitle: 'Seu progresso', icon: FiTrendingUp, to: '/athlete/evolution' },
  { title: 'Chat', subtitle: 'Fale com o personal', icon: FiMessageSquare, to: '/athlete/chat' }
];

export const AthleteDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Aluno';
  const [todayTraining, setTodayTraining] = useState<TodayTraining | null>(null);
  const [loadingTraining, setLoadingTraining] = useState(false);
  const [todayTrainingBlocked, setTodayTrainingBlocked] = useState(false);
  const [todayTrainingBlockMessage, setTodayTrainingBlockMessage] = useState('');

  const [personalNotices, setPersonalNotices] = useState<PersonalNotice[]>([]);
  const [loadingNotices, setLoadingNotices] = useState(false);

  useEffect(() => {
    const loadTodayTraining = async () => {
      setLoadingTraining(true);
      setTodayTrainingBlocked(false);
      setTodayTrainingBlockMessage('');
      try {
        const todayKey = weekDayKeys[new Date().getDay()];
        const { data } = await api.get('/athlete/today-training', { params: { day: todayKey } });
        setTodayTraining(data?.training || null);
      } catch (err: any) {
        const code = err?.response?.data?.code;
        const message = err?.response?.data?.message;
        if (code === 'TRAINING_BLOCKED') {
          setTodayTraining(null);
          setTodayTrainingBlocked(true);
          setTodayTrainingBlockMessage(message || 'Treino do personal bloqueado. Pagamento pendente.');
          return;
        }
        toast({ title: 'NÇœo foi possÇðvel carregar o treino de hoje', status: 'error' });
      } finally {
        setLoadingTraining(false);
      }
    };

    loadTodayTraining();
  }, [toast]);

  useEffect(() => {
    const loadNotices = async () => {
      setLoadingNotices(true);
      try {
        const { data } = await api.get('/athlete/notices', { params: { limit: 5 } });
        setPersonalNotices(data || []);
      } catch {
        toast({ title: 'Nao foi possivel carregar os avisos', status: 'error' });
      } finally {
        setLoadingNotices(false);
      }
    };

    loadNotices();
  }, [toast]);


  const exercisesCount = Array.isArray((todayTraining as any)?.exercises)
    ? (todayTraining as any).exercises.length
    : 0;

  const combinedNotices = [...personalNotices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .map((notice) => ({
      id: notice.id,
      title: notice.title?.trim() || 'Aviso do personal',
      desc: notice.message,
      time: formatTimeAgo(notice.createdAt)
    }));

  return (
    <Box minH="100vh" bg="#0a0a0a" color="white" fontFamily="'Inter', system-ui, sans-serif">
      {/* Top bar */}
      <Flex align="center" justify="space-between" px={[4, 8]} py="4" flexWrap="wrap" gap="4">
        <HStack spacing="3">
          <Box w="38px" h="38px" borderRadius="full" bg="orange.400" />
          <Text fontSize="lg" fontWeight="bold">
            HubGym
          </Text>
        </HStack>
        <Flex flex="1" justify="center">
          <Flex
            w={['100%', '360px', '420px']}
            bg="#0f0f0f"
            border="1px solid"
            borderColor="whiteAlpha.200"
            borderRadius="full"
            align="center"
            justify="space-between"
            px="6"
            py="3"
          >
            <IconButton
              aria-label="Evolucao"
              icon={<FiMenu />}
              variant="ghost"
              size="sm"
              color="orange.300"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => navigate('/athlete/evolution')}
            />
            <IconButton
              aria-label="Treinos"
              icon={<FiPlay />}
              variant="ghost"
              size="sm"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => navigate('/athlete/trainings')}
            />
            <IconButton
              aria-label="Chat"
              icon={<FiMessageSquare />}
              variant="ghost"
              size="sm"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => navigate('/athlete/chat')}
            />
            <IconButton
              aria-label="Perfil"
              icon={<FiUser />}
              variant="ghost"
              size="sm"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => navigate('/athlete/profile')}
            />
          </Flex>
        </Flex>
        <HStack spacing="4" flexWrap="wrap">
          <Icon as={FiBell} boxSize="5" />
          <Avatar size="sm" name={user?.email || 'Aluno'} src={user?.avatarUrl || undefined} />
          <Button
            size="sm"
            variant="outline"
            borderColor="orange.400"
            color="orange.300"
            _hover={{ bg: 'orange.500', color: 'black' }}
            onClick={logout}
          >
            Sair
          </Button>
        </HStack>
      </Flex>

      <Box px={[4, 8]} pb="10">
        <Stack spacing="2" mb="6">
          <Text fontSize="3xl" fontWeight="bold">
            Olá, <Text as="span" color="orange.300">{displayName}</Text>
          </Text>
          <Text color="gray.300">Pronto para o treino de hoje?</Text>
        </Stack>

        {/* Quick actions */}
        <Grid templateColumns={['repeat(1,1fr)', null, 'repeat(3,1fr)']} gap="4" mb="8">
          {quickActions.map((item) => {
            const isClickable = Boolean(item.to);
            return (
              <GridItem
                key={item.title}
                bg="#141414"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="2xl"
                p="5"
                boxShadow="lg"
                cursor={isClickable ? 'pointer' : 'default'}
                _hover={isClickable ? { borderColor: 'orange.300', transform: 'translateY(-2px)' } : undefined}
                transition="all 0.2s"
                onClick={() => (item.to ? navigate(item.to) : undefined)}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : -1}
                onKeyDown={(event) => {
                  if (!item.to) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(item.to);
                  }
                }}
              >
                <VStack align="start" spacing="3">
                  <Flex
                    w="10"
                    h="10"
                    borderRadius="full"
                    bg="black"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    align="center"
                    justify="center"
                  >
                    <Icon as={item.icon} color="orange.300" />
                  </Flex>
                  <Text fontWeight="bold">{item.title}</Text>
                  <Text fontSize="sm" color="gray.400">
                    {item.subtitle}
                  </Text>
                </VStack>
              </GridItem>
            );
          })}
        </Grid>

        <Grid templateColumns={['1fr', null, '2fr 1fr']} gap="6">
          <GridItem>
            <Stack spacing="4">
              <HStack spacing="2" color="orange.300">
                <Icon as={FiCalendar} display="none" />
                <Text fontWeight="bold">Treino do Dia</Text>
              </HStack>

              <Box
                bgGradient="linear(to-r, #0d0d0f, #0b0b0c)"
                borderRadius="2xl"
                border="1px solid"
                borderColor="whiteAlpha.200"
                p="6"
                position="relative"
                overflow="hidden"
              >
                <Badge bg="black" color="gray.200" border="1px solid #2d2d2d" borderRadius="full" px="3" py="1" mb="4">
                  {todayTrainingBlocked ? 'Bloqueado' : todayTraining ? 'Programado' : 'Sem treino'}
                </Badge>
                <Stack spacing="2" mb="6">
                  <Text fontSize="2xl" fontWeight="bold">
                    {todayTrainingBlocked ? 'Treino bloqueado' : todayTraining?.title || 'Nenhum treino programado'}
                  </Text>
                  <Text color="gray.300" maxW="lg">
                    {loadingTraining
                      ? 'Carregando treino do dia...'
                      : todayTrainingBlocked
                        ? todayTrainingBlockMessage || 'Treino do personal bloqueado. Pagamento pendente.'
                        : todayTraining?.notes || 'Aguarde o personal programar o treino para hoje.'}
                  </Text>
                  <HStack spacing="4" color="gray.400" fontSize="sm">
                    <HStack spacing="1">
                      <Icon as={FiTarget} />
                      <Text>{exercisesCount} Exercícios</Text>
                    </HStack>
                    <HStack spacing="1">
                      <Icon as={FiTrendingUp} />
                      <Text>{todayTrainingBlocked ? 'Bloqueado' : todayTraining ? 'Preparado' : 'Sem treino'}</Text>
                    </HStack>
                  </HStack>
                </Stack>
                <Button
                  leftIcon={<FiPlay />}
                  colorScheme="orange"
                  bg="orange.400"
                  _hover={{ bg: 'orange.500' }}
                  color="black"
                  borderRadius="full"
                  px="6"
                  onClick={() =>
                    todayTraining &&
                    !todayTrainingBlocked &&
                    navigate(`/athlete/trainings/${todayTraining.id}`, { state: { autoStart: true } })
                  }
                  isDisabled={!todayTraining || todayTrainingBlocked}
                >
                  Começar
                </Button>
              </Box>
            </Stack>
          </GridItem>

          <GridItem>
            <Box
              bg="#141414"
              borderRadius="2xl"
              border="1px solid"
              borderColor="whiteAlpha.200"
              p="5"
              boxShadow="lg"
            >
              <HStack justify="space-between" mb="4">
                <Text fontWeight="bold">Avisos Recentes</Text>
                <HStack spacing="1" color="orange.300" fontSize="sm">
                  <Text>Ver todos</Text>
                  <Icon as={FiChevronRight} />
                </HStack>
              </HStack>

              {loadingNotices && combinedNotices.length === 0 ? (
                <Flex align="center" justify="center" py="6" color="gray.400">
                  Carregando avisos...
                </Flex>
              ) : combinedNotices.length === 0 ? (
                <Box bg="blackAlpha.500" borderRadius="lg" p="3" border="1px solid" borderColor="whiteAlpha.200">
                  <Text fontWeight="bold" color="orange.300">Nenhum aviso recente</Text>
                  <Text color="gray.400" fontSize="sm">Os avisos do seu personal aparecerao aqui.</Text>
                </Box>
              ) : (
                <Stack spacing="3">
                  {combinedNotices.map((n, idx) => (
                    <Box
                      key={n.id}
                      bg={idx === 0 ? 'blackAlpha.500' : 'transparent'}
                      borderRadius="lg"
                      p="3"
                      border="1px solid"
                      borderColor={idx === 0 ? 'whiteAlpha.200' : 'transparent'}
                    >
                      <Text fontWeight="bold" color={idx === 0 ? 'orange.300' : 'white'}>
                        {n.title}
                      </Text>
                      <Text color="gray.400" fontSize="sm">
                        {n.desc}
                      </Text>
                      {n.time && (
                        <Text mt="1" color="gray.500" fontSize="xs">
                          {n.time}
                        </Text>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </GridItem>
        </Grid>
      </Box>
    </Box>
  );
};

