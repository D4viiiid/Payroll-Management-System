// src/config/database.conn.ts
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // optional settings (depende sa version ng mongoose)
      autoIndex: true, // helpful sa dev, off mo sa prod for perf
      connectTimeoutMS: 10000, // para mabilis mag-fail kung walang koneksyon
    });

    console.log(
      `✅ MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`
    );
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1); // Exit process if DB fails to connect
  }
};

// Optional: graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🔌 MongoDB connection closed due to app termination");
  process.exit(0);
});

export default connectDB;
