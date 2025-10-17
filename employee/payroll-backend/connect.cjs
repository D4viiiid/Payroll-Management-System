const { MongoClient } = require("mongodb");
require("dotenv").config({ path: "./config.env" });
const UserModel = require("./models/UserModel.js"); // Adjust the path as necessary


async function connectDB() {
    const Db = process.env.ATLAS_URI;
    console.log("DB URI:", Db); // optional, for debug
    const client = new MongoClient(Db);

    try {
        await client.connect();
        const db = client.db("Emp_Name");

        const collections = await db.listCollections().toArray();
        console.log(" Collections in 'Emp_Name':");
        collections.forEach(c => console.log(" -", c.name));

        // Fetch and print all documents from the 'Dashboard' collection
        const dashboardData = await db.collection("Dashboard").find().toArray();

        console.log("\n Documents in 'Dashboard':");
        console.log(dashboardData.length > 0 ? dashboardData : "No documents found.");
        
    } catch (e) {
        console.error(" Error:", e);
    } finally {
        await client.close();
    }
}
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(' MongoDB connection failed', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;

connectDB();
