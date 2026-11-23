import { Home, Users, CalendarDays, MessageCircle, Compass, Bot, Info, PenTool } from 'lucide-react';
import type { TabKey } from '@/types';

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogoClick: () => void;
  isCreator?: boolean;
}

const navItems: { key: TabKey; label: string; icon: typeof Home; description: string }[] = [
  { key: 'inicio', label: 'Inicio', icon: Home, description: 'Muro y charla' },
  { key: 'grupos', label: 'Grupos', icon: Users, description: 'Comunidades' },
  { key: 'eventos', label: 'Eventos', icon: CalendarDays, description: 'Agenda' },
  { key: 'chats', label: 'Chats', icon: MessageCircle, description: 'Mensajes' },
  { key: 'explorar', label: 'Explorar', icon: Compass, description: 'Estudiantes' },
  { key: 'asistente', label: 'Asistente', icon: Bot, description: 'IA y ayuda' },
  { key: 'contacto', label: 'Quiénes Somos', icon: Info, description: 'Sobre el proyecto' },
];

export default function Sidebar({ activeTab, onTabChange, isOpen, onClose, onLogoClick, isCreator = false }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-100/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-[260px] shrink-0 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col border-r border-ink-800 bg-white/95 backdrop-blur-xl">
          <div
            className="flex cursor-pointer items-center gap-3 px-6 py-6 transition-opacity hover:opacity-80"
            onClick={() => { onLogoClick(); onClose(); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') { onLogoClick(); onClose(); } }}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gold-400/50 bg-white shadow-lg shadow-crimson-500/10">
              <img
                src="/images/IMG_6813.PNG"
                alt="Logo de Uni verse"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-ink-100">
                Uni<span className="text-crimson-600">verse</span>
              </h1>
              <p className="text-xs text-ink-400">Sevilla · Estudiantes</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    onTabChange(item.key);
                    onClose();
                  }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                    active
                      ? 'bg-crimson-500/10 text-crimson-600 shadow-sm'
                      : 'text-ink-400 hover:bg-ink-850 hover:text-ink-200'
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    active ? 'bg-crimson-500/15' : 'bg-ink-850/50 group-hover:bg-ink-800'
                  }`}>
                    <Icon className={`h-[18px] w-[18px] ${active ? 'text-crimson-500' : ''}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${active ? 'text-crimson-600' : ''}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-ink-400">{item.description}</p>
                  </div>
                  {active && (
                    <div className="h-1.5 w-1.5 rounded-full bg-crimson-500 animate-pulse-crimson" />
                  )}
                </button>
              );
            })}
          </nav>

          {isCreator && (
            <div className="px-3 pb-2">
              <button
                onClick={() => {
                  onTabChange('panel');
                  onClose();
                }}
                className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                  activeTab === 'panel'
                    ? 'bg-gold-400/10 text-gold-700 shadow-sm'
                    : 'text-ink-400 hover:bg-ink-850 hover:text-ink-200'
                }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  activeTab === 'panel' ? 'bg-gold-400/15' : 'bg-ink-850/50 group-hover:bg-ink-800'
                }`}>
                  <PenTool className="h-[18px] w-[18px]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Panel de Creador</p>
                  <p className="text-xs text-ink-400">Publicar contenido</p>
                </div>
              </button>
            </div>
          )}

          <div className="border-t border-ink-800 p-4">
            <div className="rounded-xl bg-gradient-to-br from-ink-850 to-ink-800 p-4 border border-ink-700/30">
              <p className="text-xs font-medium text-ink-200">Conecta tu facultad</p>
              <p className="mt-1 text-xs text-ink-400">
                FCom · Reina Mercedes · Ramón y Cajal · Viapol · Cartuja
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
