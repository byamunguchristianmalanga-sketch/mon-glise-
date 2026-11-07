import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from './supabase';
import AuthScreen from './AuthScreen';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // --- GESTION DE LA SESSION ---
  useEffect(() => {
    // Vérifier s'il y a déjà une session au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    // Écouter les changements (connexion / déconnexion)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  if (loadingSession) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  // Si pas connecté, on affiche l'écran de connexion
  if (!session) {
    return <AuthScreen />;
  }

  // Si connecté, on affiche l'application normale
  return <MainApp session={session} />;
}

// --- COMPOSANT PRINCIPAL (Une fois connecté) ---
function MainApp({ session }: { session: any }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [membres, setMembres] = useState<any[]>([]);
  const [loadingListe, setLoadingListe] = useState(true);
  const [churchId, setChurchId] = useState<string | null>(null);

  useEffect(() => {
    chargerEgliseEtMembres();
  }, []);

  async function chargerEgliseEtMembres() {
    setLoadingListe(true);
    // 1. Trouver l'église de l'utilisateur connecté
    const { data: churches, error: churchError } = await supabase
      .from('churches')
      .select('id')
      .eq('owner_id', session.user.id)
      .single();

    if (churchError || !churches) {
      Alert.alert("Erreur", "Impossible de trouver votre église.");
      setLoadingListe(false);
      return;
    }

    setChurchId(churches.id);

    // 2. Charger les membres de CETTE église uniquement
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('church_id', churches.id)
      .order('created_at', { ascending: false });

    if (!error) setMembres(data || []);
    setLoadingListe(false);
  }

  async function ajouterMembre() {
    if (!firstName || !lastName || !churchId) return;

    setLoading(true);
    const { error } = await supabase
      .from('members')
      .insert([{ first_name: firstName, last_name: lastName, church_id: churchId }]);

    if (error) Alert.alert("Erreur", error.message);
    else {
      setFirstName('');
      setLastName('');
      await chargerEgliseEtMembres();
    }
    setLoading(false);
  }

  async function seDeconnecter() {
    await supabase.auth.signOut();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mon Église</Text>
          <TouchableOpacity onPress={seDeconnecter}>
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.subtitle}>Ajouter un fidèle</Text>
          <TextInput style={styles.input} placeholder="Prénom" value={firstName} onChangeText={setFirstName} />
          <TextInput style={styles.input} placeholder="Nom" value={lastName} onChangeText={setLastName} />
          <TouchableOpacity style={styles.button} onPress={ajouterMembre} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Ajout..." : "Ajouter"}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Fidèles ({membres.length})</Text>
        
        {loadingListe ? <ActivityIndicator size="large" color="#007AFF" /> : 
          membres.map((m) => (
            <View key={m.id} style={styles.memberCard}>
              <Text style={styles.memberName}>{m.first_name} {m.last_name}</Text>
            </View>
          ))
        }
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  logoutText: { color: '#FF3B30', fontWeight: 'bold' },
  formCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 2, marginBottom: 20 },
  subtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#666' },
  input: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  memberCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#007AFF' },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
});