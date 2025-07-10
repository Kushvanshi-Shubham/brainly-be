import dotenv from 'dotenv';


dotenv.config();


const MONGO_db_URL = process.env.MONGO_URL;


if (!MONGO_db_URL) {
  console.error("Fatal Error: MONGO_URL is not defined in the .env file.");
  process.exit(1); 
}


const JWT_PASS = process.env.JWT_SECRET;

if (!JWT_PASS) {
  console.error("Fatal Error: JWT_SECRET is not defined in the .env file.");
  process.exit(1);
}


export { MONGO_db_URL, JWT_PASS };
