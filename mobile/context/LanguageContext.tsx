import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'English' | 'Filipino';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  English: {
    Settings: 'Settings',
    Appearance: 'Appearance',
    AppearanceSubtitle: 'Match your device or switch between modes',
    System: 'System',
    Light: 'Light',
    Dark: 'Dark',
    Language: 'Language',
    LanguageSubtitle: 'Choose your preferred language for the app',
    HelpSupport: 'Help & Support',
    HowToUse: 'How to use the App',
    About: 'About',
    CheckUpdates: 'Check for updates',
    WhatsNew: "What's new",
    SendFeedback: 'Send feedback',
    PrivacyNotice: 'Privacy Notice',
    PrivacyText: 'CCC LIB APP values your privacy. Your data is used exclusively for library operations, attendance tracking, and borrowing logistics.',
    Home: 'Home',
    Search: 'Search',
    Borrowed: 'Borrowed',
    History: 'History',
    Profile: 'Profile',
    Highlight: 'Today\'s Highlight',
    Recommended: 'Recommended for You',
    Trending: 'Trending in Your Department',
    DueSoon: 'Due Soon',
    Account: 'Account',
    AccountSubtitle: 'Manage your profile and account information',
    EditProfile: 'Edit Profile',
    EditProfileSubtitle: 'Update your student information',
    Save: 'Save Changes',
    Cancel: 'Cancel',
  },
  Filipino: {
    Settings: 'Mga Setting',
    Appearance: 'Anyo',
    AppearanceSubtitle: 'Itugma sa device o pumili ng mode',
    System: 'Sistema',
    Light: 'Liwanag',
    Dark: 'Dilim',
    Language: 'Wika',
    LanguageSubtitle: 'Piliin ang iyong gustong wika para sa app',
    HelpSupport: 'Tulong at Suporta',
    HowToUse: 'Paano gamitin ang App',
    About: 'Tungkol sa App',
    CheckUpdates: 'Suriin ang mga update',
    WhatsNew: 'Ano ang bago',
    SendFeedback: 'Magpadala ng feedback',
    PrivacyNotice: 'Paunawa sa Privacy',
    PrivacyText: 'Pinapahalagahan ng CCC LIB APP ang iyong privacy. Ginagamit lang ang iyong data para sa library operations, attendance, at paghiram.',
    Home: 'Home',
    Search: 'Maghanap',
    Borrowed: 'Hiniram',
    History: 'Kasaysayan',
    Profile: 'Profile',
    Highlight: 'Highlight Ngayon',
    Recommended: 'Inirerekomenda Para Sayo',
    Trending: 'Sikat sa Iyong Departamento',
    DueSoon: 'Malapit Nang Ibalik',
    Account: 'Account',
    AccountSubtitle: 'Pamahalaan ang impormasyon ng profile',
    EditProfile: 'I-edit ang Profile',
    EditProfileSubtitle: 'I-update ang impormasyon ng mag-aaral',
    Save: 'I-save ang Pagbabago',
    Cancel: 'Kanselahin',
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'English',
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [language, setLangState] = useState<Language>('English');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('appLanguage').then((saved) => {
      if (saved === 'Filipino' || saved === 'English') {
        setLangState(saved as Language);
      }
      setIsLoaded(true);
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    AsyncStorage.setItem('appLanguage', lang);
  };

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations['English']] || key;
  };

  if (!isLoaded) return null; // Avoid flicker before loading saved preference

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
