import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../api/client';
import { PersonalProfile } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { Screen } from '../components/Screen';
import { theme } from '../theme';

export const PersonalProfileScreen = () => {
  const { token, updateUser, signOut } = useAuth();
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    cpf: '',
    cref: ''
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await api.getPersonalMe(token);
        setProfile(data);
        setForm({
          name: data?.name || '',
          phone: data?.phone || '',
          cpf: data?.cpf || '',
          cref: data?.cref || ''
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        cpf: form.cpf.trim() || null,
        cref: form.cref.trim() || null
      };
      const data = await api.updatePersonalMe(token, payload);
      setProfile((prev) => (prev ? { ...prev, ...data } : data));
      await updateUser({ name: data?.name });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Text style={styles.title}>Meu perfil</Text>
          <Text style={styles.subtitle}>Atualize seus dados de contato e registro profissional.</Text>

          {loading ? (
            <Text style={styles.muted}>Carregando perfil...</Text>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Nome"
                placeholderTextColor={theme.colors.textDim}
                value={form.name}
                onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="Telefone"
                placeholderTextColor={theme.colors.textDim}
                value={form.phone}
                onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="CPF"
                placeholderTextColor={theme.colors.textDim}
                value={form.cpf}
                onChangeText={(value) => setForm((prev) => ({ ...prev, cpf: value }))}
              />
              <TextInput
                style={styles.input}
                placeholder="CREF"
                placeholderTextColor={theme.colors.textDim}
                value={form.cref}
                onChangeText={(value) => setForm((prev) => ({ ...prev, cref: value }))}
              />
              <TextInput
                style={styles.input}
                value={profile?.user?.email || ''}
                editable={false}
              />
              <AppButton title="Salvar" onPress={handleSave} loading={saving} tone="yellow" />
            </>
          )}
        </Card>

        <View style={styles.logout}>
          <AppButton title="Sair" onPress={signOut} variant="outline" tone="yellow" />
        </View>
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
    marginBottom: theme.spacing.sm
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
  logout: {
    marginTop: theme.spacing.sm
  }
});
