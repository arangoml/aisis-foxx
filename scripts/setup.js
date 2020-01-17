'use strict';
const db = require('@arangodb').db;
const collectionName = 'aisisInstances';
const auth = require("../util/auth");
const usersCollection = "users";
const sessionsCollection = "sessions";

if (!db._collection(collectionName)) {
  db._createDocumentCollection(collectionName);
}

if (!db._collection(usersCollection)) {
  db._createDocumentCollection(usersCollection);
}

if (!db._collection(sessionsCollection)) {
  db._createDocumentCollection(sessionsCollection);
}

let users = db._collection('users')
users.ensureIndex({
  type: "hash",
  unique: true,
  fields: ["username"]
})

if (!users.firstExample({ authuser: "admin"})) {
  users.save({
    authuser: "admin",
    authpassword: auth.create("password")
  });
}

const queues = require('@arangodb/foxx/queues');
const queue = queues.create('expirationQueue');

// Creates the expire job to check if databases should be expired and dropped.
queue.push(
  {mount: '/createDB', name: 'expire'},
  {},
  {
    repeatTimes: Infinity,
    repeatUntil: -1,
    repeatDelay: (24 * 60 * 60 * 1000) // Daily, set to 30000 for dev
  }
);
