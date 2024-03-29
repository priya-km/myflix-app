const express = require("express");
const mongoose = require("mongoose");
const Models = require("./models.js"),
  app = express(),
  morgan = require("morgan"),
  bodyParser = require("body-parser"),
  uuid = require("uuid"),
  fs = require("fs"),
  path = require("path");

// Requiring express validatorfor server side input validation/protection against hacker attacks
const { check, validationResult } = require("express-validator");

// Importing the models
const Movies = Models.Movie;
const Users = Models.User;
const Genres = Models.Genre;
const Directors = Models.Director;

const cors = require("cors");
let allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:1234",
  "http://localhost:4200",
  "https://myflixpkm.netlify.app",
  "https://priya-km.github.io/myFlix-Angular-client",
  "https://priya-km.github.io",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        // If a specific origin isn’t found on the list of allowed origins
        let message =
          "The CORS policy for this application doesn’t allow access from origin " +
          origin;
        return callback(new Error(message), false);
      }
      return callback(null, true);
    },
  })
);
/* const cors = require("cors");
let allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:1234",
  "https://myflixpkm.netlify.app",
];
app.use(cors()); */

const accessLogStream = fs.createWriteStream(path.join(__dirname, "log.txt"), {
  flags: "a",
});

app.use(morgan("common", { stream: accessLogStream }));
app.use(express.static("public"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let auth = require("./auth")(app); // app ensures express is available in auth.js as well
const passport = require("passport");
require("./passport");

// Connecting Mongoose with Rest API and myflixDB - MONGODB ATLAS

const uri = process.env.MONGODB_URI;

mongoose.connect(process.env.MONGODB_URI).catch((error) => handleError(error));
// updated from CONNECTION_URI

// Connecting Mongoose with Rest API and myflixDB - LOCALLY
/* mongoose
  .connect("mongodb://127.0.0.1:27017/myflixDB")
  .catch((error) => handleError(error)); */

// GET

app.get("/", (req, res) => {
  console.log("Welcome to myFlix");
  res.send("Welcome to myFlix!");
});

/**
 * CREATE - Allow new users to register
 * @name register
 * @param {string} Username
 * @param {string} Name
 * @param {string} Password
 * @param {string} Email
 * @param {Date} Birthday
 * @kind function
 */
app.post(
  "/users",
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non alphanumeric characters - not allowed."
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  (req, res) => {
    // check validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({
      Username: req.body.Username,
    }) /* checking to see if the username already exists by querying the Users model */
      .then((user) => {
        if (user) {
          return res.status(400).send(req.body.Username + "already exists");
        } else {
          Users.create({
            /* if user doesn't exist then Users.create mongoose' CREATE command is used to create the new user */
            Username: req.body.Username,
            Name: req.body.Name,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday,
          })
            .then((user) => {
              res.status(201).json(user);
            }) /* call back sending a response back to the client with the status code and the document "user", letting them know the transaction is completed */
            .catch((error) => {
              /* error handling */
              console.error(error);
              res.status(500).send("Error: " + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Error: " + error);
      });
  }
);

/**
 * GET all users
 * @name users
 * @kind function
 * @returns an array of users
 */
app.get(
  "/users",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.find() /* Querying users model and grabbing all data from users collection */
      .then((users) => {
        res.status(201).json(users);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * GET a user by username
 * @name users/Username
 * @kind function
 * @param {Username}
 * @returns a users info by username
 */
app.get(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Users.findOne({ Username: req.params.Username })
      .then((users) => {
        /* sending the response with user data back to the client */
        res.json(users);
      })
      .catch((err) => {
        /* error handling */
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * CREATE/POST - Allow a user to add  movie to their favorites
 * @name users/username/movies/movieID
 * @kind function
 * @param {string} username
 * @param {number} MovieID
 * @returns a movie id added to the users favorites
 */
app.post(
  "/users/:Username/movies/:MovieID",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const promise = Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $push: {
          FavoriteMovies: req.params.MovieID,
        } /* using $push to add a new movieID onto the end of the favorite movies array. */,
      },
      { new: true }
    ) /* makes sure updated data is returned */
      .exec();

    promise.then((updatedUser) => {
      res.json(updatedUser);
    });
  }
);

/**
 * Update user info
 * @name register
 * @param {string} Username
 * @param {string} Name
 * @param {string} Password
 * @param {string} Email
 * @param {Date} Birthday
 * @kind function
 * @returns updated users info
 */
app.put(
  "/users/:Username",
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non alphanumeric characters - not allowed."
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    const promise = Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Name: req.body.Name,
          Password: hashedPassword,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        },
      },
      { new: true }
    ) // This line makes sure that the updated document is returned
      .exec();

    promise.then((updatedUser) => {
      res.json(updatedUser);
    });
  }
);

/**
 * DELETE a movie from users favorites
 * @name users/username/movies/movieID
 * @kind function
 * @param {string} Username
 * @param {number} movieID
 * @returns users updated favorites list
 */
app.delete(
  "/users/:Username/movies/:MovieID",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const promise = Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $pull: {
          FavoriteMovies: req.params.MovieID,
        } /* using $pull to remove movieID from favorite movies array. */,
      },
      { new: true }
    ) /* makes sure updated data is returned */
      .exec();

    promise.then((updatedUser) => {
      res.json(updatedUser);
    });
  }
);

/**
 * DELETE a user by username
 * @name users/Username
 * @kind function
 * @param {string}
 * @returns deletes user from database and logs them out, returns user back to home page to sign up or log in
 */
app.delete(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const promise = Users.findOneAndRemove({
      Username: req.params.Username,
    }).exec();

    promise.then((user) => {
      /* checking if the document exists, if it does it gets deleted, if not it responds with was not found */
      if (!user) {
        res.status(404).send(req.params.Username + " was not found");
      } else {
        res.status(200).send(req.params.Username + " was deleted.");
      }
    });
  }
);

/**
 * READ - get list of all movies from the database
 * @name movies
 * @kind function
 * @returns an array of all movies
 */
app.get(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.find() /* Querying movies model and grabbing all data from movies collection */
      .then((movies) => {
        res.status(200).json(movies);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * GET/READ - Get a movie by title
 * @name movies/Title
 * @kind function
 * @param {string} Title
 * @returns the movie info
 */
app.get(
  "/movies/:Title",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.findOne({ Title: req.params.Title })
      .then((movies) => {
        res.json(movies);
      })
      .catch((err) => {
        /* error handling */
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * GET/READ - Find a genre by name
 * @name movies/Genre/genreName
 * @kind function
 * @async
 * @param {string} genreName
 * @returns genre info
 */
app.get(
  "/movies/Genre/:genreName",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.findOne({ "Genre.Name": req.params.genreName })
      .then((movies) => {
        res.json(movies.Genre);
      })
      .catch((err) => {
        /* error handling */
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * GET/READ - Find a director by name
 * @name movies/Director/directorName
 * @kind function
 * @async
 * @param {string} directorName
 * @returns director info
 */
app.get(
  "/movies/Director/:directorName",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.findOne({ "Director.Name": req.params.directorName })
      .then((movies) => {
        res.json(movies.Director);
      })
      .catch((err) => {
        /* error handling */
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

// Documentation html
app.get("/documentation", (req, res) => {
  res.sendFile("public/documentation.html", { root: __dirname });
});

app.use(express.static("public"));
app.use(morgan("common"));
// ^^ having morgan log to documentation.html

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Error");
});

// Port 8080 listen request
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log("Listening on Port " + port);
});
