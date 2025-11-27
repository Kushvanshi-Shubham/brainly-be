import dotenv from 'dotenv';


dotenv.config();

const MONGO_db_URL = process.env.MONGO_URL;
const JWT_PASS = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

if (!MONGO_db_URL) {
  console.error("Fatal Error: MONGO_URL is not defined in the .env file.");
  process.exit(1); 
}

if (!JWT_PASS) {
  console.error("Fatal Error: JWT_SECRET is not defined in the .env file.");
  process.exit(1);
}

export { MONGO_db_URL, JWT_PASS, PORT, NODE_ENV, FRONTEND_URL };
