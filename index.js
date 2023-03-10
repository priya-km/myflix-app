const express = require('express');
const mongoose = require('mongoose');
const Models = require('./models.js'),
  app = express(),
  morgan = require('morgan'),
  bodyParser = require('body-parser'),
  uuid = require('uuid'),
  fs = require('fs'),
  path = require('path');

// Importing the models
const Movies = Models.Movie;
const Users = Models.User;
const Genres = Models.Genre;
const Directors = Models.Director;
// Connecting Mongoose with Rest API ad myflixDB
mongoose.connect('mongodb://127.0.0.1:27017/myflixDB').
  catch(error => handleError(error));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let auth = require('./auth')(app); // app ensures express is available in auth,js as well
const passport = require('passport');
require('./passport');

// GET

app.get('/', (req, res) => {
  console.log('Welcome to myFlix');
  res.send('Welcome to myFlix!');
});

// Create - ADD A USER 
app.post('/users', (req, res) => {
  Users.findOne({ Username: req.body.Username }) /* checking to see if the username already exists by querying the Users model */
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.Username + 'already exists');
      } else {
        Users.create({ /* if user doesn't exist then Users.create mongoose' CREATE command is used to create the new user */
          Username: req.body.Username,
          Name: req.body.Name,
          Password: req.body.Password,
          Email: req.body.Email,
          Birthday: req.body.Birthday
        })
          .then((user) => { res.status(201).json(user) }) /* call back sending a response back to the client with the status code and the document "user", letting them know the transaction is completed */
          .catch((error) => { /* error handling */
            console.error(error);
            res.status(500).send('Error: ' + error);
          })
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send('Error: ' + error);
    });
});

// Get all users
app.get('/users', passport.authenticate('jwt', { session: false}), (req, res) => {
  Users.find() /* Querying users model and grabbing all data from users collection */
    .then((users) => {
      res.status(201).json(users);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// Get information about a specific user by username
app.get('/users/:Username', passport.authenticate('jwt', { session: false}), (req, res) => {
  Users.findOne({ Username: req.params.Username })
    .then((users) => { /* sending the response with user data back to the client */
      res.json(users);
    })
    .catch((err) => { /* error handling */
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// CREATE - Allow users to add a movie to their list of favorites
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false}), (req, res) => {
  const promise = Users.findOneAndUpdate({ Username: req.params.Username }, {
    $push: { FavoriteMovies: req.params.MovieID } /* using $push to add a new movieID onto the end of the favorite movies array. */
  },
    { new: true }) /* makes sure updated data is returned */
    .exec();

  promise.then((updatedUser) => {
      res.json(updatedUser);
    });
});



// UPDATE User info
app.put('/users/:Username', passport.authenticate('jwt', { session: false}), (req, res) => {
  const promise = Users.findOneAndUpdate({ Username: req.params.Username }, { $set: {
      Username: req.body.Username,
      Name: req.body.Name,
      Password: req.body.Password,
      Email: req.body.Email,
      Birthday: req.body.Birthday
    }
  },
  { new: true }) // This line makes sure that the updated document is returned
  .exec();

  promise.then((updatedUser) => {
    res.json(updatedUser);
  });
});

// DELETE - Allow users to remove a movie from their list of favorites
app.delete('/users/:Username/movies/:MovieID', passport.authenticate('jwt', { session: false}), (req, res) => {
  const promise = Users.findOneAndUpdate({ Username: req.params.Username }, {
    $pull: { FavoriteMovies: req.params.MovieID } /* using $pull to remove movieID from favorite movies array. */
  },
    { new: true }) /* makes sure updated data is returned */
    .exec();

  promise.then((updatedUser) => {
      res.json(updatedUser);
    });
});


// Delete a user by username
app.delete('/users/:Username', passport.authenticate('jwt', { session: false}), (req, res) => {
  const promise = Users.findOneAndRemove({ Username: req.params.Username }).exec();

  promise.then((user) => { /* checking if the document exists, if it does it gets deleted, if not it responds with was not found */
      if (!user) {
        res.status(400).send(req.params.Username + ' was not found');
      } else {
        res.status(200).send(req.params.Username + ' was deleted.');
      }
    });
});


// READ - Get list of all movies
app.get('/movies', passport.authenticate('jwt', { session: false}), (req, res) => {
  Movies.find() /* Querying movies model and grabbing all data from movies collection */
    .then((movies) => {
      res.status(200).json(movies);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});
// Find movie by title
app.get('/movies/:Title', passport.authenticate('jwt', { session: false}), (req, res) => {
  Movies.findOne({ Title: req.params.Title })
    .then((movies) => { 
      res.json(movies);
    })
    .catch((err) => { /* error handling */
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});


// Find movie by genre
app.get('/movies/Genre/:genreName', passport.authenticate('jwt', { session: false}), (req, res) => {
  Movies.findOne({ 'Genre.Name': req.params.genreName })
    .then((movies) => { 
      res.json(movies.Genre);
    })
    .catch((err) => { /* error handling */
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// Find data about director by name
app.get('/movies/Director/:directorName', passport.authenticate('jwt', { session: false}), (req, res) => {
  Movies.findOne({ 'Director.Name': req.params.directorName })
    .then((movies) => {
      res.json(movies.Director);
    })
    .catch((err) => { /* error handling */
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

// Documentation html
app.get('/documentation', (req, res) => {
  res.sendFile('public/documentation.html', { root: __dirname });
});

app.use(express.static('public'));
app.use(morgan('common'));
// ^^ having morgan log to documentation.html

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Error');
});

// Port 8080 listen request
app.listen(8080, () => {
  console.log('Your app is listening to port 8080.');
});