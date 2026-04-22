import jwt from "jsonwebtoken";
const token = jwt.sign({ userId: 1 }, "access_token_secret_key");
console.log(token);
