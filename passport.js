const passport = require("passport"),
  LocalStrategy =
    require("passport-local").Strategy /* http authentication for login requests */,
  Models = require("./models.js"),
  passportJWT = require("passport-jwt");

let Users = Models.User,
  JWTStrategy = passportJWT.Strategy,
  ExtractJWT = passportJWT.ExtractJwt;

passport.use(
  new LocalStrategy(
    {
      usernameField: "Username",
      passwordField: "Password",
    },
    (username, password, callback) => {
      console.log(username + " " + password);
      /**
       * Fetching username and password from the database to see if it matches upon logging in
       */
      Users.findOne({ Username: username })
        .then((user) => {
          if (!user) {
            console.log("incorrect username");
            return callback(null, false, {
              message: "Incorrect username.",
            });
          }
          if (!user.validatePassword(password)) {
            console.log("incorrect password");
            return callback(null, false, { message: "Incorrect password." });
          }

          console.log("finished");
          return callback(null, user);
        })
        .catch((error) => {
          console.log(error);
          return callback(error, false);
        });
    }
  )
);

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: "your_jwt_secret",
    },
    (jwtPayload, callback) => {
      console.log({ jwtPayload });
      return Users.findById(jwtPayload._id)
        .then((user) => {
          return callback(null, user);
        })
        .catch((error) => {
          return callback(error);
        });
    }
  )
);
