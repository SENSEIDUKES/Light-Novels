import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersistCultivatorPortraitInput } from './cultivatorPortraitPersistence';

const mocks = vi.hoisted(() => ({
  db: { kind: 'firestore' },
  firebaseStorage: { kind: 'storage' },
  generateUUID: vi.fn(),
  doc: vi.fn(),
  writeBatch: vi.fn(),
  batchSet: vi.fn(),
  batchCommit: vi.fn(),
  storageRef: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  db: mocks.db,
  firebaseStorage: mocks.firebaseStorage,
}));

vi.mock('../lib/id', () => ({
  generateUUID: mocks.generateUUID,
}));

vi.mock('firebase/firestore', () => ({
  doc: mocks.doc,
  writeBatch: mocks.writeBatch,
}));

vi.mock('firebase/storage', () => ({
  ref: mocks.storageRef,
  uploadBytes: mocks.uploadBytes,
  getDownloadURL: mocks.getDownloadURL,
  deleteObject: mocks.deleteObject,
}));

import { persistCultivatorPortrait } from './cultivatorPortraitPersistence';

const DOWNLOAD_URL = 'https://storage.example.test/portrait-id.png';

function makeInput(
  overrides: Partial<PersistCultivatorPortraitInput> = {},
): PersistCultivatorPortraitInput {
  return {
    userId: 'user-123',
    imageSource: 'data:image/png;base64,AAEC',
    prompt: 'A moonlit cultivator portrait',
    description: 'Silver hair and azure robes',
    daoRank: 'Dao Adept',
    daoXp: 720,
    powerStage: 'Core Formation',
    equippedArtifactId: 'artifact-9',
    usedReferenceImage: true,
    ...overrides,
  };
}

