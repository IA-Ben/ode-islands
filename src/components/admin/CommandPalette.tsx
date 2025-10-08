'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Calendar, BookOpen, Users, BarChart3, Settings, CreditCard, Gift, Folder, ArrowRight } from 'lucide-react';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: () => void;
  keywords: string[];
  category: 'navigation' | 'action' | 'create';
}

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      subtitle: 'View admin overview',
      icon: BarChart3,
      action: () => router.push('/admin'),
      keywords: ['dashboard', 'home', 'overview'],
      category: 'navigation',
    },
    {
      id: 'nav-events',
      title: 'Go to Events',
      subtitle: 'Manage live events',
      icon: Calendar,
      action: () => router.push('/admin/events'),
      keywords: ['events', 'calendar', 'live'],
      category: 'navigation',
    },
    {
      id: 'nav-story',
      title: 'Go to Story Builder',
      subtitle: 'Create stories',
      icon: BookOpen,
      action: () => router.push('/admin/story-builder'),
      keywords: ['story', 'chapters', 'narrative', 'builder'],
      category: 'navigation',
    },
    {
      id: 'nav-cms',
      title: 'Go to CMS',
      subtitle: 'Content management',
      icon: Folder,
      action: () => router.push('/admin/cms'),
      keywords: ['cms', 'content', 'media'],
      category: 'navigation',
    },
    {
      id: 'nav-cards',
      title: 'Go to Cards',
      subtitle: 'Manage card library',
      icon: CreditCard,
      action: () => router.push('/admin/cards'),
      keywords: ['cards', 'library'],
      category: 'navigation',
    },
    {
      id: 'nav-rewards',
      title: 'Go to Rewards',
      subtitle: 'Manage collectibles',
      icon: Gift,
      action: () => router.push('/admin/rewards'),
      keywords: ['rewards', 'collectibles', 'memory'],
      category: 'navigation',
    },
    {
      id: 'nav-users',
      title: 'Go to Users',
      subtitle: 'User management',
      icon: Users,
      action: () => router.push('/admin/users'),
      keywords: ['users', 'accounts', 'people'],
      category: 'navigation',
    },
    {
      id: 'nav-analytics',
      title: 'Go to Analytics',
      subtitle: 'View metrics',
      icon: BarChart3,
      action: () => router.push('/admin/analytics'),
      keywords: ['analytics', 'metrics', 'stats', 'data'],
      category: 'navigation',
    },
    {
      id: 'nav-hero-content',
      title: 'Go to Hero Content',
      subtitle: 'Intro videos & hero spots',
      icon: Film,
      action: () => router.push('/admin/hero-content'),
      keywords: ['hero', 'intro', 'video', 'launch', 'menu'],
      category: 'navigation',
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      subtitle: 'System configuration',
      icon: Settings,
      action: () => router.push('/admin/settings'),
      keywords: ['settings', 'config', 'preferences'],
      category: 'navigation',
    },
    // Quick Actions
    {
      id: 'create-event',
      title: 'Create New Event',
      subtitle: 'Start a new live event',
      icon: Calendar,
      action: () => router.push('/admin/events?new=true'),
      keywords: ['create', 'new', 'event', 'add'],
      category: 'create',
    },
    {
      id: 'create-story',
      title: 'Create New Story',
      subtitle: 'Start a new narrative',
      icon: BookOpen,
      action: () => router.push('/admin/story-builder?new=true'),
      keywords: ['create', 'new', 'story', 'chapter', 'add'],
      category: 'create',
    },
    {
      id: 'create-card',
      title: 'Create New Card',
      subtitle: 'Add a new card',
      icon: CreditCard,
      action: () => router.push('/admin/cards?new=true'),
      keywords: ['create', 'new', 'card', 'add'],
      category: 'create',
    },
  ];

  const filteredCommands = search
    ? commands.filter(cmd =>
        cmd.title.toLowerCase().includes(search.toLowerCase()) ||
        cmd.subtitle?.toLowerCase().includes(search.toLowerCase()) ||
        cmd.keywords.some(k => k.toLowerCase().includes(search.toLowerCase()))
      )
    : commands;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(true);
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
      setSelectedIndex(0);
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    }

    if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      executeCommand(filteredCommands[selectedIndex]);
    }
  }, [isOpen, filteredCommands, selectedIndex]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const executeCommand = (command: Command) => {
    command.action();
    setIsOpen(false);
    setSearch('');
    setSelectedIndex(0);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'navigation':
        return 'Navigate';
      case 'create':
        return 'Create';
      case 'action':
        return 'Actions';
      default:
        return category;
    }
  };

  if (!isOpen) return null;

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4 bg-black/60 backdrop-blur-sm">
      <div
        className={`${surfaces.overlayGlass} rounded-xl border border-fuchsia-500/50 w-full max-w-2xl shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-700/50">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands... (type to filter)"
            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-lg"
            autoFocus
          />
          <kbd className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">ESC</kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category} className="mb-4">
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {getCategoryLabel(category)}
              </div>
              <div className="space-y-1">
                {cmds.map((command, index) => {
                  const globalIndex = filteredCommands.indexOf(command);
                  const isSelected = globalIndex === selectedIndex;
                  const Icon = command.icon;

                  return (
                    <button
                      key={command.id}
                      onClick={() => executeCommand(command)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left ${
                        isSelected
                          ? 'bg-fuchsia-600/20 border border-fuchsia-500/50'
                          : 'hover:bg-slate-800/50 border border-transparent'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-fuchsia-600/30' : 'bg-slate-800/50'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          isSelected ? 'text-fuchsia-400' : 'text-slate-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white">{command.title}</div>
                        {command.subtitle && (
                          <div className="text-sm text-slate-400 truncate">{command.subtitle}</div>
                        )}
                      </div>
                      {isSelected && (
                        <ArrowRight className="w-4 h-4 text-fuchsia-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No commands found</p>
              <p className="text-sm text-slate-500 mt-1">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">ESC</kbd>
              Close
            </span>
          </div>
          <div className="text-xs text-slate-500">
            {filteredCommands.length} {filteredCommands.length === 1 ? 'command' : 'commands'}
          </div>
        </div>
      </div>
    </div>
  );
}
