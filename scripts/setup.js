'use strict';
const db = require('@arangodb').db;
const aisisInstances = 'aisisInstances';

const queues = require('@arangodb/foxx/queues');
const queue = queues.create('expirationQueue');

const usersCollection = module.context.collectionName("users");
const sessions = module.context.collectionName("sessions");

const auth = require("./util/auth");
const users = module.context.collection("users");
if (!users.firstExample({ username: "admin" })) {
  users.save({
    username: "admin",
    password: auth.create("hunter2")
  });
}

if (!db._collection(usersCollection)) {
  db._createDocumentCollection(usersCollection);
}
if (!db._collection(sessionsCollection)) {
  db._createDocumentCollection(sessionsCollection);
}
module.context.collection(usersCollection).ensureIndex({
  type: "hash",
  unique: true,
  fields: ["username"]
});

if (!db._collection(collectionName)) {
  db._createDocumentCollection(aisisInstances);
}

// Creates the expire job to check if databases should be expired and dropped.
queue.push(
  {mount: '/createDB', name: 'expire'},
  {},
  {
    repeatTimes: Infinity,
    repeatUntil: -1, // Forever
    repeatDelay: (24 * 60 * 60 * 1000) // Daily
  }
);
