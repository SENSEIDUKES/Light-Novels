import { StoryWorld } from '../types';
import { StorageAdapter } from './storage';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';

export class FirebaseStorageAdapter implements StorageAdapter {
  name = 'Firebase';
  private collectionName = 'stories';

  async init(): Promise<void> {
    // Firebase is initialized in firebase.ts
    return Promise.resolve();
  }

  private isAuth(): boolean {
    return auth.currentUser !== null;
  }

  async getStories(): Promise<StoryWorld[]> {
    if (!this.isAuth()) return [];
    
    try {
      const q = query(
        collection(db, this.collectionName), 
        where('userId', '==', auth.currentUser!.uid)
      );
      const querySnapshot = await getDocs(q);
      const stories: StoryWorld[] = [];
      querySnapshot.forEach((docSnap) => {
        stories.push(docSnap.data() as StoryWorld);
      });
      stories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return stories;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.collectionName);
      return []; // Dead code due to throw, but keeps TS happy
    }
  }

  async getStory(id: string): Promise<StoryWorld | null> {
    if (!this.isAuth()) return null;
    
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as StoryWorld & { userId: string };
        if (data.userId === auth.currentUser!.uid) {
           return data;
        }
      }
      return null;
    } catch (error) {
       handleFirestoreError(error, OperationType.GET, `${this.collectionName}/${id}`);
       return null;
    }
  }

  async saveStory(story: StoryWorld): Promise<void> {
    if (!this.isAuth()) throw new Error('Cannot save to Firebase without authentication');
    
    try {
      const docRef = doc(db, this.collectionName, story.id);
      const payload = {
        ...story,
        userId: auth.currentUser!.uid,
      };
      await setDoc(docRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${this.collectionName}/${story.id}`);
    }
  }

  async deleteStory(id: string): Promise<void> {
    if (!this.isAuth()) throw new Error('Cannot delete from Firebase without authentication');
    
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${this.collectionName}/${id}`);
    }
  }

  async getChapterContent(storyId: string, chapterNumber: number): Promise<any | null> {
    if (!this.isAuth()) return null;
    try {
      const docRef = doc(db, `${this.collectionName}/${storyId}/chapters`, chapterNumber.toString());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as any;
      }
      return null;
    } catch (error) {
       handleFirestoreError(error, OperationType.GET, `${this.collectionName}/${storyId}/chapters/${chapterNumber}`);
       return null;
    }
  }

  async saveChapterContent(content: any): Promise<void> {
    if (!this.isAuth()) throw new Error('Cannot save to Firebase without authentication');
    try {
      const docRef = doc(db, `${this.collectionName}/${content.storyId}/chapters`, content.chapterNumber.toString());
      await setDoc(docRef, content, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${this.collectionName}/${content.storyId}/chapters/${content.chapterNumber}`);
    }
  }

  async clearAll(): Promise<void> {
    // Risky, usually better not to implement bulk delete on client
    throw new Error("clearAll not supported on Firebase adapter directly for safety");
  }
}
