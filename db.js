import Firestore from "@google-cloud/firestore";

const db = new Firestore();

export async function createUser({
  channelId,
  guildId,
  connectCode,
  discordUser,
  requestId,
}) {
  const {
    username: discordUsername,
    id: discordUserId,
    guildNickname,
  } = discordUser;

  const user = {
    connectCode,
    creationDetails: {
      requestId,
      channelId,
      guildId,
      user: {
        discordUsername,
        discordUserId,
        guildNickname,
      },
    },
  };

  const userDocument = db.doc(`users/${connectCode}`);
  await userDocument.set(user);
}

export async function listUsers() {
  const usersCollection = db.collection("users");
  const documentRefs = await usersCollection.listDocuments();
  return documentRefs.map((x) => x.id);
}

export async function removeUser(connectCode) {
  const userDocument = db.doc(`users/${connectCode}`);
  await userDocument.delete();
}

export async function writeResults(results) {
  const resultsDoc = db.doc(`results/${results.createdAt}`);
  await resultsDoc.set(results);
}

export async function readResults() {
  const collection = db.collection("results");
  const snapshot = await collection.orderBy("createdAt", "desc").limit(2).get();
  if (snapshot.empty) throw "wtf";
  const results = snapshot.docs.map((doc) => doc.data());
  return results;
}

export async function writeLastMessages({ channelId, messageIds }) {
  const doc = db.doc(`discordMessages/${channelId}`);
  await doc.set({ messageIds });
}

export async function readLastMessages(channelId) {
  const doc = db.doc(`discordMessages/${channelId}`);
  const snapshot = await doc.get();
  return snapshot.data()?.messageIds;
}

export async function getRegistrationDetails(connectCode) {
  const userDocument = db.doc(`users/${connectCode}`);
  const snapshot = await userDocument.get();
  if (!snapshot.exists) return null;
  const { creationDetails } = snapshot.data();
  return creationDetails;
}
