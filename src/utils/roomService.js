import { collection, doc, getDocs, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Permanently deletes a room and all its subcollections (accounts, settings) from Firestore.
 * @param {string} roomId
 */
export async function deleteRoomFromFirestore(roomId) {
  if (!db || !roomId) throw new Error('Database or roomId not provided');

  // 1. Delete all accounts in rooms/{roomId}/accounts
  try {
    const accsRef = collection(db, 'rooms', roomId, 'accounts');
    const accsSnap = await getDocs(accsRef);
    const deleteAccPromises = accsSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deleteAccPromises);
  } catch (err) {
    console.warn('Notice while deleting room accounts:', err);
  }

  // 2. Delete settings documents (budget, months, calculators)
  try {
    const settingsDocs = ['budget', 'months', 'calculators'];
    const deleteSettingsPromises = settingsDocs.map(docName => 
      deleteDoc(doc(db, 'rooms', roomId, 'settings', docName)).catch(() => {})
    );
    await Promise.all(deleteSettingsPromises);
  } catch (err) {
    console.warn('Notice while deleting room settings:', err);
  }

  // 3. Delete the main room document
  await deleteDoc(doc(db, 'rooms', roomId));
}

/**
 * Removes a user from a room's members and memberEmails list (leave room).
 * @param {string} roomId
 * @param {string} userEmail
 * @param {string} userUid
 */
export async function leaveRoomInFirestore(roomId, userEmail, userUid) {
  if (!db || !roomId || !userEmail) throw new Error('Missing parameters to leave room');

  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;

  const data = roomSnap.data();
  const normalizedEmail = userEmail.toLowerCase();

  const updatedMembers = (data.members || []).filter(m => 
    (m.uid || m.id) !== userUid && m.email?.toLowerCase() !== normalizedEmail
  );
  const updatedEmails = (data.memberEmails || []).filter(e => 
    e.toLowerCase() !== normalizedEmail
  );

  await updateDoc(roomRef, {
    members: updatedMembers,
    memberEmails: updatedEmails
  });
}
