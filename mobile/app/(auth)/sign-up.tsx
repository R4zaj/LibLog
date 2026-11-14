import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, UserCircle2, GraduationCap, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import FloatingLabelInput from '../../components/FloatingLabelInput';

export default function SignUp() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [role, setRole] = useState('STUDENT');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [program, setProgram] = useState('Computer Science');
  const [yearLevel, setYearLevel] = useState('1st Year');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [programsList, setProgramsList] = useState<string[]>([]);
  const [resendCooldown, setResendCooldown] = useState(0);

  React.useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  React.useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await api.get('/settings/programs');
        if (res.data && Array.isArray(res.data)) {
          setProgramsList(res.data.map((p: any) => p.name));
          if (res.data.length > 0) setProgram(res.data[0].name);
        }
      } catch (err) {
        console.error('Failed to load programs', err);
      }
    };
    fetchPrograms();
  }, []);

  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasSymbol;

  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  const handleNext = async () => {
    setError('');
    if (step === 2 && (!firstName || !lastName)) {
      setError('Please fill in all personal information');
      return;
    }
    if (step === 4) {
      if (!email || !password || !confirmPassword) {
        setError('Please complete account setup');
        return;
      }
      if (!isPasswordValid) {
        setError('Password does not meet all requirements');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      setIsLoading(true);
      try {
        await api.post('/auth/request-otp', { email });
        setResendCooldown(60);
        setStep(5);
      } catch (e: any) {
        setError(e.response?.data?.error || 'Failed to send OTP.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (step === 2 && role === 'VISITOR') {
      setStep(4); // Skip academic info for visitors
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 1) {
      router.back();
    } else if (step === 4 && role === 'VISITOR') {
      setStep(2);
    } else {
      setStep(step - 1);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/register', {
        first_name: firstName,
        last_name: lastName,
        email: email,
        password: password,
        role: role,
        program: role === 'STUDENT' ? program : null,
        year_level: role === 'STUDENT' ? yearLevel : null,
        otp: otp
      });

      if (res.data.token) {
        await signIn(res.data.token, res.data.user);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Registration failed. Please try again.');
      setStep(4); // Go back to fix error
    } finally {
      setIsLoading(false);
    }
  };

  const renderProgressBar = () => {
    return (
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4, 5].map((s) => (
          <View key={s} style={[styles.progressSegment, step >= s ? styles.progressActive : styles.progressInactive]} />
        ))}
      </View>
    );
  };

  const renderHeaderIcons = () => {
    return (
      <View style={styles.headerIconsContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderLogo = () => (
    <View style={styles.largeIconCircle}>
      <Image source={require('../../assets/images/CCC_icon.png')} style={{ width: 90, height: 90 }} resizeMode="contain" />
    </View>
  );


  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, zIndex: 1 }}>
        <View style={styles.topBar}>
          {renderProgressBar()}
          {renderHeaderIcons()}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* STEP 1: ROLE SELECTION */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                {renderLogo()}
                <Text style={styles.title}>Welcome to CCC LIB APP</Text>
                <Text style={styles.subtitle}>Choose your role to get started with the digital library</Text>
              </View>

              <TouchableOpacity
                style={[styles.roleCard, role === 'STUDENT' && styles.roleCardActive]}
                onPress={() => setRole('STUDENT')}
              >
                <View style={styles.roleCardInner}>
                  <View style={[styles.roleIcon, role === 'STUDENT' && styles.roleIconActive]}>
                    <GraduationCap size={24} color={role === 'STUDENT' ? '#fff' : '#6b7280'} />
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={styles.roleTitle}>Student</Text>
                    <Text style={styles.roleDesc}>Currently enrolled</Text>
                  </View>
                  {role === 'STUDENT' && <Check size={24} color="#6C48C5" />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleCard, role === 'VISITOR' && styles.roleCardActive]}
                onPress={() => setRole('VISITOR')}
              >
                <View style={styles.roleCardInner}>
                  <View style={[styles.roleIcon, role === 'VISITOR' && styles.roleIconActive]}>
                    <UserCircle2 size={24} color={role === 'VISITOR' ? '#fff' : '#6b7280'} />
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={styles.roleTitle}>Visitor</Text>
                    <Text style={styles.roleDesc}>Guest access</Text>
                  </View>
                  {role === 'VISITOR' && <Check size={24} color="#6C48C5" />}
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: PERSONAL INFORMATION */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                {renderLogo()}
                <Text style={styles.title}>Personal Information</Text>
                <Text style={styles.subtitle}>Tell us about yourself</Text>
              </View>

              <FloatingLabelInput
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
              />

              <FloatingLabelInput
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
              />

            </View>
          )}

          {/* STEP 3: ACADEMIC INFORMATION */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                {renderLogo()}
                <Text style={styles.title}>Academic Information</Text>
                <Text style={styles.subtitle}>Your program and year</Text>
              </View>

              <Text style={styles.label}>Program / Department</Text>
              {/* Simple buttons simulating dropdown for React Native without extra libraries */}
              <View style={styles.gridContainer}>
                {(programsList.length > 0 ? programsList : ['Computer Science', 'Information Technology', 'Education', 'Business']).slice(0, 4).map((prog) => (
                  <TouchableOpacity
                    key={prog}
                    style={[styles.gridItem, program === prog && styles.gridItemActive]}
                    onPress={() => setProgram(prog)}
                  >
                    <Text style={[styles.gridItemText, program === prog && styles.gridItemTextActive]}>{prog}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 16 }]}>Year Level</Text>
              <View style={styles.gridContainer}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.gridItem, yearLevel === year && styles.gridItemActive]}
                    onPress={() => setYearLevel(year)}
                  >
                    <Text style={[styles.gridItemText, yearLevel === year && styles.gridItemTextActive]}>{year}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* STEP 4: ACCOUNT SETUP */}
          {step === 4 && (
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                {renderLogo()}
                <Text style={styles.title}>Account Setup</Text>
                <Text style={styles.subtitle}>Create your login credentials</Text>
              </View>

              <FloatingLabelInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <FloatingLabelInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                containerStyle={{ marginBottom: 12 }}
                rightElement={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    {showPassword ? <Eye size={20} color="#9ca3af" /> : <EyeOff size={20} color="#9ca3af" />}
                  </TouchableOpacity>
                }
              />

              <View style={styles.passwordRequirements}>
                <Text style={styles.reqTitle}>Password must contain:</Text>
                <View style={styles.reqRow}>
                  {hasMinLength ? <Check size={16} color="#10B981" /> : <View style={styles.reqDot} />}
                  <Text style={[styles.reqText, hasMinLength && styles.reqMet]}>At least 8 characters</Text>
                </View>
                <View style={styles.reqRow}>
                  {hasUpperCase ? <Check size={16} color="#10B981" /> : <View style={styles.reqDot} />}
                  <Text style={[styles.reqText, hasUpperCase && styles.reqMet]}>One uppercase letter</Text>
                </View>
                <View style={styles.reqRow}>
                  {hasLowerCase ? <Check size={16} color="#10B981" /> : <View style={styles.reqDot} />}
                  <Text style={[styles.reqText, hasLowerCase && styles.reqMet]}>One lowercase letter</Text>
                </View>
                <View style={styles.reqRow}>
                  {hasSymbol ? <Check size={16} color="#10B981" /> : <View style={styles.reqDot} />}
                  <Text style={[styles.reqText, hasSymbol && styles.reqMet]}>One symbol (!@#$&*)</Text>
                </View>
              </View>

              <FloatingLabelInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                containerStyle={{ marginBottom: 4 }}
                rightElement={
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                    {showConfirmPassword ? <Eye size={20} color="#9ca3af" /> : <EyeOff size={20} color="#9ca3af" />}
                  </TouchableOpacity>
                }
              />
              {confirmPassword.length > 0 && password === confirmPassword && (
                <Text style={styles.matchPassword}>✓ Passwords match</Text>
              )}
            </View>
          )}

          {/* STEP 5: OTP VERIFICATION */}
          {step === 5 && (
            <View style={styles.stepContent}>
              <View style={styles.stepHeader}>
                {renderLogo()}
                <Text style={styles.title}>Email Verification</Text>
                <Text style={styles.subtitle}>Enter the 6-digit code sent to {email}</Text>
              </View>

              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
                value={otp}
                onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                maxLength={6}
                placeholder="------"
              />

              <TouchableOpacity 
                style={{ alignItems: 'center', marginTop: 10 }}
                disabled={resendCooldown > 0}
                onPress={async () => {
                  try {
                    await api.post('/auth/request-otp', { email });
                    setResendCooldown(60);
                    Alert.alert("Success", "A new code has been sent!");
                  } catch (e: any) {
                    Alert.alert("Notice", e.response?.data?.error || "Failed to resend code.");
                  }
                }}
              >
                <Text style={{ color: resendCooldown > 0 ? '#9ca3af' : '#6C48C5', fontWeight: 'bold' }}>
                  {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>

        <View style={styles.footer}>
          {step < 5 ? (
            <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleNext} disabled={isLoading}>
              <Text style={styles.buttonText}>{isLoading ? 'Loading...' : 'Continue →'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading || otp.length !== 6}
            >
              <Text style={styles.buttonText}>{isLoading ? 'Verifying...' : 'Verify & Create Account'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf9fe' },
  topBar: { paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 24, backgroundColor: 'transparent' },
  progressContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  progressSegment: { height: 4, flex: 1, marginHorizontal: 2, borderRadius: 2 },
  progressActive: { backgroundColor: '#6C48C5' },
  progressInactive: { backgroundColor: '#e5e7eb' },
  headerIconsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backButton: { padding: 8, minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'flex-start' },
  scrollContainer: { flexGrow: 1, padding: 24 },
  stepContent: { flex: 1 },
  stepHeader: { alignItems: 'center', marginBottom: 40 },
  largeIconCircle: { width: 90, height: 90, borderRadius: 16, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e1e2e', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, fontWeight: '500', color: '#7c7c8a', textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#4b5563', marginBottom: 8 },
  input: { borderWidth: 1.2, borderColor: '#cbd5e1', borderRadius: 16, padding: 16, fontSize: 16, marginBottom: 20, color: '#1e1e2e', backgroundColor: '#ffffff' },
  eyeIcon: { padding: 12, minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' },
  passwordRequirements: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 12, marginBottom: 20 },
  reqTitle: { fontSize: 13, fontWeight: '600', color: '#4b5563', marginBottom: 8 },
  reqRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  reqDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d1d5db', marginLeft: 5, marginRight: 5 },
  reqText: { fontSize: 13, color: '#6b7280', marginLeft: 6 },
  reqMet: { color: '#10B981', textDecorationLine: 'line-through' },
  matchPassword: { color: '#10B981', marginTop: 8, marginLeft: 4, fontSize: 14 },
  roleCard: { borderWidth: 1, borderColor: '#ede9f6', borderRadius: 16, padding: 20, marginBottom: 16, backgroundColor: '#ffffff', boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)', elevation: 2 },
  roleCardActive: { borderColor: '#6C48C5', backgroundColor: '#faf5ff' },
  roleCardInner: { flexDirection: 'row', alignItems: 'center' },
  roleIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  roleIconActive: { backgroundColor: '#6C48C5' },
  roleTextContainer: { flex: 1 },
  roleTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  roleDesc: { fontSize: 14, color: '#6b7280' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', borderWidth: 1, borderColor: '#ede9f6', borderRadius: 16, padding: 16, marginBottom: 12, alignItems: 'center', backgroundColor: '#ffffff', minHeight: 48, justifyContent: 'center', boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)', elevation: 2 },
  gridItemActive: { borderColor: '#6C48C5', backgroundColor: '#faf5ff' },
  gridItemText: { color: '#4b5563', fontWeight: '500' },
  gridItemTextActive: { color: '#6C48C5', fontWeight: 'bold' },
  successBox: { backgroundColor: '#ecfdf5', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#a7f3d0' },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: '#065f46', marginTop: 16, marginBottom: 8 },
  successDesc: { fontSize: 14, color: '#047857', textAlign: 'center', lineHeight: 20 },
  footer: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: 'transparent', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  button: { backgroundColor: '#6C48C5', padding: 18, borderRadius: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  errorText: { color: '#ef4444', marginBottom: 16, textAlign: 'center', backgroundColor: '#fee2e2', padding: 12, borderRadius: 8 },
});
