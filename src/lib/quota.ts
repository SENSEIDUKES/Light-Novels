import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from './firebase';

export async function checkAndConsumeImageQuota(opts?: { automatic?: boolean }): Promise<void> {
  if (opts?.automatic) {
    return; // System actions do not count against manual user limits and do not throw
  }
  const user = auth.currentUser;
  if (!user) return; // Allow if not logged in (or we can block, but let's allow for now)
  
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    let count = data.imageGenerationCount || 0;
    const tier = data.premiumTier || 'mortal';
    const resetAtStr = data.imageQuotaResetAt;
    const now = Date.now();
    let shouldReset = false;

    if (resetAtStr) {
      const resetAt = new Date(resetAtStr).getTime();
      if (now > resetAt) {
        shouldReset = true;
      }
    } else {
      shouldReset = true;
    }

    const nextReset = new Date(now + 24 * 60 * 60 * 1000).toISOString();

    if (shouldReset) {
      count = 0;
    }
    
    if (tier === 'mortal' && count >= 4) {
      throw new Error("Mortal tier limits reached (4 manifestations max per day). Please Ascend to the Outer Sect to manifest more visuals.");
    }
    
    if (shouldReset) {
      await updateDoc(userRef, {
        imageGenerationCount: 1,
        imageQuotaResetAt: nextReset
      });
    } else {
      await updateDoc(userRef, {
        imageGenerationCount: increment(1)
      });
    }
  }
}