describe('persistCultivatorPortrait', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    mocks.generateUUID.mockReturnValue('portrait-id');
    mocks.doc.mockImplementation((_db, ...segments: string[]) => ({
      kind: 'document',
      path: segments.join('/'),
    }));
    mocks.storageRef.mockImplementation((_storage, path: string) => ({
      kind: 'storage-reference',
      path,
    }));
    mocks.writeBatch.mockReturnValue({
      set: mocks.batchSet,
      commit: mocks.batchCommit,
    });
    mocks.uploadBytes.mockResolvedValue({});
    mocks.getDownloadURL.mockResolvedValue(DOWNLOAD_URL);
    mocks.batchCommit.mockResolvedValue(undefined);
    mocks.deleteObject.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uploads a data URL and atomically stores durable portrait and profile records', async () => {
    const portrait = await persistCultivatorPortrait(makeInput());

    expect(mocks.storageRef).toHaveBeenCalledWith(
      mocks.firebaseStorage,
      'users/user-123/portraits/portrait-id.png',
    );
    const uploadedBlob = mocks.uploadBytes.mock.calls[0][1] as Blob;
    expect(uploadedBlob).toBeInstanceOf(Blob);
    expect(uploadedBlob.type).toBe('image/png');
    expect(uploadedBlob.size).toBe(3);
    expect(mocks.uploadBytes).toHaveBeenCalledWith(
      { kind: 'storage-reference', path: 'users/user-123/portraits/portrait-id.png' },
      uploadedBlob,
      { contentType: 'image/png' },
    );

    expect(portrait).toMatchObject({
      schemaVersion: 1,
      id: 'portrait-id',
      userId: 'user-123',
      imageUrl: DOWNLOAD_URL,
      storagePath: 'users/user-123/portraits/portrait-id.png',
      mimeType: 'image/png',
      source: 'generated',
      generation: {
        prompt: 'A moonlit cultivator portrait',
        description: 'Silver hair and azure robes',
        daoRank: 'Dao Adept',
        daoXp: 720,
        powerStage: 'Core Formation',
        equippedArtifactId: 'artifact-9',
        usedReferenceImage: true,
      },
      customization: {
        frameId: null,
        glowId: null,
        bannerId: null,
        effectIds: [],
      },
    });
    expect(portrait.imageUrl).not.toContain('data:');
    expect(portrait.createdAt).toBe(portrait.updatedAt);
    expect(Number.isNaN(Date.parse(portrait.createdAt))).toBe(false);

    expect(mocks.batchSet).toHaveBeenNthCalledWith(
      1,
      { kind: 'document', path: 'users/user-123/portraits/portrait-id' },
      portrait,
    );
    expect(mocks.batchSet).toHaveBeenNthCalledWith(
      2,
      { kind: 'document', path: 'users/user-123' },
      {
        avatarUrl: DOWNLOAD_URL,
        activePortraitId: 'portrait-id',
        updatedAt: portrait.updatedAt,
      },
      { merge: true },
    );
    expect(mocks.batchCommit).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches a remote image, validates its blob, and uses its MIME extension', async () => {
    const remoteBlob = new Blob([new Uint8Array([4, 5, 6, 7])], {
      type: 'image/webp',
    });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => remoteBlob,
    } as Response);

    const portrait = await persistCultivatorPortrait(makeInput({
      imageSource: 'https://images.example.test/generated/portrait',
    }));

    expect(fetchMock).toHaveBeenCalledWith('https://images.example.test/generated/portrait');
    expect(mocks.uploadBytes).toHaveBeenCalledWith(
      { kind: 'storage-reference', path: 'users/user-123/portraits/portrait-id.webp' },
      remoteBlob,
      { contentType: 'image/webp' },
    );
    expect(portrait).toMatchObject({
      mimeType: 'image/webp',
      storagePath: 'users/user-123/portraits/portrait-id.webp',
    });
  });

  it('rejects unsupported data URL and remote blob image types before uploading', async () => {
    await expect(persistCultivatorPortrait(makeInput({
      imageSource: 'data:image/gif;base64,R0lGODlh',
    }))).rejects.toThrow('Unsupported portrait image type: image/gif.');

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(['gif'], { type: 'image/gif' }),
    } as Response);

    await expect(persistCultivatorPortrait(makeInput({
      imageSource: 'https://images.example.test/portrait.gif',
    }))).rejects.toThrow('Unsupported portrait image type: image/gif.');

    expect(mocks.uploadBytes).not.toHaveBeenCalled();
    expect(mocks.writeBatch).not.toHaveBeenCalled();
  });

  it('rejects invalid account IDs and empty images before uploading', async () => {
    await expect(persistCultivatorPortrait(makeInput({
      userId: '../another-account',
    }))).rejects.toThrow('A valid user ID is required');
    await expect(persistCultivatorPortrait(makeInput({
      imageSource: 'data:image/png;base64,',
    }))).rejects.toThrow('Portrait image is empty.');

    expect(mocks.uploadBytes).not.toHaveBeenCalled();
  });

  it('bounds generation metadata to the Firestore portrait contract', async () => {
    const portrait = await persistCultivatorPortrait(makeInput({
      prompt: 'p'.repeat(5001),
      description: 'd'.repeat(2001),
      daoRank: 'r'.repeat(101),
      daoXp: -10,
      powerStage: 's'.repeat(201),
      equippedArtifactId: 'a'.repeat(129),
    }));

    expect(portrait.generation.prompt).toHaveLength(5000);
    expect(portrait.generation.description).toHaveLength(2000);
    expect(portrait.generation.daoRank).toHaveLength(100);
    expect(portrait.generation.daoXp).toBe(0);
    expect(portrait.generation.powerStage).toHaveLength(200);
    expect(portrait.generation.equippedArtifactId).toHaveLength(128);
  });

  it('rejects images larger than 10 MiB before uploading', async () => {
    const oversizedBlob = new Blob(
      [new Uint8Array((10 * 1024 * 1024) + 1)],
      { type: 'image/jpeg' },
    );
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => oversizedBlob,
    } as Response);

    await expect(persistCultivatorPortrait(makeInput({
      imageSource: 'https://images.example.test/oversized.jpg',
    }))).rejects.toThrow('Portrait image exceeds the 10 MiB limit.');

    expect(mocks.uploadBytes).not.toHaveBeenCalled();
    expect(mocks.writeBatch).not.toHaveBeenCalled();
  });

  it('surfaces remote fetch failures without creating storage or database records', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network offline'));

    await expect(persistCultivatorPortrait(makeInput({
      imageSource: 'https://images.example.test/unreachable.png',
    }))).rejects.toThrow('Failed to fetch portrait image.');

    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 } as Response);
    await expect(persistCultivatorPortrait(makeInput({
      imageSource: 'https://images.example.test/missing.png',
    }))).rejects.toThrow('Failed to fetch portrait image (HTTP 404).');

    expect(mocks.uploadBytes).not.toHaveBeenCalled();
    expect(mocks.writeBatch).not.toHaveBeenCalled();
  });

  it('best-effort deletes the uploaded object when the atomic batch fails', async () => {
    const commitError = new Error('firestore unavailable');
    mocks.batchCommit.mockRejectedValueOnce(commitError);
    mocks.deleteObject.mockRejectedValueOnce(new Error('cleanup unavailable'));

    await expect(persistCultivatorPortrait(makeInput())).rejects.toBe(commitError);

    expect(mocks.deleteObject).toHaveBeenCalledWith({
      kind: 'storage-reference',
      path: 'users/user-123/portraits/portrait-id.png',
    });
  });
});
