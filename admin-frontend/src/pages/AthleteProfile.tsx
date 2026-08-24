import { useEffect, useState, type ChangeEvent } from 'react';
import {
  Avatar,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useToast
} from '@chakra-ui/react';
import { FiArrowLeft, FiSave, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';
import { api } from '../services/api';

type PaymentMethod = 'PIX' | 'DINHEIRO' | 'CARTAO';

type AthleteProfile = {
  id: string;
  name: string;
  age?: number | null;
  document?: string | null;
  phone?: string | null;
  cep?: string | null;
  paymentMethod?: PaymentMethod | null;
  avatarUrl?: string | null;
  user?: { email?: string };
  personal?: { id: string; name: string };
};

type ProfileForm = {
  name: string;
  age: string;
  document: string;
  phone: string;
  cep: string;
  paymentMethod: '' | PaymentMethod;
  avatarUrl: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const MAX_IMAGE_BYTES = 300 * 1024;

export const AthleteProfilePage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { updateUser } = useAuth();

  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    name: '',
    age: '',
    document: '',
    phone: '',
    cep: '',
    paymentMethod: '',
    avatarUrl: ''
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/athlete/me');
      setProfile(data);
      setForm({
        name: data?.name || '',
        age: data?.age != null ? String(data.age) : '',
        document: data?.document || '',
        phone: data?.phone || '',
        cep: data?.cep || '',
        paymentMethod: data?.paymentMethod || '',
        avatarUrl: data?.avatarUrl || ''
      });
    } catch {
      toast({ title: 'Nao foi possivel carregar o perfil', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo invalido', description: 'Selecione uma imagem', status: 'warning' });
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      toast({ title: 'Imagem muito grande', description: 'Envie uma imagem leve (ate 300KB).', status: 'warning' });
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, avatarUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setForm((prev) => ({ ...prev, avatarUrl: '' }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Informe o nome', status: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        age: form.age ? Number(form.age) : null,
        document: form.document.trim() ? form.document.trim() : null,
        phone: form.phone.trim() ? form.phone.trim() : null,
        cep: form.cep.trim() ? form.cep.trim() : null,
        paymentMethod: form.paymentMethod ? form.paymentMethod : null,
        avatarUrl: form.avatarUrl ? form.avatarUrl : null
      };
      const { data } = await api.put('/athlete/me', payload);
      setProfile((prev) => (prev ? { ...prev, ...data } : data));
      updateUser({ name: data?.name, avatarUrl: data?.avatarUrl ?? null });
      toast({ title: 'Perfil atualizado', status: 'success' });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Nao foi possivel atualizar o perfil';
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast({ title: 'Preencha as senhas', status: 'warning' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: 'Nova senha muito curta', status: 'warning' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: 'As senhas nao conferem', status: 'warning' });
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/athlete/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast({ title: 'Senha atualizada', status: 'success' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Nao foi possivel atualizar a senha';
      toast({ title: 'Erro', description: message, status: 'error' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Box minH="100vh" bg="#0a0a0a" color="white" fontFamily="'Inter', system-ui, sans-serif">
      <Flex align="center" justify="space-between" px={[4, 8]} py="6" wrap="wrap" gap="3">
        <Box>
          <Heading size="lg">Perfil do aluno</Heading>
          <Text color="gray.300">Atualize seus dados pessoais.</Text>
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
        <Box
          bg="#141414"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="2xl"
          p={['5', '6']}
          boxShadow="lg"
        >
          {loading ? (
            <Flex align="center" justify="center" py="10">
              <Spinner />
            </Flex>
          ) : (
            <Stack spacing="6">
              <Flex align="center" gap="5" wrap="wrap">
                <Avatar
                  size="xl"
                  name={form.name || profile?.user?.email || 'Aluno'}
                  src={form.avatarUrl || undefined}
                  bg="gray.700"
                />
                <Stack spacing="2" flex="1" minW="240px">
                  <FormControl>
                    <FormLabel>Foto de perfil</FormLabel>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      bg="#0f0f10"
                      borderColor="whiteAlpha.200"
                      p="1.5"
                    />
                    <Text fontSize="xs" color="gray.400" mt="1">
                      Envie JPG ou PNG com ate 300KB.
                    </Text>
                  </FormControl>
                  {form.avatarUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<FiTrash2 />}
                      borderColor="whiteAlpha.300"
                      color="gray.200"
                      _hover={{ bg: 'whiteAlpha.100' }}
                      alignSelf="flex-start"
                      onClick={handleRemoveAvatar}
                    >
                      Remover foto
                    </Button>
                  )}
                </Stack>
              </Flex>

              <SimpleGrid columns={[1, 2]} spacing="4">
                <FormControl>
                  <FormLabel>Nome</FormLabel>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    bg="#0f0f10"
                    borderColor="whiteAlpha.200"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Idade</FormLabel>
                  <Input
                    type="number"
                    value={form.age}
                    onChange={(e) => setForm((prev) => ({ ...prev, age: e.target.value }))}
                    bg="#0f0f10"
                    borderColor="whiteAlpha.200"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Documento</FormLabel>
                  <Input
                    value={form.document}
                    onChange={(e) => setForm((prev) => ({ ...prev, document: e.target.value }))}
                    bg="#0f0f10"
                    borderColor="whiteAlpha.200"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Telefone</FormLabel>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    bg="#0f0f10"
                    borderColor="whiteAlpha.200"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>CEP</FormLabel>
                  <Input
                    value={form.cep}
                    onChange={(e) => setForm((prev) => ({ ...prev, cep: e.target.value }))}
                    bg="#0f0f10"
                    borderColor="whiteAlpha.200"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Forma de pagamento</FormLabel>
                  <Select
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, paymentMethod: e.target.value as PaymentMethod | '' }))
                    }
                    placeholder="Selecione"
                    bg="#0f0f10"
                    borderColor="whiteAlpha.200"
                  >
                    <option value="PIX">PIX</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="CARTAO">Cartao</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={[1, 2]} spacing="4">
                <FormControl isReadOnly>
                  <FormLabel>Email</FormLabel>
                  <Input value={profile?.user?.email || ''} bg="#0f0f10" borderColor="whiteAlpha.200" />
                </FormControl>
                <FormControl isReadOnly>
                  <FormLabel>Personal responsavel</FormLabel>
                  <Input value={profile?.personal?.name || ''} bg="#0f0f10" borderColor="whiteAlpha.200" />
                </FormControl>
              </SimpleGrid>

              <Box
                bg="#0f0f10"
                border="1px solid"
                borderColor="whiteAlpha.200"
                borderRadius="xl"
                p="5"
              >
                <HStack justify="space-between" mb="4" flexWrap="wrap" gap="2">
                  <Text fontWeight="bold">Alterar senha</Text>
                  <Text color="gray.400" fontSize="sm">
                    Minimo de 6 caracteres.
                  </Text>
                </HStack>
                <SimpleGrid columns={[1, 2]} spacing="4">
                  <FormControl>
                    <FormLabel>Senha atual</FormLabel>
                    <Input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      bg="#141414"
                      borderColor="whiteAlpha.200"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Nova senha</FormLabel>
                    <Input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      bg="#141414"
                      borderColor="whiteAlpha.200"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Confirmar nova senha</FormLabel>
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      bg="#141414"
                      borderColor="whiteAlpha.200"
                    />
                  </FormControl>
                </SimpleGrid>
                <Button
                  mt="4"
                  colorScheme="orange"
                  bg="orange.400"
                  color="black"
                  _hover={{ bg: 'orange.500' }}
                  onClick={handlePasswordSave}
                  isLoading={savingPassword}
                >
                  Atualizar senha
                </Button>
              </Box>

              <Button
                leftIcon={<FiSave />}
                colorScheme="orange"
                bg="orange.400"
                color="black"
                _hover={{ bg: 'orange.500' }}
                alignSelf="flex-start"
                onClick={handleSave}
                isLoading={saving}
              >
                Salvar alteracoes
              </Button>
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
};
