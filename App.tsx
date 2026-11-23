import { useState, useCallback, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import FeedPage from '@/pages/FeedPage';
import GroupsPage from '@/pages/GroupsPage';
import EventsPage from '@/pages/EventsPage';
import ChatsPage from '@/pages/ChatsPage';
import AssistantPage from '@/pages/AssistantPage';
import AboutPage from '@/pages/AboutPage';
import ProfilePage from '@/pages/ProfilePage';
import LoginPage from '@/pages/LoginPage';
import RoleSelectPage from '@/pages/RoleSelectPage';
import CreatorPanelPage from '@/pages/CreatorPanelPage';
import OnboardingPage from '@/pages/OnboardingPage';
import ExplorePage from '@/pages/ExplorePage';
import { useLiveNotifications, NotificationToast } from '@/components/NotificationToast';
import { Loader2 } from 'lucide-react';
import type { TabKey } from '@/types';
import {
  loadRole,
  saveRole,
  clearRole,
  type UserRole,
} from '@/lib/roles';
import {
  SessionContext,
  loadSession,
  saveSession,
  clearSession,
  loadProfile,
  saveProfile,
  clearProfile,
  type Session,
  type UserProfile,
} from '@/lib/session';
import { supabase } from '@/lib/supabase';

export interface StartChatTarget {
  chatId: string;
  contactName: string;
  contactAvatar: string;
  contactFaculty: string;
}

const TAB_META: Record<TabKey, { title: string; subtitle: string }> = {
  inicio: {
    title: 'Inicio',
    subtitle: 'El muro de la comunidad universitaria de Sevilla',
  },
  grupos: {
    title: 'Grupos Estudiantiles',
    subtitle: 'Comunidades y asociaciones de tu facultad',
  },
  eventos: {
    title: 'Eventos',
    subtitle: 'Agenda universitaria en Sevilla',
  },
  chats: {
    title: 'Mensajes',
    subtitle: 'Chats privados y grupos de tu comunidad',
  },
  explorar: {
    title: 'Explorar',
    subtitle: 'Descubre estudiantes de tu universidad',
  },
  asistente: {
    title: 'Asistente',
    subtitle: 'Ayuda académica, trámites oficiales y soporte de la app',
  },
  contacto: {
    title: 'Quiénes Somos',
    subtitle: 'Sobre el proyecto, el equipo y contacto',
  },
  perfil: {
    title: 'Mi Perfil',
    subtitle: 'Tus datos, ajustes y privacidad',
  },
  panel: {
    title: 'Panel de Creador',
    subtitle: 'Gestión de eventos, notificaciones y publicidad',
  },
};

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [profile, setProfile] = useState<UserProfile | null>(() => loadProfile());
  const [role, setRole] = useState<UserRole | null>(() => loadRole());
  const [activeTab, setActiveTab] = useState<TabKey>('inicio');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastNotif, setToastNotif] = useState<{ id: string; brand: string | null; title: string; message: string; image_url: string | null } | null>(null);
  const [pendingChat, setPendingChat] = useState<StartChatTarget | null>(null);
  const [profileChecked, setProfileChecked] = useState<boolean>(loadProfile() !== null);

  useLiveNotifications((n) => {
    setToastNotif(n);
    setTimeout(() => setToastNotif(null), 6000);
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) {
        const email = data.session.user.email;
        if (!loadSession()) {
          saveSession(email);
          setSession({ email, verifiedAt: Date.now() });
        }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, supaSession) => {
      if (supaSession?.user?.email) {
        const email = supaSession.user.email;
        if (!loadSession()) {
          saveSession(email);
          setSession({ email, verifiedAt: Date.now() });
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = useCallback((email: string) => {
    saveSession(email);
    setSession({ email, verifiedAt: Date.now() });
  }, []);

  const handleChooseStudent = useCallback(() => {
    saveRole('student');
    setRole('student');
  }, []);

  const handleChooseCreator = useCallback(() => {
    saveRole('creator');
    setRole('creator');
    setProfileChecked(true);
  }, []);

  useEffect(() => {
    if (!session || role !== 'student' || loadProfile()) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('email, full_name, degree, course, class_group, plan_tag, group_tag, goal_tag, onboarding_completed')
        .eq('email', session.email)
        .maybeSingle();
      if (cancelled) return;
      if (data && data.onboarding_completed) {
        const restored: UserProfile = {
          email: data.email,
          fullName: data.full_name,
          degree: data.degree,
          course: data.course,
          classGroup: data.class_group,
          planTag: data.plan_tag ?? '',
          groupTag: data.group_tag ?? '',
          goalTag: data.goal_tag ?? '',
        };
        saveProfile(restored);
        setProfile(restored);
      }
      setProfileChecked(true);
    })();
    return () => { cancelled = true; };
  }, [session, role]);

  const handleCompleteOnboarding = useCallback(async (newProfile: UserProfile) => {
    saveProfile(newProfile);
    setProfile(newProfile);
    await supabase.from('profiles').upsert({
      email: newProfile.email,
      full_name: newProfile.fullName,
      degree: newProfile.degree,
      course: newProfile.course,
      class_group: newProfile.classGroup,
      plan_tag: newProfile.planTag,
      group_tag: newProfile.groupTag,
      goal_tag: newProfile.goalTag,
      onboarding_completed: true,
    }, { onConflict: 'email' });
    setProfileChecked(true);
  }, []);

  const handleUpdateProfile = useCallback(async (updated: UserProfile) => {
    saveProfile(updated);
    setProfile(updated);
    await supabase.from('profiles').upsert({
      email: updated.email,
      full_name: updated.fullName,
      degree: updated.degree,
      course: updated.course,
      class_group: updated.classGroup,
      plan_tag: updated.planTag,
      group_tag: updated.groupTag,
      goal_tag: updated.goalTag,
    }, { onConflict: 'email' });
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearSession();
    clearProfile();
    clearRole();
    setSession(null);
    setProfile(null);
    setRole(null);
    setActiveTab('inicio');
  }, []);

  const handleStartChat = useCallback((target: StartChatTarget) => {
    setPendingChat(target);
    setActiveTab('chats');
  }, []);

  if (!session) {
    return <LoginPage onVerified={handleSignIn} />;
  }

  if (!role) {
    return (
      <RoleSelectPage
        email={session.email}
        onStudent={handleChooseStudent}
        onCreator={handleChooseCreator}
      />
    );
  }

  if (!profile && role !== 'creator') {
    return <OnboardingPage email={session.email} onComplete={handleCompleteOnboarding} />;
  }

  if (role === 'student' && !profileChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <Loader2 className="h-6 w-6 animate-spin text-crimson-500" />
      </div>
    );
  }

  const meta = TAB_META[activeTab];
  const chatsActive = activeTab === 'chats';
  const isCreator = role === 'creator';

  return (
    <SessionContext.Provider
      value={{
        session,
        profile,
        isCreator,
        signIn: handleSignIn,
        completeOnboarding: handleCompleteOnboarding,
        updateProfile: handleUpdateProfile,
        signOut: handleSignOut,
      }}
    >
      <div className="flex min-h-screen bg-ink-950">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogoClick={() => setActiveTab('inicio')}
          isCreator={isCreator}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            title={meta.title}
            subtitle={meta.subtitle}
            onMenuClick={() => setSidebarOpen(true)}
            onProfileClick={() => setActiveTab('perfil')}
            onSignOut={handleSignOut}
            isCreator={isCreator}
          />

          <main className={`flex-1 ${chatsActive ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {activeTab === 'inicio' && <FeedPage />}
            {activeTab === 'grupos' && <GroupsPage />}
            {activeTab === 'eventos' && <EventsPage />}
            {activeTab === 'chats' && <ChatsPage onNavigateGroups={() => setActiveTab('grupos')} onNavigateExplore={() => setActiveTab('explorar')} initialChat={pendingChat ?? undefined} onChatOpened={() => setPendingChat(null)} />}
            {activeTab === 'explorar' && <ExplorePage onStartChat={handleStartChat} currentUserEmail={session.email} />}
            {activeTab === 'asistente' && <AssistantPage onNavigate={(tab) => setActiveTab(tab)} />}
            {activeTab === 'contacto' && <AboutPage />}
            {activeTab === 'perfil' && <ProfilePage />}
            {activeTab === 'panel' && isCreator && <CreatorPanelPage />}
          </main>
        </div>

        {toastNotif && (
          <NotificationToast notification={toastNotif} onClose={() => setToastNotif(null)} />
        )}
      </div>
    </SessionContext.Provider>
  );
}
