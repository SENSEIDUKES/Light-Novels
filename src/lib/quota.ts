import { supabase } from './supabase';
import { LOCAL_ONLY_MODE } from './firebase'; // we can just keep using LOCAL_ONLY_MODE flag

export async function checkAndConsumeImageQuota(opts?: { automatic?: boolean }): Promise<void> {
  if (LOCAL_ONLY_MODE || !supabase) return;
  if (opts?.automatic) {
    return; // System actions do not count against manual user limits and do not throw
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return; // Allow if not logged in (or we can block, but let's allow for now)
  
  const { data } = await supabase.from('users').select('*').eq('uid', user.id).single();
  
  if (data) {
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
      await supabase.from('users').update({
        imageGenerationCount: 1,
        imageQuotaResetAt: nextReset
      }).eq('uid', user.id);
    } else {
      // Supabase has an RPC function for incrementing, but for now we can just read/write since it's personal quota
      await supabase.from('users').update({
        imageGenerationCount: count + 1
      }).eq('uid', user.id);
    }
  }
}
