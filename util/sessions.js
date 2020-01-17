"use strict";
const { aql, query, db } = require("@arangodb");

const sessionsMiddleware = require("@arangodb/foxx/sessions");
const sessions = sessionsMiddleware({
  storage: db._collection("sessions"),
  transport: "cookie"
});
module.exports = sessions;
