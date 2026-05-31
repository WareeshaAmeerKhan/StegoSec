export const DB_NAME = "StegoSecDB";
export const DB_VERSION = 1;

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject(event.target.error);

    request.onsuccess = (event) => {
      const db = event.target.result;
      
      // Seed admin user if not present
      try {
        const tx = db.transaction('users', 'readwrite');
        const store = tx.objectStore('users');
        const getReq = store.get('admin');
        getReq.onsuccess = (e) => {
          const existing = e.target.result;
          if (!existing) {
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            store.put({
              id: 'admin',
              passwordHash: 'admin_123',
              role: 'admin',
              masterKeySalt: Array.from(salt),
              imagesSent: 0,
              imagesReceived: 0,
              createdAt: Date.now()
            });
          } else {
            let updated = false;
            if (existing.passwordHash === 'admin123') {
              existing.passwordHash = 'admin_123';
              updated = true;
            }
            if (existing.role !== 'admin') {
              existing.role = 'admin';
              updated = true;
            }
            if (updated) {
              store.put(existing);
            }
          }
        };
      } catch (err) {
        console.error('Admin seeding failed:', err);
      }
      
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Users table: store username, masterKeySalt, etc.
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }

      // Friends table
      if (!db.objectStoreNames.contains('friends')) {
        const store = db.createObjectStore('friends', { keyPath: 'id', autoIncrement: true });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('friendId', 'friendId', { unique: false });
      }

      // Chats table
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
        store.createIndex('senderId', 'senderId', { unique: false });
        store.createIndex('receiverId', 'receiverId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Audit logs
      if (!db.objectStoreNames.contains('auditLogs')) {
        const store = db.createObjectStore('auditLogs', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

export const saveToStore = async (storeName, data) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getFromStore = async (storeName, key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllFromStore = async (storeName) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const queryStoreByIndex = async (storeName, indexName, query) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(query);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteFromStore = async (storeName, key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
