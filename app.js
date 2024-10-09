const bodyParser = require("body-parser");
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const flash = require("connect-flash");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const fs = require("fs");
const cors = require("cors");
const { config } = require("dotenv");
const port = process.env.PORT || 4000;
const errorController = require("./controllers/error");
const User = require("./models/user");
const { MongoClient, ServerApiVersion } = require('mongodb');
config();

const app = express();

const MONGODB_URI = process.env.MONGO_URL;

const client = new MongoClient(MONGODB_URI, {
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
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

const allowedOrigins = [
  'http://localhost:5173', 'http://localhost:5174','http://localhost:3000','https://nextjs-firefly.vercel.app'];
 
 // CORS Configuration
 app.use(cors({
   origin: function (origin, callback) {
     // Allow requests with no origin (e.g., mobile apps or curl requests)
     if (!origin) return callback(null, true);
     if (allowedOrigins.indexOf(origin) === -1) {
       const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
       return callback(new Error(msg), false);
     }
     return callback(null, true);
   },
   credentials: true, // If your frontend needs to include cookies or authorization headers
 }));

// Body Parser Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session Store Configuration
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});

// Session Middleware
app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// Logging Middleware
const logStream = fs.createWriteStream(path.join(__dirname, "access.log"), {
  flags: "a",
});
app.use(morgan("combined", { stream: logStream }));

// Security & Performance Middleware
app.use(helmet());
app.use(compression());

// Static Files Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

// User Retrieval Middleware
app.use((req, res, next) => {
  if (!req.session.userId) {
    return next();
  }
  User.findById(req.session.userId)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      console.log(err);
      next(err);
    });
});

// Flash Messages Middleware
app.use(flash());

// Global Variables Middleware
app.use((req, res, next) => {
  res.locals.isLoggedIn = req.session.isLoggedIn;
  next();
});

// Routes
const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

// Error Handling Middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({ message: error.message });
});

// Fallback Routes for 404 and 500 Errors
app.get("/500", errorController.get500);
//app.use(errorController.get404);
//Server startup
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
// MongoDB Connection 

// mongoose
//   .connect(process.env.MONGO_URL)
//   .then(() => {
//     console.log("Connected to MongoDB");
//   })
//   .catch((err) => {
//     console.log("Failed to connect to MongoDB", err);
//   });

//   app.get("/", (req, res) => {
//     res.send({
//         message: "Project Firefly Server",
//         health: "ok",
//     });
// });
