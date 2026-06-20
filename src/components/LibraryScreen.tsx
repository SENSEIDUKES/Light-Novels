import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BookOpen, Trash2, Play, Upload, Download, Database } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { ParticleSystem } from './ParticleSystem';
import { Story } from '../types';

const HERO_VIDEOS = [
  "https://video.seihouse.org/LIGHT%20NOVEL/LIGHT_NOVEL_INTRO.mp4",
  "https://video.seihouse.org/LIGHT%20NOVEL/LIGHT_NOVEL_INTRO2.mp4"
];

export const LibraryScreen: React.FC = () => {
  const { currentScreen, setCurrentScreen, stories, setActiveStoryId, setStoryToDelete, storageType, handleExportLibrary, handleImportLibrary } = useAppStore();
  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  if (currentScreen !== 'home') return null;

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
              onClick={() => setCurrentVideoIdx(idx)}
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
                onClick={() => setCurrentScreen('creator')}
                className="px-4 py-2 sm:px-6 sm:py-2.5 bg-human border border-human text-signal text-xs sm:text-sm font-sc font-bold uppercase tracking-wider rounded shadow-[0_0_15px_rgba(139,0,0,0.5)] hover:bg-void hover:text-human transition-all flex items-center space-x-1.5 sm:space-x-2"
              >
                <Sparkles size={14} />
                <span>Carve New Destiny</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6" id="saved-matrices-list">
        
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
                <p className="text-xs text-neutral-400 font-sans truncate mt-1">
                  MC: {mostRecentStory.mcName} • {mostRecentStory.memory.currentPowerStage}
                </p>
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
                onClick={() => handleResumeReading(mostRecentStory)}
                className="w-full md:w-auto px-6 py-3 bg-human border border-human text-signal text-sm font-sc font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(139,0,0,0.5)] hover:bg-void hover:text-human"
              >
                <Play size={16} />
                <span>Quick Resume</span>
              </button>
            </div>
          </div>
        )}
        
        <div className="bg-neutral-950/80 border border-neutral-900 rounded-lg p-5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_30px_rgba(0,0,0,0.8)]" id="vault-desk-panel">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-portal/10 border border-portal/20 text-portal rounded-full flex-shrink-0">
              <Database size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-sc font-bold text-sm text-signal uppercase tracking-wider">Aetherial Memory Sanctum</h4>
                <span className="text-[10px] px-2 py-0.25 bg-[#00A86B]/15 border border-[#00A86B]/35 text-[#00A86B] font-mono rounded-full font-bold uppercase tracking-wider animate-fadeIn">
                  {storageType}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
                Every character bio, relationship map, karma fate node, chapter summary, and reader preference is saved automatically to your local-first client-side database.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3.5 w-full md:w-auto justify-end">
            <label className="flex items-center space-x-2 bg-void hover:bg-neutral-900 text-neutral-300 hover:text-signal border border-neutral-800 hover:border-neutral-700 px-4 py-2 rounded text-xs font-sc font-bold uppercase tracking-wider cursor-pointer transition-all">
              <Upload size={14} className="text-portal" />
              <span>Import World Scroll</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportLibrary} 
                className="hidden" 
              />
            </label>

            <button
              onClick={handleExportLibrary}
              disabled={stories.length === 0}
              className="flex items-center space-x-2 bg-void hover:bg-neutral-900 text-neutral-350 hover:text-signal border border-neutral-800 hover:border-neutral-700 px-4 py-2 rounded text-xs font-sc font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Download size={14} className="text-gold-accent" />
              <span>Backup Full Library</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
          <h3 className="font-display font-bold text-2xl text-signal tracking-wide flex items-center space-x-2">
            <BookOpen size={20} className="text-gold-accent" />
            <span>Your Library ({stories.length})</span>
          </h3>
        </div>

        {stories.length === 0 ? (
          <div className="text-center py-20 bg-[#111] border border-neutral-900 rounded-lg max-w-lg mx-auto shadow-inner">
            <BookOpen size={40} className="text-neutral-800 mx-auto mb-4 animate-bounce" />
            <h4 className="font-sc font-semibold text-neutral-400 text-sm uppercase tracking-wider mb-1">
              No Scrolls Found
            </h4>
            <p className="text-xs text-neutral-600 max-w-xs mx-auto mb-6">
              Your cultivation path is empty. Manifest a new realm to begin reading.
            </p>
            <button
              onClick={() => setCurrentScreen('creator')}
              className="px-4 py-2 bg-void border border-neutral-800 hover:border-gold-accent text-xs text-neutral-300 hover:text-gold-accent rounded transition-all font-sc uppercase tracking-widest"
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
                       onClick={(e) => handleDeleteStory(story.id, e)}
                       className="absolute top-2 left-2 p-1.5 text-neutral-400 bg-black/60 border border-neutral-800 backdrop-blur-sm hover:text-red-500 hover:border-red-900 rounded opacity-0 group-hover:opacity-100 transition-all font-sc"
                       title="Burn Scroll"
                    >
                       <Trash2 size={12} />
                    </button>
                    <div className="absolute bottom-2 left-2 right-2">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-jade-accent px-1.5 py-0.5 bg-black/80 border border-neutral-800 rounded mb-1 inline-block">
                        {story.genre}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-base text-signal group-hover:text-gold-accent transition-colors leading-tight line-clamp-2">
                      {story.title}
                    </h4>
                    <p className="text-[10px] text-neutral-500 font-sans truncate">
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
    </motion.div>
  );
};
