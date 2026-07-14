import { StoryWorld } from '../types';
import { StorageAdapter } from './storage';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { generateUUID } from './id';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
} from 'firebase/firestore';

export interface CloudRevisionExpectation {
  exists: boolean;
  updatedAt: string | null;
  /** Unique app-managed revision; optional only for legacy callers/tests. */
  syncRevision?: string | null;
}

export class FirebaseStorageAdapter implements StorageAdapter {
  name = 'Firebase';
  private collectionName = 'stories';

  private getAuthenticatedUid(message: string): string {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error(message);
    return uid;
  }

  private assertAuthenticatedUid(expectedUid: string): void {
    if (auth.currentUser?.uid === expectedUid) return;

    const accountChanged: Error & { code?: string } = new Error(
      'Cloud account changed during Firebase storage operation',
    );
    accountChanged.code = 'auth/account-changed';
    throw accountChanged;
  }

  private revisionChangedError(): Error & { code?: string } {
    const error: Error & { code?: string } = new Error(
      'Cloud record changed after synchronization read',
    );
    error.code = 'sync/revision-changed';
    return error;
  }

  private revisionMatches(
    exists: boolean,
    updatedAt: unknown,
    syncRevision: unknown,
    expected: CloudRevisionExpectation,
  ): boolean {
    if (exists !== expected.exists) return false;
    if (!exists) return true;
    if (
      expected.syncRevision !== undefined &&
      (typeof syncRevision === 'string' ? syncRevision : null) !== expected.syncRevision
    ) {
      return false;
    }
    return (typeof updatedAt === 'string' ? updatedAt : null) === expected.updatedAt;
  }

  private createSyncRevision(): string {
    return generateUUID();
  }

  async init(): Promise<void> {
    // Firebase is initialized in firebase.ts
    return Promise.resolve();
  }

