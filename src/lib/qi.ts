import { doc, setDoc, increment, collection, addDoc, query, where, getDocs, Timestamp, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export const DAO_RANKS = [
  { threshold: 0, name: 'Mortal Reader' },
  { threshold: 100, name: 'Wandering Disciple' },
  { threshold: 300, name: 'Outer Sect Scribe' },
  { threshold: 750, name: 'Inner Sect Scholar' },
  { threshold: 1500, name: 'Dao Adept' },
  { threshold: 3000, name: 'Spirit Author' },
  { threshold: 6000, name: 'Heavenly Chronicler' },
  { threshold: 12000, name: 'Sage of Branching Paths' },
  { threshold: 25000, name: 'Dao Master' }
];

export function getDaoRankData(qi: number = 0) {
  let currentTitle = DAO_RANKS[0].name;
  let nextThreshold = DAO_RANKS[1].threshold;
  let nextTitle = DAO_RANKS[1].name;
  let previousThreshold = DAO_RANKS[0].threshold;

  for (let i = 0; i < DAO_RANKS.length; i++) {
    if (qi >= DAO_RANKS[i].threshold) {
      currentTitle = DAO_RANKS[i].name;
      previousThreshold = DAO_RANKS[i].threshold;
      if (i + 1 < DAO_RANKS.length) {
        nextThreshold = DAO_RANKS[i+1].threshold;
        nextTitle = DAO_RANKS[i+1].name;
      } else {
        nextThreshold = null as any;
        nextTitle = null as any;
      }
    }
  }

  const progress = nextThreshold ? ((qi - previousThreshold) / (nextThreshold - previousThreshold)) * 100 : 100;
  
  return {
     rank: currentTitle,
     nextRank: nextTitle,
     progress: Math.min(Math.max(progress, 0), 100),
     maxQi: nextThreshold,
     currentQi: qi
  };
}

export type QiEvent = 
  | 'chapter_read'
  | 'chapter_finished'
  | 'chapter_generated'
  | 'world_created'
  | 'chapter_sealed'
  | 'branch_created'
  | 'branch_published'
  | 'story_liked';

const QI_VALUES: Record<QiEvent, number> = {
  chapter_read: 2,
  chapter_finished: 5,
  chapter_generated: 10,
  world_created: 25,
  chapter_sealed: 15,
  branch_created: 30,
  branch_published: 50,
  story_liked: 5
};

const DAILY_CAPS: Partial<Record<QiEvent, number>> = {
  chapter_read: 20, // max 20 times a day
  chapter_finished: 10,
  story_liked: 5,
  chapter_generated: 20,
};

export async function awardQi(event: QiEvent, sourceId?: string, sourceType?: string) {
  const user = auth.currentUser;
  if (!user) return; 
  
  const amount = QI_VALUES[event];
  if (!amount) return;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDayStr = today.toISOString();

    const limit = DAILY_CAPS[event];
    if (limit) {
       // Anti-spam check: query dao_xp_events for today
       const q = query(
         collection(db, 'dao_xp_events'), 
         where('user_id', '==', user.uid),
         where('event_type', '==', event),
         where('created_at', '>=', startOfDayStr)
       );
       const snap = await getDocs(q);
       if (snap.size >= limit) {
         console.log(`[AntiSpam] Daily cap reached for ${event}. Qi not awarded.`);
         return; // limit reached
       }
    }

    const eventDoc = {
      user_id: user.uid,
      event_type: event,
      xp_amount: amount,
      source_id: sourceId || null,
      source_type: sourceType || null,
      created_at: new Date().toISOString()
    };
    await addDoc(collection(db, 'dao_xp_events'), eventDoc);

    // Also get the new user doc to update dao_rank
    const userRef = doc(db, 'users', user.uid);
    const uDoc = await getDoc(userRef);
    const data = uDoc.data();
    
    // Support migrating from `qi` to `dao_xp`
    let currentXp = data?.dao_xp;
    if (currentXp === undefined && data?.qi !== undefined) {
      currentXp = data.qi;
    } else if (currentXp === undefined) {
      currentXp = 0;
    }
    const newXp = currentXp + amount;
    const newRank = getDaoRankData(newXp).rank;

    await setDoc(userRef, {
      dao_xp: newXp,
      qi: newXp, // keep backwards compatibility for now just in case
      dao_rank: newRank,
      updatedAt: new Date().toISOString()
    }, { merge: true });

  } catch (error) {
    console.error('Failed to award Qi:', error);
  }
}
