import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, User } from '../lib/supabase';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
      };
    };
  }
}

interface AuthContextType {
  user: User | null;
  telegramUser: any;
  loading: boolean;
  needsPhoneAuth: boolean;
  updateUserPoints: (points: number) => void;
  refreshUser: () => Promise<void>;
  registerPhone: (phoneNumber: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [needsPhoneAuth, setNeedsPhoneAuth] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  async function initializeAuth() {
    try {
      console.log('[SafetyAI] Initializing auth...');
      console.log('[SafetyAI] window.Telegram exists:', !!window.Telegram);
      console.log('[SafetyAI] window.Telegram.WebApp exists:', !!window.Telegram?.WebApp);

      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();

        console.log('[SafetyAI] Telegram WebApp initialized');
        console.log('[SafetyAI] initData:', tg.initData ? 'exists' : 'empty');
        console.log('[SafetyAI] initDataUnsafe:', tg.initDataUnsafe);

        const tgUser = tg.initDataUnsafe?.user;

        if (tgUser && tgUser.id) {
          console.log('[SafetyAI] Telegram user detected:', {
            id: tgUser.id,
            username: tgUser.username,
            first_name: tgUser.first_name
          });
          setTelegramUser(tgUser);
          await fetchOrCreateUser(tgUser);
        } else {
          console.warn('[SafetyAI] No Telegram user data available');
          console.warn('[SafetyAI] This might be a test/dev environment');
          setLoading(false);
        }
      } else {
        console.warn('[SafetyAI] Not running in Telegram WebApp environment');
        console.warn('[SafetyAI] Make sure the app is opened through Telegram');
        setLoading(false);
      }
    } catch (error) {
      console.error('[SafetyAI] Auth initialization error:', error);
      setLoading(false);
    }
  }

  async function fetchOrCreateUser(tgUser: any) {
    try {
      console.log('[SafetyAI] Fetching user from database...');

      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', tgUser.id)
        .maybeSingle();

      if (fetchError) {
        console.error('[SafetyAI] Database fetch error:', fetchError);
        throw fetchError;
      }

      if (existingUser) {
        console.log('[SafetyAI] User found:', existingUser.id);

        if (!existingUser.phone_number) {
          console.log('[SafetyAI] User needs phone verification');
          setNeedsPhoneAuth(true);
          setLoading(false);
          return;
        }

        setUser(existingUser);
        setNeedsPhoneAuth(false);
        setLoading(false);
      } else {
        console.log('[SafetyAI] Creating new user...');
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            telegram_id: tgUser.id,
            username: tgUser.username,
            first_name: tgUser.first_name,
            last_name: tgUser.last_name,
            points: 0,
            level: 1,
            phone_number: null,
            phone_verified: false
          })
          .select()
          .single();

        if (createError) {
          console.error('[SafetyAI] User creation error:', createError);
          throw createError;
        }

        console.log('[SafetyAI] New user created, needs phone verification');
        setNeedsPhoneAuth(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('[SafetyAI] Error in fetchOrCreateUser:', error);
      setLoading(false);
    }
  }

  async function registerPhone(phoneNumber: string) {
    if (!telegramUser) {
      console.error('[SafetyAI] No telegram user');
      return;
    }

    try {
      console.log('[SafetyAI] Registering phone:', phoneNumber);

      const { data, error } = await supabase
        .from('users')
        .update({
          phone_number: phoneNumber,
          phone_verified: true
        })
        .eq('telegram_id', telegramUser.id)
        .select()
        .single();

      if (error) throw error;

      console.log('[SafetyAI] Phone registered successfully');
      setUser(data);
      setNeedsPhoneAuth(false);
    } catch (error) {
      console.error('[SafetyAI] Error registering phone:', error);
      throw error;
    }
  }

  async function refreshUser() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }

  function updateUserPoints(points: number) {
    if (user) {
      const newPoints = user.points + points;
      const newLevel = Math.floor(newPoints / 100) + 1;

      setUser({
        ...user,
        points: newPoints,
        level: newLevel
      });

      supabase
        .from('users')
        .update({ points: newPoints, level: newLevel })
        .eq('id', user.id)
        .then();
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        telegramUser,
        loading,
        needsPhoneAuth,
        updateUserPoints,
        refreshUser,
        registerPhone
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
