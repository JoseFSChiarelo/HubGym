import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { api } from '../api/client';
import { AthleteProfile, PaymentMethod } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { theme } from '../theme';

const paymentMethods: Array<PaymentMethod> = ['PIX', 'DINHEIRO', 'CARTAO'];

export const AthleteProfileScreen = () => {
  const { token, updateUser } = useAuth();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [form, setForm] = useState({
    name: '',
    age: '',
    document: '',
    phone: '',
    cep: '',
    paymentMethod: '' as '' | PaymentMethod,
    avatarUrl: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await api.getAthleteMe(token);
        setProfile(data);
        setForm({
          name: data?.name || '',
          age: data?.age != null ? String(data.age) : '',
          document: data?.document || '',
          phone: data?.phone || '',
          cep: data?.cep || '',
          paymentMethod: paymentMethods.includes(data?.paymentMethod as PaymentMethod)
            ? (data?.paymentMethod as PaymentMethod)
            : '',
          avatarUrl: data?.avatarUrl || ''
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.base64) return;
    const base64 = `data:image/jpeg;base64,${asset.base64}`;
    setForm((prev) => ({ ...prev, avatarUrl: base64 }));
  };

  const handleSave = async () => {
    if (!token) return;
    if (!form.name.trim()) return;
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
      const data = await api.updateAthleteMe(token, payload);
      setProfile((prev) => (prev ? { ...prev, ...data } : data));
      await updateUser({ name: data?.name, avatarUrl: data?.avatarUrl ?? null });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!token) return;
    if (!passwordForm.currentPassword || !passwordForm.newPassword) return;
    if (passwordForm.newPassword.length < 6) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return;

    setSavingPassword(true);
    try {
      await api.updateAthletePassword(token, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <Card>
          <Text style={styles.muted}>Carregando perfil...</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Text style={styles.title}>Perfil do aluno</Text>
          <Text style={styles.subtitle}>Atualize seus dados pessoais.</Text>

          <View style={styles.avatarRow}>
            <View style={styles.avatarBox}>
              {form.avatarUrl ? (
                <Image source={{ uri: form.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarFallback}>{form.name?.[0]?.toUpperCase() || 'A'}</Text>
              )}
            </View>
            <View style={styles.avatarActions}>
              <AppButton title="Escolher foto" onPress={pickAvatar} variant="outline" />
              {form.avatarUrl ? (
                <AppButton title="Remover foto" onPress={() => setForm((prev) => ({ ...prev, avatarUrl: '' }))} variant="ghost" />
              ) : null}
            </View>
          </View>

          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
            placeholder="Nome"
            placeholderTextColor={theme.colors.textDim}
          />
          <TextInput
            style={styles.input}
            value={form.age}
            onChangeText={(value) => setForm((prev) => ({ ...prev, age: value }))}
            placeholder="Idade"
            placeholderTextColor={theme.colors.textDim}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            value={form.document}
            onChangeText={(value) => setForm((prev) => ({ ...prev, document: value }))}
            placeholder="Documento"
            placeholderTextColor={theme.colors.textDim}
          />
          <TextInput
            style={styles.input}
            value={form.phone}
            onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
            placeholder="Telefone"
            placeholderTextColor={theme.colors.textDim}
          />
          <TextInput
            style={styles.input}
            value={form.cep}
            onChangeText={(value) => setForm((prev) => ({ ...prev, cep: value }))}
            placeholder="CEP"
            placeholderTextColor={theme.colors.textDim}
          />

          <Text style={styles.label}>Forma de pagamento</Text>
          <View style={styles.paymentRow}>
            {paymentMethods.map((method) => (
              <Pressable
                key={method}
                style={[styles.paymentChip, form.paymentMethod === method && styles.paymentChipActive]}
                onPress={() => setForm((prev) => ({ ...prev, paymentMethod: method }))}
              >
                <Text style={[styles.paymentText, form.paymentMethod === method && styles.paymentTextActive]}>{method}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput style={styles.input} value={profile?.user?.email || ''} editable={false} />
          <TextInput style={styles.input} value={profile?.personal?.name || ''} editable={false} />

          <AppButton title="Salvar alteracoes" onPress={handleSave} loading={saving} />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Alterar senha</Text>
          <Text style={styles.muted}>Minimo de 6 caracteres.</Text>
          <TextInput
            style={styles.input}
            value={passwordForm.currentPassword}
            onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
            placeholder="Senha atual"
            placeholderTextColor={theme.colors.textDim}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={passwordForm.newPassword}
            onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
            placeholder="Nova senha"
            placeholderTextColor={theme.colors.textDim}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={passwordForm.confirmPassword}
            onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))}
            placeholder="Confirmar nova senha"
            placeholderTextColor={theme.colors.textDim}
            secureTextEntry
          />
          <AppButton title="Atualizar senha" onPress={handlePasswordSave} loading={savingPassword} />
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl
  },
  scroll: {
    paddingBottom: theme.spacing.xxl
  },
  card: {
    marginBottom: theme.spacing.lg
  },
  title: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 20
  },
  subtitle: {
    color: theme.colors.textDim,
    marginTop: 4,
    marginBottom: theme.spacing.md
  },
  muted: {
    color: theme.colors.textDim,
    fontSize: 12
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: theme.spacing.md
  },
  avatarBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceAlt
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  avatarFallback: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 24
  },
  avatarActions: {
    flex: 1,
    gap: 8
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    backgroundColor: theme.colors.bgAlt,
    marginBottom: theme.spacing.sm
  },
  label: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: 6
  },
  paymentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.md
  },
  paymentChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  paymentChipActive: {
    backgroundColor: theme.colors.accent
  },
  paymentText: {
    color: theme.colors.textDim,
    fontFamily: theme.fonts.semibold,
    fontSize: 12
  },
  paymentTextActive: {
    color: '#0a0a0a'
  },
  sectionTitle: {
    fontFamily: theme.fonts.semibold,
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 4
  }
});
