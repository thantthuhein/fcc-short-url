require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('node:dns');
let bodyParser = require('body-parser')

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const Schema = mongoose.Schema

let ShortUrlSchema = new Schema({
  original: {type: String, required: true},
  short: {type: Number, required: true}
})

const ShortUrl = mongoose.model('ShortUrl', ShortUrlSchema)

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/shorturl/:short', async (req, res) => {
  const short = req.params.short;

  try {
    // Find the short URL in the database
    const shortUrl = await ShortUrl.findOne({ short: short });

    if (!shortUrl) {
      // Return error if no matching short URL is found
      return res.status(404).json({ error: 'Short URL not found' });
    }

    // Redirect to the original URL
    res.redirect(302, shortUrl.original);
  } catch (err) {
    // Log the error and return a generic error response
    console.error('Error retrieving short URL:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/shorturl', async (req, res) => {
  const inputUrl = req.body.url;

  if (!inputUrl) {
    return res.json({ error: 'Invalid URL' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(inputUrl);
  } catch (e) {
    return res.json({ error: 'Invalid URL' });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return res.json({ error: 'Invalid URL' });
  }

  try {
    const existingOne = await ShortUrl.findOne({ original: inputUrl });

    console.log(existingOne)
    if (existingOne) {
      return res.json({ original_url: inputUrl, short_url: existingOne.short });
    }


    // return res.json({ hello: 'world', s:inputUrl });

    await new Promise((resolve, reject) => {
      dns.lookup(parsedUrl.host, (err, addresses, family) => {
        if (err) {
          return reject(new Error('Invalid URL'));
        }
        resolve();
      });
    });

    const count = await ShortUrl.countDocuments({});
    const shortUrl = new ShortUrl({ original: inputUrl, short: count + 1 });

    const data = await shortUrl.save();

    res.json({ original_url: inputUrl, short_url: shortUrl.short });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
