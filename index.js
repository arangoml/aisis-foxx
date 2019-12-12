'use strict';
const { aql, query, db } = require("@arangodb");
const createRouter = require('@arangodb/foxx/router');
const users = require("@arangodb/users");
const auth = require("./util/authenticator");

const router = createRouter();
const joi = require('joi');

const aisisInstances = "aisisInstances"

const sessions = require("./util/sessions");
module.context.use(sessions);

module.context.use(router);

router
  .post("/login", function(req, res) {
    const user = users.firstExample({
      username: req.body.username
    });
    const valid = auth.verify(
      // Pretend to validate even if no user was found
      user ? user.authData : {},
      req.body.password
    );
    if (!valid) res.throw("unauthorized");
    // Log the user in using the key
    // because usernames might change
    req.session.uid = user._key;
    req.sessionStorage.save(req.session);
    res.send({ username: user.username });
  })
  .body(
    joi
      .object({
        username: joi.string().required(),
        password: joi.string().required()
      })
      .required()
  );
router.post('/createDB', function (req,res) {
  const data = req.body;
  const dbName = data.dbName ? data.dbName : randomStringGenerator();
  const username = data.username ? data.username : randomStringGenerator();
  const password = data.password ? data.password : randomStringGenerator();
  const email = data.email ? data.email : 'noreply@arangodb.com'


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
