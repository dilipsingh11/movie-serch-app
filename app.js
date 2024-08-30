// app.js

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

// Middleware to parse JSON
app.use(express.json());  // This parses JSON request bodies

// If you're sending URL-encoded data as well, include this
app.use(express.urlencoded({ extended: true }));
const PORT = 3000;

// app.js

const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'movie-db'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database.');
});


// Replace with your actual OMDb API key
const OMDB_API_KEY = '7075e36f';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Home Route
app.get('/', async (req, res) => {
    const query = req.query.s || 'hum';
    const page = req.query.page || 1;
    const favoritesQuery = 'SELECT movie_id FROM favorites';

   
    try {
        const [favoriteResults] = await db.promise().query('SELECT movie_id FROM favorites');
        const favoriteIds = new Set(favoriteResults.map(fav => fav.movie_id));
        const response = await axios.get('https://www.omdbapi.com/', {
            params: {
                apikey: OMDB_API_KEY,
                s: query,
                page: page
            }
        });

        const data = response.data;

        if (data.Response === 'True') {
            const totalResults = parseInt(data.totalResults);
            const totalPages = Math.ceil(totalResults / 10);

            const movies = data.Search.map(movie => ({
                ...movie,
                isFavorite: favoriteIds.has(movie.imdbID)
            }));
            res.render('index', {
                movies,
                query,
                currentPage: parseInt(page),
                totalPages,
                error: null  // No error to display
            });
        } else {
            res.render('index', {
                movies: [],
                query,
                currentPage: 1,
                totalPages: 1,
                error: data.Error  // Pass the error message from the API
            });
        }
    } catch (error) {
        console.error('Error fetching data from OMDb API:', error);
        res.render('index', {
            movies: [],
            query,
            currentPage: 1,
            totalPages: 1,
            error: 'An error occurred while fetching data.'  // General error message
        });
    }

});
// Add to Favorites
app.post('/favorite', (req, res) => {
    const { movie_id, title, year, poster } = req.body;

    const query = 'INSERT INTO favorites (movie_id, title, year, poster) VALUES (?, ?, ?, ?)';
    console.log("query",  req.body)
    db.query('INSERT INTO favorites (movie_id, title, year, poster) VALUES (?, ?, ?, ?)', [movie_id, title, year, poster], (err, results) => {
        if (err) {
            console.error('Error adding to favorites:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, message: 'Added to favorites' });
    });
});

// Remove from Favorites
app.post('/unfavorite', (req, res) => {
    const { movie_id } = req.body;

    const query = 'DELETE FROM favorites WHERE movie_id = ?';

    db.query(query, [movie_id], (err, results) => {
        if (err) {
            console.error('Error removing from favorites:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, message: 'Removed from favorites' });
    });
});

// Route to display all favorite movies
app.get('/favorites', (req, res) => {
    const query = 'SELECT * FROM favorites ORDER BY added_at DESC';

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching favorites:', err);
            return res.status(500).send('Database error');
        }

        res.render('favorites', { favorites: results });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
