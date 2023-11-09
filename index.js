const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5008

//parser
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://e-readers.web.app',
    'https://e-readers.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json())
app.use(cookieParser())


// user: e-readers
// pass: nkRmhXRaHg75haRr

app.get('/', (req, res) => {
  res.send('Hello Tania!')
})



// const uri = "mongodb+srv://e-readers:nkRmhXRaHg75haRr@cluster0.jwathvu.mongodb.net/?retryWrites=true&w=majority";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jwathvu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const booksCollection = client.db('e-readers').collection('all-books');
    const bookCategoryCollection = client.db('e-readers').collection('book-category');
    const borrowCollection = client.db('e-readers').collection('borrow');

    // verify token using middleware
    const bookHandeler = (req, res, next) => {
      const token = req.cookies.token
      // console.log(token);

      if (!token) {
        return res.status(401).send('1 unauthorized')
      }

      jwt.verify(token, process.env.USER_SECRET_TOKEN, function (err, decoded) {
        if (err) {
          return res.status(401).send('2 unauthorized')
        }
        const { email } = decoded;
        req.user = decoded
        // console.log(req.user);
        next()
      })

    }


    // get all books data
    app.get('/api/v1/all-books', async (req, res) => {
      const cursor = booksCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })


    // get all books category data
    app.get('/api/v1/category-books/category_name', async (req, res) => {
      const cursor = bookCategoryCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })


    // get single book for update by quantity
    app.get('/api/v1/category-books/category_name/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookCategoryCollection.findOne(query);
      res.send(result);
    })


    // update single book info using put method
    app.put('/api/v1/category-books/category_name/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updateBook = req.body;
      const bookInfo = {
        $set: {
          id: updateBook.id,
          author_name: updateBook.author_name,
          category_name: updateBook.category_name,
          image: updateBook.image,
          long_description: updateBook.long_description,
          name: updateBook.name,
          rating: updateBook.rating,
          short_description: updateBook.short_description,
          quantity: updateBook.decreaseBook,
          borrowed_date: updateBook.recentArrDate,
          return_data: updateBook.returnDate,
          user_name: updateBook.userName,
          user_email: updateBook.userEmail
        }
      }

      const result = await bookCategoryCollection.updateOne(filter, bookInfo, options)

      res.send(result)

    })

    // get single book for update by quantity
    app.get('/api/v1/borrow-books', async (req, res) => {
      const result = await borrowCollection.find().toArray();
      res.send(result);
    })


    // get single book for update by quantity
    app.get('/api/v1/borrow-books/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) }
      const result = await borrowCollection.findOne(query);
      res.send(result);
    })


    app.post('/api/v1/borrow-books', async (req, res) => {
      const query = req.body;
      const result = await borrowCollection.insertOne(query)
      res.send(result)
    })




    // get borrow books for display on borrowed book page

    app.get('/api/v1/borrow-books', bookHandeler, async (req, res) => {
      const userEmail = req.query.email;
      const tokenEmail = req.user.email;

      if (userEmail !== tokenEmail) {

        return res.status(403).send('forbidden access')

      }

      let query = {}

      if (userEmail) {
        query.email = userEmail
      }
      const cursor = borrowCollection.find(query);
      const result = await cursor.toArray()
      res.send(result);
    })


    // delete return book
    app.delete('/api/v1/borrow-books/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) }
      const result = await borrowCollection.deleteOne(query);
      res.send(result)
    })


    // user auth
    app.post('/api/v1/auth/token-access', async (req, res) => {

      const currentUser = req.body;
      console.log(currentUser);
      const token = jwt.sign(currentUser, process.env.USER_SECRET_TOKEN, { expiresIn: '1hr' })

      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })


    // clear cookie
    app.post('/api/v1/logout', async (req, res) => {
      const user = req.body;
      res
        .clearCookie('token', { maxAge: 0 })
        .send({ success: true })
    })

   



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})