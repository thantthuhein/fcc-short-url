require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Set up mongoose
const mongoose = require('mongoose');

// Basic Configuration
const port = process.env.PORT || 3000;
app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// To handle POST
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const bodyParser = require('body-parser');

// database
mongoose.connect('mongodb+srv://sudoer:atlas9719@my-mongo.fx67h.mongodb.net/mongoose?retryWrites=true&w=majority&appName=my-mongo');

// Create a Model
const shortenerSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true
  },
  short_url: {
    type: Number,
    required: true
  }
});

const Url_data = mongoose.model('Url_data', shortenerSchema);

const createAndSaveDocument = async (urlString) => {
  try {
    const count = await Url_data.find().count();
    const url = await new Url_data({
      original_url: urlString,
      short_url: count
    });
    url.save();
    return url;
  } catch (error) {
    console.log(error.message);
  }
}

// if NOT an URL then catch error: 'invalid url' in JSON response
// save URL if not exist in DB and show JSON in response
// else just show JSON in response
app.post("/api/shorturl", async (req, res) => {
  try {
    const url = new URL(req.body.url);
    if (!['http:', 'https:'].includes(url.protocol)) throw Error;
    const url_data = await Url_data.findOne({ original_url: url });
    if (url_data != null) {
      req.link = url_data;
    } else {
      req.link = await createAndSaveDocument(url);
    }
    const { original_url, short_url } = req.link;
    res.json({ original_url, short_url });
  }
  catch (error) {
    res.json({ error: 'invalid url' })
  }
})

// redirect to original URL by calling endpoin with number
// that assigned to URL previously on ssave
app.get("/api/shorturl/:short_url", async (req, res) => {
  try {
    const findUrl = await Url_data.findOne({ "short_url": req.params.short_url });
    if (findUrl === null) {
      throw Error;
    } else {
      res.redirect(findUrl.original_url);
    }
  }
  catch (error) {
    res.json({ error: 'invalid short url, POST URL first' })
  }
})

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
})