  async getStories(): Promise<StoryWorld[]> {
    const expectedUid = auth.currentUser?.uid;
    if (!expectedUid) return [];
    
    try {
      const q = query(
        collection(db, this.collectionName), 
        where('userId', '==', expectedUid)
      );
      const querySnapshot = await getDocs(q);
      this.assertAuthenticatedUid(expectedUid);
      const stories: StoryWorld[] = [];
      querySnapshot.forEach((docSnap) => {
        stories.push(docSnap.data() as StoryWorld);
      });
      stories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return stories;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.collectionName);
    }
  }

  subscribeToStories(onChange: (storyIds: string[]) => void, onError: (error: unknown) => void): () => void {
    const expectedUid = auth.currentUser?.uid;
    if (!expectedUid) return () => {};

    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', expectedUid),
    );
    return onSnapshot(
      q,
      (snapshot) => {
        // Auth listeners replace this subscription, but an already-queued
        // callback from the previous account must not trigger a cross-account sync.
        if (auth.currentUser?.uid !== expectedUid) return;
        onChange(snapshot.docChanges().map((change) => change.doc.id));
      },
      onError,
    );
  }

  async getStory(id: string): Promise<StoryWorld | null> {
    const expectedUid = auth.currentUser?.uid;
    if (!expectedUid) return null;
    
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      this.assertAuthenticatedUid(expectedUid);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as StoryWorld & { userId: string };
        if (data.userId === expectedUid) {
           return data;
        }
      }
      return null;
    } catch (error) {
       handleFirestoreError(error, OperationType.GET, `${this.collectionName}/${id}`);
    }
  }

  async saveStory(story: StoryWorld): Promise<void> {
    const expectedUid = this.getAuthenticatedUid(
      'Cannot save to Firebase without authentication',
    );
    
    try {
      const docRef = doc(db, this.collectionName, story.id);
      const payload = {
        ...story,
        userId: expectedUid,
        deleted: story.deleted || false,
        syncRevision: story.syncRevision ?? this.createSyncRevision(),
      };
      // Manager payloads are complete snapshots. Replace the document so fields
      // intentionally removed on this device do not survive forever in cloud.
      await setDoc(docRef, payload);
      this.assertAuthenticatedUid(expectedUid);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${this.collectionName}/${story.id}`);
    }
  }

  /**
   * Commit a story only if the exact cloud revision read by the sync pass still
   * exists. Firestore retries this transaction after concurrent writes, so a
   * newer device save is observed and rejected instead of being overwritten.
   */
  async saveStoryIfUnchanged(
    story: StoryWorld,
    expected: CloudRevisionExpectation,
  ): Promise<void> {
    const expectedUid = this.getAuthenticatedUid(
      'Cannot save to Firebase without authentication',
    );

    try {
      const docRef = doc(db, this.collectionName, story.id);
      const payload = {
        ...story,
        userId: expectedUid,
        deleted: story.deleted || false,
        syncRevision: story.syncRevision ?? this.createSyncRevision(),
      };
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(docRef);
        this.assertAuthenticatedUid(expectedUid);
        const currentUpdatedAt = snapshot.exists()
          ? snapshot.data()?.updatedAt
          : null;
        const currentSyncRevision = snapshot.exists()
          ? snapshot.data()?.syncRevision
          : null;
        if (
          !this.revisionMatches(
            snapshot.exists(),
            currentUpdatedAt,
            currentSyncRevision,
            expected,
          )
        ) {
          throw this.revisionChangedError();
        }
        transaction.set(docRef, payload);
      });
      this.assertAuthenticatedUid(expectedUid);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `${this.collectionName}/${story.id}`,
      );
    }
  }

  async deleteStory(id: string): Promise<void> {
    const expectedUid = this.getAuthenticatedUid(
      'Cannot delete from Firebase without authentication',
    );
    
    try {
      // Publish the tombstone first. Rules immediately block stale devices from
      // creating or updating chapter bodies while cleanup is in progress, and a
      // partial cleanup can be retried safely without leaving a live story whose
      // chapter set was only partly deleted.
      const docRef = doc(db, this.collectionName, id);
      await setDoc(docRef, {
        id,
        userId: expectedUid,
        deleted: true,
        updatedAt: new Date().toISOString(),
      });
      this.assertAuthenticatedUid(expectedUid);

      const chaptersRef = collection(db, `${this.collectionName}/${id}/chapters`);
      const chapsSnap = await getDocs(chaptersRef);
      this.assertAuthenticatedUid(expectedUid);
      const deletes: Promise<void>[] = [];
      chapsSnap.forEach(chapSnap => {
        deletes.push(deleteDoc(chapSnap.ref));
      });
      await Promise.all(deletes);
      this.assertAuthenticatedUid(expectedUid);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${this.collectionName}/${id}`);
    }
  }

  async getChapterContent(storyId: string, chapterNumber: number): Promise<any | null> {
    const expectedUid = auth.currentUser?.uid;
    if (!expectedUid) return null;
    try {
      const docRef = doc(db, `${this.collectionName}/${storyId}/chapters`, chapterNumber.toString());
      const docSnap = await getDoc(docRef);
      this.assertAuthenticatedUid(expectedUid);
      if (docSnap.exists()) {
        return docSnap.data() as any;
      }
      return null;
    } catch (error) {
       handleFirestoreError(error, OperationType.GET, `${this.collectionName}/${storyId}/chapters/${chapterNumber}`);
    }
  }

  async saveChapterContent(content: any): Promise<void> {
    const expectedUid = this.getAuthenticatedUid(
      'Cannot save to Firebase without authentication',
    );
    try {
      const docRef = doc(db, `${this.collectionName}/${content.storyId}/chapters`, content.chapterNumber.toString());
      await setDoc(docRef, {
        ...content,
        userId: expectedUid,
        syncRevision: content.syncRevision ?? this.createSyncRevision(),
      });
      this.assertAuthenticatedUid(expectedUid);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${this.collectionName}/${content.storyId}/chapters/${content.chapterNumber}`);
    }
  }

  /** Revision-checked counterpart to saveChapterContent for sync reconciliation. */
  async saveChapterContentIfUnchanged(
    content: any,
    expected: CloudRevisionExpectation,
  ): Promise<void> {
    const expectedUid = this.getAuthenticatedUid(
      'Cannot save to Firebase without authentication',
    );
    try {
      const docRef = doc(
        db,
        `${this.collectionName}/${content.storyId}/chapters`,
        content.chapterNumber.toString(),
      );
      const payload = {
        ...content,
        userId: expectedUid,
        syncRevision: content.syncRevision ?? this.createSyncRevision(),
      };
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(docRef);
        this.assertAuthenticatedUid(expectedUid);
        const currentUpdatedAt = snapshot.exists()
          ? snapshot.data()?.updatedAt
          : null;
        const currentSyncRevision = snapshot.exists()
          ? snapshot.data()?.syncRevision
          : null;
        if (
          !this.revisionMatches(
            snapshot.exists(),
            currentUpdatedAt,
            currentSyncRevision,
            expected,
          )
        ) {
          throw this.revisionChangedError();
        }
        transaction.set(docRef, payload);
      });
      this.assertAuthenticatedUid(expectedUid);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `${this.collectionName}/${content.storyId}/chapters/${content.chapterNumber}`,
      );
    }
  }

  async getLoreGlossary(novelId: string): Promise<any[]> {
    const expectedUid = auth.currentUser?.uid;
    if (!expectedUid) return [];
    try {
      const q = query(
        collection(db, 'lore_glossary'),
        where('novel_id', '==', novelId)
      );
      const querySnapshot = await getDocs(q);
      this.assertAuthenticatedUid(expectedUid);
      const terms: any[] = [];
      querySnapshot.forEach((docSnap) => {
        terms.push({ id: docSnap.id, ...docSnap.data() });
      });
      return terms;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'lore_glossary');
    }
  }

  async saveLoreGlossaryTerm(term: any): Promise<void> {
    const expectedUid = this.getAuthenticatedUid(
      'Cannot save to Firebase without authentication',
    );
    try {
      const docRef = term.id ? doc(db, 'lore_glossary', term.id) : doc(collection(db, 'lore_glossary'));
      await setDoc(docRef, term, { merge: true });
      this.assertAuthenticatedUid(expectedUid);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'lore_glossary');
    }
  }

  async deleteLoreGlossaryTerm(termId: string): Promise<void> {
    const expectedUid = this.getAuthenticatedUid(
      'Cannot delete from Firebase without authentication',
    );
    try {
      await deleteDoc(doc(db, 'lore_glossary', termId));
      this.assertAuthenticatedUid(expectedUid);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'lore_glossary');
    }
  }

}

export const firebaseStorage = new FirebaseStorageAdapter();
