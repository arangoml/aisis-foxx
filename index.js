'use strict';
const { aql, query, db } = require("@arangodb");
const createRouter = require('@arangodb/foxx/router');
const users = require("@arangodb/users");
const auth = require("./util/auth");
const router = createRouter();
const joi = require('joi');

const aisisInstances = "aisisInstances"

const sessions = require("./util/sessions");
module.context.use(sessions);

module.context.use(router);

router.post('/createDB', function (req,res) {
  const data = req.body;
  const dbName = data.dbName ? data.dbName : randomStringGenerator();
  const username = data.username ? data.username : randomStringGenerator();
  const password = data.password ? data.password : randomStringGenerator();
  const email = data.email ? data.email : 'noreply@arangodb.com';
  const userCollection = db._collection("users");

// Before creating any users or databases confirm user is authorized to do so.
  // 'authuser' and 'authpassword' must be supplied in request body
  // Finds admin-root user created during setup
    const authuser = data.authuser ? userCollection.firstExample({
    authuser: data.authuser
  }) : '';

  // Verifies the stored hash against the supplied password.
  const valid = auth.verify(
    authuser ? authuser.authpassword : {},
    data.authpassword
  );

  if(!valid) {
    res.throw(401, "Invalid authorization username or password.");
  }

  // If valid authuser a session is stored and request continues.
  req.session.uid = authuser._key;
  req.sessionStorage.save(req.session);

// If user doesn't exist, create the user
  try {
    users.document(username);
    // If user does exist send error response.
      res.send("User already exists, please supply new username.").status(409);
  } catch(err) {

    // Handle duplicate database name.
    try {
      db._createDatabase(dbName);
    } catch (err) {
      res.send("Database already exists or invalid name supplied, please supply new dbName.").status(400);
    }


    users.save(username, password, true);
    // Grants user access only to newly created database
    users.grantDatabase(username, dbName, 'rw');



    // @TODO: obtain hostname and port of external deployment if necessary.
    // Returns hostname and port
    let hostname = req.hostname
    let port = req.port

    let insertDoc = query`INSERT {
      "dbName": ${dbName},
      "username": ${username},
      "hostname": ${hostname},
      "port": ${port},
      "email": ${email},
      "timestamp": DATE_NOW()
    } INTO aisisInstances`

    res.send({dbName, username, password, hostname, port});
    }
})
.body(joi.object().required(), 'Creates a new database, optionally provide dbName, username, or password ')
.response(joi.object().required(), 'Returns database name, username, and password.')
.summary('Creates a database and returns name and login credentials.')
.description('Creates a database with potentially randomly generated dbName, username, and password. ');

function randomStringGenerator() {
  // Database name must start with letter.
  return  "ML" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
