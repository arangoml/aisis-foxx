'use strict';
const { aql, query, db } = require("@arangodb");
const users = require("@arangodb/users");

const expirationTime = (336 * 60 * 60 * 1000); // two weeks, set 20000 for dev
const expired = [];

let dbs = query`
  FOR i IN aisisInstances
  RETURN {key: i._key, dbName: i.dbName, timestamp: i.timestamp, username: i.username}`

  dbs.toArray().map((d) => {
  (Date.now() - expirationTime ) > d.timestamp ? removeDatabase(d.dbName, d.key, d.username) : ''
});
dbs = '';

query`
FOR key IN ${expired}
REMOVE { _key: key } IN aisisInstances
`

function removeDatabase(dbName, key, username) {
  try {
        db._dropDatabase(dbName);
        users.remove(username);
      } catch (e) {
        console.log("User or Database removal failed with error: " + e);
      }
      expired.push(key);
}
