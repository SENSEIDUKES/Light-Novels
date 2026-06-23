import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from './firebase';

export async function checkAndConsumeImageQuota(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return; // Allow if not logged in (or we can block, but let's allow for now)
  
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const data = userSnap.data();
    const count = data.imageGenerationCount || 0;
    const tier = data.premiumTier || 'free';
    
    if (tier === 'free' && count >= 2) {
      throw new Error("Free tier limits reached (2 manifestations max). Please Ascend to the Inner Sect to manifest more visuals.");
    }
    
    await updateDoc(userRef, {
      imageGenerationCount: increment(1)
    });
  }
}
