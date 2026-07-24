import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const LOCAL_ONLY_MODE = localStorage.getItem('seihouse_local_only_mode') === 'true';

export const setLocalOnlyMode = (enabled: boolean) => {
  localStorage.setItem('seihouse_local_only_mode', enabled ? 'true' : 'false');
  window.location.reload();
};

export const firebaseApp = LOCAL_ONLY_MODE ? null as any : initializeApp(firebaseConfig);
export const auth = LOCAL_ONLY_MODE ? ({ currentUser: null, onAuthStateChanged: () => () => {} } as any) : getAuth(firebaseApp);
