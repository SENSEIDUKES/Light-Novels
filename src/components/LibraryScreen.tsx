import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BookOpen, Trash2, Play, Globe, Eye } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { ParticleSystem } from './ParticleSystem';
import { Story } from '../types';
import { getDaoRankData, getAuraTextStyle } from '../lib/qi';
import { PRESET_CHALLENGES } from '../data/challenges';

import { INITIAL_DEMO_STORIES } from '../store/demoStories';

const HERO_VIDEOS = [
  "https://video.seihouse.org/LIGHT%20NOVEL/LIGHT_NOVEL_INTRO.mp4",
  "https://video.seihouse.org/LIGHT%20NOVEL/LIGHT_NOVEL_INTRO2.mp4"
];

const PUBLISHED_WORLDS: any[] = INITIAL_DEMO_STORIES.map(story => {
  let reads = 1200;
  let createdAt = story.createdAt;
  if (story.id === 'demo-matrix-1') {
    reads = 8920;
    createdAt = new Date(Date.now() - 24 * 3600 * 1000).toISOString(); // 1 day ago
  } else if (story.id === 'demo-matrix-2') {
    reads = 4320;
    createdAt = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(); // 3 days ago
  } else if (story.id === 'demo-matrix-3') {
    reads = 6250;
    createdAt = new Date(Date.now() - 12 * 3600 * 1000).toISOString(); // 12 hours ago
  }
  return {
    ...story,
    reads,
    createdAt,
    chapterCount: story.arcs.reduce((sum, a) => sum + a.chapters.length, 0),
    powerStage: story.memory.currentPowerStage,
  };
});

