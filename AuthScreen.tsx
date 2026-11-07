import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from './supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [churchName, setChurchName] = useState('');
  const [isLogin, setIsLogin] = useState(true); // Bascule entre Connexion et Inscription
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir l'email et le mot de passe.");
      return;
    }

    setLoading(true);

    if (isLogin) {
      // --- CONNEXION ---
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert("Erreur de connexion", error.message);
    } else {
      // --- INSCRIPTION ---
      if (!churchName) {
        Alert.alert("Erreur", "Veuillez donner le nom de votre église.");
        setLoading(false);
        return;
      }

      // 1. Créer l'utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      
      if (authError) {
        Alert.alert("Erreur d'inscription", authError.message);
      } else if (authData.user) {
        // 2. Créer l'église et la lier à cet utilisateur
        const { error: churchError } = await supabase
          .from('churches')
          .insert([{ name: churchName, owner_id: authData.user.id }]);
        
        if (churchError) {
          Alert.alert("Erreur création église", churchError.message);
        } else {
          Alert.alert("Succès", "Église créée avec succès ! Vous êtes connecté.");
        }
      }
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <Text style={styles.title}>{isLogin ? "Connexion" : "Créer mon Église"}</Text>

      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />

      {!isLogin && (
        <TextInput style={styles.input} placeholder="Nom de votre église" value={churchName} onChangeText={setChurchName} />
      )}

      <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Chargement..." : (isLogin ? "Se connecter" : "S'inscrire")}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
        <Text style={styles.switchText}>
          {isLogin ? "Pas de compte ? Créer une église" : "Déjà un compte ? Se connecter"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#333' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  switchButton: { marginTop: 20, alignItems: 'center' },
  switchText: { color: '#007AFF', fontSize: 14 },
});