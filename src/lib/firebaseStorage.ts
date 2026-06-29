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
        deleted: story.deleted || false,
      };
      await setDoc(docRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${this.collectionName}/${story.id}`);
    }
  }

  async deleteStory(id: string): Promise<void> {
    if (!this.isAuth()) throw new Error('Cannot delete from Firebase without authentication');
    
    try {
      const chaptersRef = collection(db, `${this.collectionName}/${id}/chapters`);
      const chapsSnap = await getDocs(chaptersRef);
      const deletes: Promise<void>[] = [];
      chapsSnap.forEach(chapSnap => {
        deletes.push(deleteDoc(chapSnap.ref));
      });
      await Promise.all(deletes);

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

  async getLoreGlossary(novelId: string): Promise<any[]> {
    if (!this.isAuth()) return [];
    try {
      const q = query(
        collection(db, 'lore_glossary'),
        where('novel_id', '==', novelId)
      );
      const querySnapshot = await getDocs(q);
      const terms: any[] = [];
      querySnapshot.forEach((docSnap) => {
        terms.push({ id: docSnap.id, ...docSnap.data() });
      });
      return terms;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'lore_glossary');
      return [];
    }
  }

  async saveLoreGlossaryTerm(term: any): Promise<void> {
    if (!this.isAuth()) throw new Error('Cannot save to Firebase without authentication');
    try {
      const docRef = term.id ? doc(db, 'lore_glossary', term.id) : doc(collection(db, 'lore_glossary'));
      await setDoc(docRef, term, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'lore_glossary');
    }
  }

  async deleteLoreGlossaryTerm(termId: string): Promise<void> {
    if (!this.isAuth()) throw new Error('Cannot delete from Firebase without authentication');
    try {
      await deleteDoc(doc(db, 'lore_glossary', termId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'lore_glossary');
    }
  }

  async wipeMyCloudData(): Promise<void> {
    if (!this.isAuth()) throw new Error('Cannot wipe data without authentication');
    try {
      const q = query(
        collection(db, this.collectionName), 
        where('userId', '==', auth.currentUser!.uid)
      );
      const querySnapshot = await getDocs(q);
      
      const batchPromises = [];
      querySnapshot.forEach((docSnap) => {
        const storyId = docSnap.id;
        // Since we can't easily query all subcollections without knowing chapter IDs,
        // and chapter numbers are 1, 2, 3... we can't do a simple delete without cloud functions.
        // Wait, we CAN query a subcollection!
        const chaptersRef = collection(db, `${this.collectionName}/${storyId}/chapters`);
        batchPromises.push(getDocs(chaptersRef).then(chapsSnap => {
           const deletes = [];
           chapsSnap.forEach(chapSnap => {
              deletes.push(deleteDoc(chapSnap.ref));
           });
           return Promise.all(deletes);
        }).then(() => {
           return deleteDoc(docSnap.ref);
        }));
      });
      
      await Promise.all(batchPromises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, this.collectionName);
    }
  }

  async clearAll(): Promise<void> {
    // Risky, usually better not to implement bulk delete on client
    throw new Error("clearAll not supported on Firebase adapter directly for safety");
  }
}

export const firebaseStorage = new FirebaseStorageAdapter();