export const LibraryScreen: React.FC = () => {
  const { currentScreen, setCurrentScreen, stories, setActiveStoryId, setStoryToDelete, userProfile } = useAppStore();
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'featured' | 'my-library' | 'challenges'>(stories.length === 0 ? 'featured' : 'my-library');
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  // Filter and sort states for the 'Immortal Hub' tab
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'popularity' | 'genre'>('popularity');

  if (currentScreen !== 'home') return null;

  const uniqueGenres = Array.from(new Set(PUBLISHED_WORLDS.map(w => w.genre)));
  const genres = ['All', ...uniqueGenres];

  const filteredAndSortedWorlds = PUBLISHED_WORLDS.filter(world => {
    if (selectedGenre === 'All') return true;
    return world.genre.toLowerCase() === selectedGenre.toLowerCase();
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'popularity') {
      return b.reads - a.reads;
    } else if (sortBy === 'genre') {
      return a.genre.localeCompare(b.genre) || (b.reads - a.reads);
    }
    return 0;
  });

  const sortedStoriesByDate = [...stories].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const mostRecentStory = sortedStoriesByDate.length > 0 ? sortedStoriesByDate[0] : null;

  const handleDeleteStory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStoryToDelete(id);
  };

  const handleResumeReading = (story: Story) => {
    setActiveStoryId(story.id);
    useAppStore.setState({ activeStoryId: story.id });
    
    let resumeChapterNum = 1;
    const flatChapters = story.arcs.flatMap(arc => arc.chapters).sort((a,b) => a.number - b.number);
    const unreadChapter = flatChapters.find(c => c.status !== 'read');
    if (unreadChapter) {
      resumeChapterNum = unreadChapter.number;
    } else if (flatChapters.length > 0) {
      resumeChapterNum = flatChapters[flatChapters.length - 1].number;
    }
    useAppStore.setState({ selectedChapterNum: resumeChapterNum });
    setCurrentScreen('reader');
  };

  return (
    <motion.div
      key="home-screen"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-12 pb-10"
    >
      <div className="relative rounded-xl border border-neutral-900 overflow-hidden shadow-2xl h-60 sm:h-80 flex items-end bg-black">
        <ParticleSystem count={25} className="opacity-40 mix-blend-screen z-0" color="bg-cyan-100" />
        <AnimatePresence initial={false}>
          <motion.div
            key={currentVideoIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0 z-0"
          >
            <video 
              ref={heroVideoRef}
              id={`hero-banner-video-${currentVideoIdx}`}
              src={HERO_VIDEOS[currentVideoIdx]}
              autoPlay 
              muted 
              playsInline
              onEnded={() => {
                setCurrentVideoIdx((prev) => (prev === 0 ? 1 : 0));
              }}
              className="w-full h-full object-cover opacity-50 sm:opacity-60"
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 ink-gradient z-10 pointer-events-none"></div>
        
        <div className="absolute bottom-4 right-4 z-20 flex space-x-2 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-neutral-800/80">
          {HERO_VIDEOS.map((_, idx) => (
            <button
              key={idx}
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setCurrentVideoIdx(idx)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentVideoIdx === idx 
                  ? 'bg-[#d4af37] scale-125 shadow-[0_0_8px_rgba(212,175,55,0.8)]' 
                  : 'bg-neutral-600 hover:bg-neutral-400'
              }`}
            />
          ))}
        </div>
        <div className="relative z-10 p-5 sm:p-12 w-full flex justify-between items-end">
          <div className="max-w-2xl space-y-2 sm:space-y-3">
            <span className="font-sc text-gold-accent font-bold uppercase tracking-[0.25em] text-[10px] sm:text-xs">Featured Ascension</span>
            <h2 className="font-display font-bold text-2xl sm:text-4xl md:text-5xl text-signal leading-tight tracking-tight drop-shadow-lg">
              Defying the Heavens
            </h2>
            <p className="text-neutral-300 font-serif text-xs sm:text-sm leading-relaxed max-w-xl shadow-black drop-shadow-md hidden xs:block">
              A mortal rises. The sects tremble. Write your own destiny and shatter the 
              limitations of the mortal coil in your customized light novel universe.
            </p>
            <div className="pt-2 sm:pt-4 flex flex-wrap gap-4">
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setCurrentScreen('creator')}
                className="group relative px-4 py-2 sm:px-6 sm:py-2.5 bg-void border border-portal text-portal text-xs sm:text-sm font-sc font-bold uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(4,172,255,0.4),inset_0_0_15px_rgba(4,172,255,0.2)] hover:shadow-[0_0_30px_rgba(4,172,255,0.6),inset_0_0_25px_rgba(4,172,255,0.4)] hover:bg-portal/10 hover:text-signal transition-all duration-500 overflow-hidden flex items-center space-x-1.5 sm:space-x-2"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-portal/20 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
                <Sparkles size={14} className="relative z-10 group-hover:animate-pulse" />
                <span className="relative z-10 drop-shadow-[0_0_8px_rgba(4,172,255,0.6)]">Carve New Destiny</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-6 border-b border-neutral-900 mt-8 mb-6">
        <button 
           tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setActiveTab('featured')}
          className={`pb-3 px-1 text-sm font-sc font-bold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'featured' ? 'border-portal text-portal' : 'border-transparent text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Immortal Hub
        </button>
        <button 
          onClick={() => setActiveTab('my-library')}
          className={`pb-3 px-1 text-sm font-sc font-bold uppercase tracking-wider border-b-2 transition-all ml-2 md:ml-4 ${
            activeTab === 'my-library' ? 'border-gold-accent text-gold-accent' : 'border-transparent text-neutral-500 hover:text-neutral-300'
          }`}
        >
          My Library {stories.length > 0 && `(${stories.length})`}
        </button>
        <button 
          onClick={() => setActiveTab('challenges')}
          className={`pb-3 px-1 text-sm font-sc font-bold uppercase tracking-wider border-b-2 transition-all ml-2 md:ml-4 ${
            activeTab === 'challenges' ? 'border-portal text-portal' : 'border-transparent text-neutral-500 hover:text-neutral-300'
          }`}
        >
          ☠️ Fate Survival
        </button>
      </div>

      {activeTab === 'my-library' && (
        <div className="space-y-6 animate-fadeIn" id="saved-matrices-list">
          
          {mostRecentStory && (
            <div className="bg-neutral-950/40 border border-neutral-900 rounded-lg p-5 flex flex-col md:flex-row items-center gap-6 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
              <div className="relative w-full md:w-48 h-32 rounded-md overflow-hidden flex-shrink-0 border border-neutral-800">
                <img 
                  src={mostRecentStory.imageUrl || `https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80`} 
                  alt={mostRecentStory.title}
                  className="w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>
                <div className="absolute bottom-2 left-2 right-2">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-gold-accent px-1.5 py-0.5 bg-black/80 border border-neutral-800 rounded inline-block">
                    Continue Reading
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-3 p-1">
                <div>
                  <h4 className="font-display font-bold text-xl sm:text-2xl text-signal leading-tight line-clamp-1">
                    {mostRecentStory.title}
                  </h4>
                  {userProfile ? (
                    <p className="text-[10px] text-portal/80 font-sc tracking-widest uppercase truncate font-bold mt-1">
                      By {(() => {
                        const styleObj = getAuraTextStyle(userProfile.displayNameColor, userProfile.activeStatusEffects);
                        return (
                          <span className={styleObj.className} style={styleObj.style}>
                            {userProfile.displayName || userProfile.username}
                          </span>
                        );
                      })()} · {userProfile.dao_rank || getDaoRankData(userProfile.dao_xp || userProfile.qi || 0).rank}
                    </p>
                  ) : (
                    <p className="text-[10px] text-portal/80 font-sc tracking-widest uppercase truncate font-bold mt-1">
                      By You · Mortal Reader
                    </p>
                  )}
                  <p className="text-xs text-neutral-400 font-sans truncate mt-1.5">
                    MC: {mostRecentStory.mcName} • {mostRecentStory.memory.currentPowerStage}
                  </p>
                  {mostRecentStory.intake?.storyTags && mostRecentStory.intake.storyTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {mostRecentStory.intake.storyTags.slice(0, 3).map(tag => (
                        <span key={tag} className="bg-neutral-900/60 border border-portal/10 text-portal/90 px-1.5 py-0.5 rounded text-[9px] font-medium font-sans">
                          #{tag}
                        </span>
                      ))}
                      {mostRecentStory.intake.storyTags.length > 3 && (
                        <span className="text-[9px] text-neutral-500 font-sans self-center font-bold">+{mostRecentStory.intake.storyTags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                
                {(() => {
                  const totalChapters = mostRecentStory.arcs.reduce((sum, a) => sum + a.chapters.length, 0);
                  const readChapters = mostRecentStory.arcs.reduce((sum, a) => sum + a.chapters.filter(c => c.status === 'read').length, 0);
                  const progressPercent = totalChapters > 0 ? Math.round((readChapters / totalChapters) * 100) : 0;
                  return (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-widest text-neutral-500">
                        <span>{readChapters} / {totalChapters} Chapters</span>
                        <span>{progressPercent}% Complete</span>
                      </div>
                      <div className="w-full bg-void h-1.5 rounded-full overflow-hidden border border-neutral-800">
                        <div className="bg-portal h-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              <div className="w-full md:w-auto flex-shrink-0 flex items-center justify-end">
                <button
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleResumeReading(mostRecentStory)}
                  className="w-full md:w-auto px-6 py-3 bg-human border border-human text-signal text-sm font-sc font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(139,0,0,0.5)] hover:bg-void hover:text-human"
                >
                  <Play size={16} />
                  <span>Quick Resume</span>
                </button>
              </div>
            </div>
          )}

          {stories.length === 0 ? (
            <div className="text-center py-20 bg-[#111] border border-neutral-900 rounded-lg max-w-lg mx-auto shadow-inner">
              <BookOpen size={40} className="text-neutral-800 mx-auto mb-4 animate-bounce" />
              <h4 className="font-sc font-semibold text-neutral-400 text-sm uppercase tracking-wider mb-1">
                No Stories Found
              </h4>
              <p className="text-xs text-neutral-600 max-w-xs mx-auto mb-6">
                Your cultivation path is empty. Manifest a new realm to begin reading.
              </p>
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setCurrentScreen('creator')}
                className="px-4 py-2 bg-void border border-neutral-800 hover:border-gold-accent text-xs text-neutral-300 hover:text-gold-accent rounded-xl transition-all font-sc uppercase tracking-widest"
              >
                Manifest Realm
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
              {stories.map((story) => {
                const totalChapters = story.arcs.reduce((sum, a) => sum + a.chapters.length, 0);
                const generated = story.arcs.reduce((sum, a) => sum + a.chapters.filter(c => c.hasContent || !!c.generatedContent).length, 0);
                
                return (
                  <div
                    key={story.id}
                    onClick={() => {
                      setActiveStoryId(story.id);
                      setCurrentScreen('detail');
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveStoryId(story.id);
                        setCurrentScreen('detail');
                      }
                    }}
                    aria-label={`View story ${story.title}`}
                    className="group cursor-pointer flex flex-col space-y-3"
                  >
                    <div className="relative aspect-[2/3] rounded-md overflow-hidden border border-neutral-800 group-hover:border-gold-accent shadow-lg transition-all duration-300 transform group-hover:-translate-y-1">
                      <img 
                        src={story.imageUrl || `https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80`} 
                        alt={story.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm border border-neutral-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-signal tracking-wider font-sc">
                        {generated}/{totalChapters} Ch
                      </div>
                      <button
                          tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={(e) => handleDeleteStory(story.id, e)}
                         aria-label={`Burn story for ${story.title}`}
                         className="absolute top-2 left-2 p-1.5 text-neutral-400 bg-black/60 border border-neutral-800 backdrop-blur-sm hover:text-red-500 hover:border-red-900 rounded-xl opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all font-sc"
                         title="Burn Story"
                      >
                         <Trash2 size={12} />
                      </button>
                      <div className="absolute bottom-2 left-2 right-2">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-jade-accent px-1.5 py-0.5 bg-black/80 border border-neutral-800 rounded mb-1 inline-block">
                          {story.genre}
                        </span>
                        {story.hardcoreFateMode && (
                          <span className="ml-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-red-500 px-1.5 py-0.5 bg-black/80 border border-red-950/40 rounded mb-1 inline-block animate-pulse">
                            ☠️ HARDCORE
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="font-display font-bold text-base text-signal group-hover:text-gold-accent transition-colors leading-tight line-clamp-2">
                        {story.title}
                      </h4>
                      {userProfile ? (
                        <p className="text-[10px] text-portal/80 font-sc tracking-widest uppercase truncate font-bold mt-0.5">
                          By {(() => {
                            const styleObj = getAuraTextStyle(userProfile.displayNameColor, userProfile.activeStatusEffects);
                            return (
                              <span className={styleObj.className} style={styleObj.style}>
                                {userProfile.displayName || userProfile.username}
                              </span>
                            );
                          })()} · {userProfile.dao_rank || getDaoRankData(userProfile.dao_xp || userProfile.qi || 0).rank}
                        </p>
                      ) : (
                        <p className="text-[10px] text-portal/80 font-sc tracking-widest uppercase truncate font-bold mt-0.5">
                          By You · Mortal Reader
                        </p>
                      )}
                      <p className="text-[10px] text-neutral-500 font-sans truncate mt-1">
                        MC: {story.mcName} • {story.memory.currentPowerStage}
                      </p>
                      
                      {(() => {
                        const readChapters = story.arcs.reduce((sum, a) => sum + a.chapters.filter(c => c.status === 'read').length, 0);
                        const progressPercent = totalChapters > 0 ? Math.round((readChapters / totalChapters) * 100) : 0;
                        return (
                          <div className="pt-1">
                            <div className="flex justify-between items-center text-[9px] uppercase font-mono tracking-widest text-neutral-500 mb-1">
                              <span>Read {readChapters} / {totalChapters}</span>
                              <span>{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-void h-1 rounded-full overflow-hidden border border-neutral-800">
                              <div className="bg-portal h-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'challenges' && (
        <div className="space-y-6 animate-fadeIn" id="challenges-list">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PRESET_CHALLENGES.map((challenge) => {
              const startChallenge = useAppStore.getState().startChallenge;
              return (
                <div 
                  key={challenge.id}
                  className="bg-neutral-950/40 border border-neutral-900 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:border-portal/40 hover:shadow-[0_0_20px_rgba(4,172,255,0.05)] transition-all duration-300 relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#04acff] px-2 py-0.5 bg-[#04acff]/10 border border-[#04acff]/20 rounded">
                          {challenge.genre}
                        </span>
                        <h4 className="font-display font-bold text-xl sm:text-2xl text-signal mt-2 leading-tight">
                          {challenge.title}
                        </h4>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="text-xs font-mono font-bold text-neutral-400 block uppercase">Rewards</span>
                        <span className="text-sm font-bold text-portal block">+{challenge.rewards.successQi} Qi Success</span>
                        <span className="text-[10px] text-neutral-500 block">+{challenge.rewards.attemptQi} Qi Start</span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-neutral-400 font-sans leading-relaxed">
                      {challenge.description}
                    </p>

                    <div className="p-3 bg-neutral-900/40 border border-[#111111] rounded-lg space-y-1">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase block font-bold">The Destined Outcome</span>
                      <p className="text-xs font-serif italic text-neutral-400">"{challenge.fatedOutcome}"</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => startChallenge(challenge)}
                      className="w-full py-2.5 bg-[#04acff] hover:bg-[#04acff]/90 text-void font-sc font-bold uppercase tracking-widest text-xs rounded-xl transition-all shadow-[0_0_15px_rgba(4,172,255,0.2)] hover:shadow-[0_0_20px_rgba(4,172,255,0.4)]"
                    >
                      Brave the Fate Ring
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'featured' && (
        <div className="space-y-6 animate-fadeIn" id="published-worlds-list">
          {/* Filtering and Sorting Panels */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-950/80 border border-neutral-900 shadow-xl backdrop-blur-md">
            {/* Genre Filter */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-sc font-bold uppercase tracking-[0.2em] text-[#04ACFF]">
                Realm Filter (Genre)
              </span>
              <div className="flex flex-wrap items-center gap-1.5" id="realm-genre-filters">
                {genres.map((genre) => (
                  <button
                    key={genre}
                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setSelectedGenre(genre)}
                    className={`px-3 py-1.5 text-xs font-sans font-medium uppercase tracking-wider rounded-md border transition-all duration-300 ${
                      selectedGenre === genre
                        ? 'border-[#04ACFF] bg-[#04ACFF]/10 text-[#04ACFF] shadow-[0_0_12px_rgba(4,172,255,0.25)]'
                        : 'border-neutral-900 bg-void text-neutral-400 hover:text-[#FAFAFA] hover:border-neutral-800'
                    }`}
                    id={`genre-filter-${genre.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Sorting */}
            <div className="flex flex-col gap-2 min-w-[200px]">
              <span className="text-[11px] font-sc font-bold uppercase tracking-[0.2em] text-[#FAFAFA]">
                Ascension Order
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-void border border-neutral-900 hover:border-neutral-800 px-3 py-2 text-xs font-sans font-medium uppercase tracking-wider text-[#FAFAFA] rounded-md focus:outline-none focus:border-[#04ACFF] cursor-pointer pr-10 appearance-none"
                  id="immortal-hub-sort"
                >
                  <option value="popularity">Popularity (Most Reads)</option>
                  <option value="newest">Newest (Recent Manifestation)</option>
                  <option value="genre">Genre (Alphabetical Codex)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-neutral-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {filteredAndSortedWorlds.length === 0 ? (
            <div className="text-center py-20 bg-[#111] border border-neutral-900 rounded-lg max-w-lg mx-auto shadow-inner">
              <Globe size={40} className="text-neutral-800 mx-auto mb-4 animate-pulse" />
              <h4 className="font-sc font-semibold text-neutral-400 text-sm uppercase tracking-wider mb-1">
                Awaiting Manifestations
              </h4>
              <p className="text-xs text-neutral-600 max-w-xs mx-auto mb-6">
                No worlds matching this filter could be found inside the matrix. Try altering your filter parameters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
              {filteredAndSortedWorlds.map((world) => (
                <div
                  key={world.id}
                  className="group cursor-pointer flex flex-col space-y-3"
                  onClick={() => {
                    const existing = stories.find(s => s.id === world.id);
                    if (!existing) {
                      useAppStore.getState().setStories([world, ...stories]);
                    }
                    setActiveStoryId(world.id);
                    setCurrentScreen('detail');
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const existing = stories.find(s => s.id === world.id);
                      if (!existing) {
                        useAppStore.getState().setStories([world, ...stories]);
                      }
                      setActiveStoryId(world.id);
                      setCurrentScreen('detail');
                    }
                  }}
                  aria-label={`View published world ${world.title}`}
                >
                  <div className="relative aspect-[2/3] rounded-md overflow-hidden border border-neutral-800 group-hover:border-portal shadow-lg transition-all duration-300 transform group-hover:-translate-y-1">
                    <img 
                      src={world.imageUrl} 
                      alt={world.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm border border-neutral-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-signal tracking-wider font-sc flex items-center space-x-1">
                       <Eye size={10} className="text-portal" />
                       <span>{world.reads}</span>
                    </div>
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm border border-neutral-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-signal tracking-wider font-sc">
                      {world.chapterCount} Ch
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#00A86B] px-1.5 py-0.5 bg-black/80 border border-neutral-800 rounded inline-block">
                        {world.genre}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-base text-signal group-hover:text-portal transition-colors leading-tight line-clamp-2">
                      {world.title}
                    </h4>
                    <p className="text-[10px] text-neutral-500 font-sans truncate">
                      MC: {world.mcName} • {world.powerStage}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
