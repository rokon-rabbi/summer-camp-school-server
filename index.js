const express = require("express");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const app = express();
const cors = require("cors");
require("dotenv").config();
// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.sgbuojp.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  const usersClasses = client.db("summerCamp").collection("classes");
  const usersCollection = client.db("summerCamp").collection("users");
  const cartCollection = client.db("summerCamp").collection("carts");

  app.get("/classes", async (req, res) => {
    const result = await usersClasses.find().toArray();
    res.send(result);
  });
  app.post("/classes", async (req, res) => {
    const newItem = req.body;
    const result = await usersClasses.insertOne(newItem);
    res.send(result);
  });
  // get user throught the email
  app.get("/instructorClasses", verifyJWT, async (req, res) => {
    const instructorEmail = req.query.instructorEmail;
    if (req.decoded.email !== instructorEmail) {
      return res.status(403).send({ error: true, message: "forbidden access" });
    }
    let query = {};
    if (req.query?.instructorEmail) {
      query = { instructorEmail: req.query.instructorEmail };
    }

    const user = await usersClasses.find(query).toArray();

    res.send(user);
  });

  app.post("/jwt", (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1h",
    });

    res.send({ token });
  });

  //  store users
  app.post("/users", async (req, res) => {
    const user = req.body;
    const query = { email: user.email };
    const existingUser = await usersCollection.findOne(query);

    if (existingUser) {
      return res.send({ message: "user already exists" });
    }

    const result = await usersCollection.insertOne(user);
    res.send(result);
  });

  // get users
  app.get("/users", async (req, res) => {
    const result = await usersCollection.find().toArray();
    res.send(result);
  });
  // role update
  // update status by admin
  app.patch("/users/:id", verifyJWT, async (req, res) => {
    const id = req.params.id;
    console.log(id);
    const { status } = req.body;
    const filter = { _id: new ObjectId(id) };

    // const query = { email: user.email };
    // const classItem = await usersClasses.findOne(filter);

    let newStatus;
    if (status === "admin") {
      newStatus = "admin";
    } else if (status === "instructor") {
      newStatus = "instructor";
    } else {
      // Handle other status values if needed
    }
    const updateDoc = {
      $set: {
        role: newStatus,
      },
    };

    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
  });
  // post card data
  app.post("/carts", async (req, res) => {
    const item = req.body;
    const result = await cartCollection.insertOne(item);
    res.send(result);
  });
  // cart collection apis
  app.get("/carts", verifyJWT, async (req, res) => {
    const email = req.query.email;

    if (!email) {
      res.send([]);
    }

    const decodedEmail = req.decoded.email;
    if (email !== decodedEmail) {
      return res.status(403).send({ error: true, message: "forbidden access" });
    }

    const query = { email: email };
    const result = await cartCollection.find(query).toArray();
    res.send(result);
  });
  // role check

  app.get("/users/role/:email", verifyJWT, async (req, res) => {
    const email = req.params.email;

    if (req.decoded.email !== email) {
      return res.status(403).send({ error: true, message: "forbidden access" });
    }

    const query = { email: email };
    const user = await usersCollection.findOne(query);
    // let result;
    // if( user?.role === 'admin'){

    //   result = { admin: user?.role === 'admin' }
    // }
    // else if( user?.role === 'user'){
    //    console.log(user);
    //   result = { user: user?.role === 'user' }
    // }
    // else  if( user?.role === 'instructor'){
    //   result = { instructor: user?.role === 'instructor' }
    // }
    // else{
    // result= "unknown";
    // }

    res.send(user);
  });
  // delete cart items
  app.delete("/carts/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await cartCollection.deleteOne(query);
    res.send(result);
  });
  // update status by admin
  app.patch("/classes/:id", async (req, res) => {
    const id = req.params.id;
    console.log(id);
    const { status } = req.body;
    const filter = { _id: new ObjectId(id) };

    // const query = { email: user.email };
    // const classItem = await usersClasses.findOne(filter);

    let newStatus;
    if (status === "approved") {
      newStatus = "approved";
    } else if (status === "denied") {
      newStatus = "denied";
    } else {
      // Handle other status values if needed
    }
    const updateDoc = {
      $set: {
        status: newStatus,
      },
    };

    const result = await usersClasses.updateOne(filter, updateDoc);
    res.send(result);
  });

  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
