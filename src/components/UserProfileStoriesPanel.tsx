import React from 'react';
import { UserProfile as UserProfileType, AppUser, Story } from '../types';
import { BookOpen } from 'lucide-react';

interface UserProfileStoriesPanelProps {
  profile: UserProfileType | null;
  currentUser: AppUser | null;
  stories: Story[];
}

export function UserProfileStoriesPanel({ profile, currentUser, stories }: UserProfileStoriesPanelProps) {
  const inactiveFlowIds = profile?.inactiveStories || [];
  const userStories = stories.filter(s => s.userId === currentUser?.uid || (!s.userId));
  const activeFlows = userStories.filter(s => !inactiveFlowIds.includes(s.id));

  return (
    <div className="pt-10 border-t border-neutral-900/50 mt-10">
      <h3 className="text-[11px] uppercase font-bold tracking-widest text-neutral-500 font-sc mb-6 flex items-center gap-2">
        <BookOpen size={14} className="text-human" />
        Manifested Realms
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Stories */}
        <div className="border border-portal/10 bg-void rounded-xl p-5 shadow-[0_0_15px_rgba(4,172,255,0.03)] hover:border-portal/30 transition-all duration-300">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-portal font-sc">Active Flows</h4>
            <span className="text-[9px] px-2 py-0.5 bg-portal/10 text-portal rounded-full font-bold">{activeFlows.length}</span>
          </div>
          <div className="space-y-3">
            {activeFlows.length === 0 ? (
              <div className="text-[11px] text-neutral-600 font-sans italic tracking-wide">No realms manifested yet.</div>
            ) : (
              activeFlows.map(s => (
                <div key={s.id} className="text-[13px] text-neutral-300 font-sans flex items-center gap-3 overflow-hidden group hover:text-signal transition-colors py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-portal flex-shrink-0 animate-pulse"></span>
                  <span className="truncate">{s.title}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inactive Stories */}
        <div className="border border-human-brand/10 bg-void rounded-xl p-5 shadow-[0_0_15px_rgba(139,0,0,0.03)] hover:border-human-brand/30 transition-all duration-300">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-human font-sc">Sealed Flows</h4>
            <span className="text-[9px] px-2 py-0.5 bg-human/10 text-human rounded-full font-bold">{inactiveFlowIds.length}</span>
          </div>
          <div className="space-y-3">
            {inactiveFlowIds.length === 0 ? (
              <div className="text-[11px] text-neutral-600 font-sans italic tracking-wide">No realms currently sealed.</div>
            ) : (
              inactiveFlowIds.map(id => {
                const story = stories.find(s => s.id === id);
                const title = story ? story.title : `Story ${id.split('-').pop()}`;
                return (
                  <div key={id} className="text-[13px] text-neutral-500 font-sans flex items-center gap-3 overflow-hidden hover:text-neutral-400 transition-colors py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-human-brand/50 flex-shrink-0"></span>
                    <span className="truncate italic">{title}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
