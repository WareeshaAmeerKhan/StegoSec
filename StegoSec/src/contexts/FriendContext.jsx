/**
 * FriendContext
 *
 * Key-exchange simulation strategy (single-device demo without PKI):
 * When User A accepts User B's request, a 32-byte shared secret is generated.
 * That raw secret is stored in the DB as `sharedSecret` (plaintext array).
 * Both users derive the Shared Session Key from it via HKDF on demand.
 * In a real app you'd use Diffie-Hellman or wrap the secret with each user's public key.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getFromStore, saveToStore, getAllFromStore, deleteFromStore } from '../services/db';
import { useAuth } from './AuthContext';
import { useAudit } from './AuditContext';
import { deriveSharedSessionKey } from '../utils/crypto';

const FriendContext = createContext(null);

export const FriendProvider = ({ children }) => {
  const { user, masterKey } = useAuth();
  const { logEvent }        = useAudit();

  const [friends,    setFriends]    = useState([]);
  const [sharedKeys, setSharedKeys] = useState({});   // friendId → CryptoKey
  const [messages,   setMessages]   = useState([]);

  // ── Load when user or masterKey changes ──────────────────────────────────
  useEffect(() => {
    if (user) {
      refreshFriends();
      refreshMessages();
    } else {
      setFriends([]);
      setSharedKeys({});
      setMessages([]);
    }
  }, [user?.id, masterKey]);   // masterKey changes after login with password

  const refreshFriends = useCallback(async () => {
    if (!user) return;
    const all = await getAllFromStore('friends');
    const mine = all.filter(f => f.userId === user.id || f.friendId === user.id);

    const enriched = [];
    const keys = {};

    for (const f of mine) {
      const otherId   = f.userId === user.id ? f.friendId : f.userId;
      const otherUser = await getFromStore('users', otherId);
      if (!otherUser) continue;
      enriched.push({ ...f, otherId, otherUser });

      if (f.status === 'accepted' && f.sharedSecret) {
        // Both sides derive the SAME key from the SAME shared secret
        try {
          const label = [user.id, otherId].sort().join(':');
          const key   = await deriveSharedSessionKey(new Uint8Array(f.sharedSecret), label);
          keys[otherId] = key;
        } catch (e) {
          console.error('Key derivation failed for', otherId, e);
        }
      }
    }

    setFriends(enriched);
    setSharedKeys(keys);
  }, [user]);

  const refreshMessages = useCallback(async () => {
    if (!user) return;
    const all = await getAllFromStore('messages');
    const mine = all
      .filter(m => m.senderId === user.id || m.receiverId === user.id)
      .sort((a, b) => a.timestamp - b.timestamp);
    setMessages(mine);
  }, [user]);

  // ── Friend requests ──────────────────────────────────────────────────────
  const sendFriendRequest = useCallback(async (friendId) => {
    if (!user) return;
    const all = await getAllFromStore('friends');
    const dupe = all.find(f =>
      (f.userId === user.id && f.friendId === friendId) ||
      (f.userId === friendId && f.friendId === user.id)
    );
    if (dupe) throw new Error('Request already exists.');
    await saveToStore('friends', {
      userId: user.id, friendId, status: 'pending', timestamp: Date.now()
    });
    logEvent('FRIEND', `Request sent to ${friendId}`, true, user.id);
    await refreshFriends();
  }, [user, refreshFriends, logEvent]);

  const acceptFriendRequest = useCallback(async (requesterId) => {
    if (!user) return;
    const all = await getAllFromStore('friends');
    const req = all.find(f =>
      f.userId === requesterId && f.friendId === user.id && f.status === 'pending'
    );
    if (!req) throw new Error('Request not found.');

    // Generate a shared secret and persist it
    const sharedSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)));
    req.status       = 'accepted';
    req.sharedSecret = sharedSecret;
    req.acceptedAt   = Date.now();
    await saveToStore('friends', req);
    logEvent('FRIEND', `Accepted request from ${requesterId}`, true, user.id);
    await refreshFriends();
  }, [user, refreshFriends, logEvent]);

  // ── Messaging ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (receiverId, imageDataUrl, selfDestruct = false) => {
    if (!user) return;
    const msg = {
      senderId: user.id,
      receiverId,
      imageDataUrl,
      selfDestruct,
      burned: false,
      timestamp: Date.now(),
    };
    const id = await saveToStore('messages', msg);
    logEvent('SEND', `Stego image sent to ${receiverId}`, true, user.id);
    await refreshMessages();
    return id;
  }, [user, refreshMessages, logEvent]);

  const burnMessage = useCallback(async (msgId) => {
    const msg = await getFromStore('messages', msgId);
    if (msg) {
      await deleteFromStore('messages', msgId);
      logEvent('SELF-DESTRUCT', `Message ${msgId} burned`, true, user?.id);
      await refreshMessages();
    }
  }, [user, refreshMessages, logEvent]);

  return (
    <FriendContext.Provider value={{
      friends, sharedKeys, messages,
      sendFriendRequest, acceptFriendRequest,
      sendMessage, burnMessage, refreshMessages,
    }}>
      {children}
    </FriendContext.Provider>
  );
};

export const useFriends = () => useContext(FriendContext);
