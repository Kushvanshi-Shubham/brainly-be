import mongoose, {model , Schema } from "mongoose";

import { MONGO_db_URL } from "./config";

mongoose.connect(MONGO_db_URL)
console.log(MONGO_db_URL)

const UserSchema = new Schema (
    {
        username : {type: String , unique: true},
        password : String
    }
)
export const UserModel = model( "User" , UserSchema);

const ContentSchema = new Schema({
  title: String,
  link: String,
  type: String,
  tags: [{ type: mongoose.Types.ObjectId, ref: 'Tag' }],
  userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true }
});


export const ContentModel = model("Content" , ContentSchema);

const LinkSchema = new Schema({
    hash: String,
    userId: {type: mongoose.Types.ObjectId, ref: 'User', required: true, unique: true },
})

export const LinkModel = model("Links", LinkSchema);