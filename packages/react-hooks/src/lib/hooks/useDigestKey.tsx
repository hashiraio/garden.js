import { DigestKey } from '@gardenfi/utils';
import { DIGEST_KEY, STORE_NAME, VERSION } from '../constants';
import { useEffect, useState } from 'react';
import { DB_NAME } from '../constants';

export const useDigestKey = (setRedeemServiceEnabled: boolean = true) => {
  const [digestKey, setDigestKey] = useState<DigestKey>();

  //Initialize digest key
  useEffect(() => {
    if (!indexedDB) {
      console.error('IndexedDB is not supported in this browser');
      return;
    }

    let db: IDBDatabase;
    const request = indexedDB.open(DB_NAME, VERSION);

    request.onerror = (event) => {
      console.error(
        'IndexedDB error:',
        (event.target as IDBOpenDBRequest).error,
      );
    };

    // This is critical - object stores can ONLY be created in onupgradeneeded
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const target = event.target as IDBOpenDBRequest;
      const db = target.result;

      // Create the object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event: Event) => {
      db = (event.target as IDBOpenDBRequest).result;

      // Double-check the store exists before attempting to use it
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // Close current connection
        db.close();

        // Increment version to trigger onupgradeneeded
        const reopenRequest = indexedDB.open(DB_NAME, db.version + 1);

        reopenRequest.onupgradeneeded = (event) => {
          const newDb = (event.target as IDBOpenDBRequest).result;
          newDb.createObjectStore(STORE_NAME, { keyPath: 'id' });
        };

        reopenRequest.onsuccess = () => {
          processDigestKey(reopenRequest.result);
        };

        return;
      }

      // If store exists, proceed with normal operation
      processDigestKey(db);
    };

    // Function to handle digest key operations
    function processDigestKey(database: IDBDatabase) {
      try {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const getRequest = store.get(DIGEST_KEY);

        getRequest.onsuccess = () => {
          if (getRequest.result) {
            // Key already exists, just use it
            const digestKeyResult = DigestKey.from(getRequest.result.value);
            if (!digestKeyResult.error) {
              setDigestKey(digestKeyResult.val);
              return;
            }
          }

          // Generate a new digest key if none exists or the existing one is invalid
          const newValue = DigestKey.generateRandom();
          if (!newValue.ok) {
            console.error('Error generating new digest key:', newValue.error);
            return;
          }

          // Only store in IndexedDB if setRedeemServiceEnabled is false
          if (!setRedeemServiceEnabled) {
            const putRequest = store.put({
              id: DIGEST_KEY,
              value: newValue.val.digestKey,
            });

            putRequest.onsuccess = () => {
              setDigestKey(DigestKey.from(newValue.val.digestKey).val);
            };

            putRequest.onerror = (e) => {
              console.error('Error storing new digest key:', e);
            };
          } else {
            // If setRedeemServiceEnabled is true, just set the digestKey without storing
            setDigestKey(DigestKey.from(newValue.val.digestKey).val);
          }
        };

        getRequest.onerror = (e) => {
          console.error('Error retrieving digest key:', e);
        };

        transaction.oncomplete = () => {};

        transaction.onerror = (error) => {
          console.error('Error in digestKey transaction:', error);
        };
      } catch (err) {
        console.error('Transaction error:', err);
      }
    }

    // Cleanup function
    return () => {
      if (db) {
        db.close();
      }
    };
  }, [setRedeemServiceEnabled]);

  return { digestKey };
};
