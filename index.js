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
    const shortUrl = await ShortUrl.findOne({ short: short });

    if (!shortUrl) {
      return res.json({ error: 'Invalid URL' });
    }

    res.redirect(shortUrl.original);
  } catch (err) {
    console.error('Error retrieving short URL:', err);
    res.json({ error: 'Invalid URL' });
  }
});

app.post('/api/shorturl', function(req, res) {
  let inputUrl = req.body.url

  if (! inputUrl) {
    res.json({error: 'Invalid URL'})
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(inputUrl);
  } catch (e) {
    return res.json({ error: 'Invalid URL' });
  }

  dns.lookup(parsedUrl.host, (err, addresses, family) => {
    if (err) {
      res.json({error: 'Invalid URL'})
    }

    ShortUrl.countDocuments({}, (err, count) => {
    if (err) {
      res.json({error: 'Invalid URL'})
    }

    let shortUrl = new ShortUrl({original: parsedUrl.origin, short: count + 1})

      shortUrl.save((err, data) => {
        if (err) {
          res.json({error: 'Invalid URL'})
        }

        res.json({original_url: inputUrl, short_url: shortUrl.short})
      })
    });
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
