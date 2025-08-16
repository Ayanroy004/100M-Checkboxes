import express, { Request, Response } from "express";
import { Server, Socket } from "socket.io";
import { createServer } from "http";
import path from "path";
import jwt from "jsonwebtoken";
import Redis from "ioredis";
import dotenv from "dotenv";
import connectDB from "./db";
import { User } from "./model/user.model";
import { jwtPayload, UserData } from "./types/alltypes";
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const PORT = process.env.PORT || 8000;

dotenv.config();
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
});
const publisher = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
});
const subscriber = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
});

let checkbox = new Array(10).fill(false);

subscriber.subscribe("server:broker");
subscriber.on("message", async (channel, message) => {
  // if (message !== "") {
  //   const { checked, index } = JSON.parse(message);
  //   const updatedCheckbox = await redis.get("checkbox");
  //   const TotalTic = await redis.get("totalCheckboxTic");
  //   console.log("Count : ", TotalTic);

  //   if (updatedCheckbox) {
  //     const final = await JSON.parse(updatedCheckbox);
  //     console.log("updated checkbox : ", final);
  //   }
  //   const count = Number(TotalTic);
  //   io.emit("checkboxUpdate", { index, checked, count });
  // } else {
  //   const flag = 1;
  //   io.emit("checkboxUpdate", { checkbox, flag });
  // }

  // const checkboxes = await redis.get("checkbox");
  if (message !== "") {
    const TotalTic = await redis.get("totalCheckboxTic");
    const count = Number(TotalTic);
    const index = JSON.parse(message);
    io.emit("userConnectedDone", { index, count });
  } else {
    const flag = 1;
    io.emit("userConnectedDone", { checkbox, flag });
  }
});

io.on("connection", async (socket: Socket) => {
  console.log("User Connected:", socket.id);

  socket.on(
    "checkboxChange",
    async (data: { index: number; checked: boolean }) => {
      const { index, checked } = data;
      const cachedCheckbox = await redis.get("checkbox");
      if (cachedCheckbox) {
        try {
          const jsonCached = JSON.parse(cachedCheckbox);
          jsonCached[index] = checked;

          const totalTic = await redis.get("totalCheckboxTic");
          // console.log("update tic", totalTic);

          await redis.incr("totalCheckboxTic");

          await redis.set("checkbox", JSON.stringify(jsonCached));
        } catch (e) {
          console.log("Err : ", e);
        }
      }
      await publisher.publish(
        "server:broker",
        JSON.stringify({ checked, index })
      );
    }
  );

  socket.on("clear", async () => {
    await redis.del("checkbox");
    await redis.del("totalCheckboxTic");

    publisher.publish("server:broker", "");
  });

  socket.on("userConnected", async (data: UserData) => {
    console.log("user data : ", data);

    if (data) {
      const holdRes = await addUserData(data); // check jwt and store user data
      console.log("holdRes : ", holdRes);
      let createdJwt = "";
      if (holdRes) {
        const userId = holdRes._id.toString();
        createdJwt = await jwt.sign(
          { name: data, role: "user", userId },
          process.env.JWT_SECRET as string,
          { expiresIn: "1h" }
        );
      }

      const checkboxes = await redis.get("checkbox");
      console.log(checkboxes);
      if (checkboxes) {
        const parseData = JSON.parse(checkboxes);

        let index = null;
        while (true) {
          index = randomNumber(10);
          if (parseData[index] !== true) {
            parseData[index] = true;
            break;
          }
        }
        console.log(index);
        await redis.set("checkbox", JSON.stringify(parseData));
        await redis.incr("totalCheckboxTic");
        publisher.publish("server:broker", JSON.stringify(index));

        socket.emit("saveUser", { name: data, jwt: createdJwt });
      }
    }
  });
});

const verifyJwt = (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    return decoded as jwtPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
};

const addUserData = async (data: UserData) => {
  try {
    if (data) {
      const user = {
        name: data,
        role: "user",
      };
      // Here you can save the user to the database if needed
      console.log("User data added:", user);
      // For example, you can use the User model to save the user
      const res = await User.create(user);
      return res;
    }
  } catch (error) {
    console.error("Error verifying user data:", error);
  }
};

function randomNumber(max: number) {
  const random = Math.floor(Math.random() * max);
  return random;
}

const findDb = async (token: string) => {
  const decoded = verifyJwt(token);
  if (decoded) {
    const user = await User.findById(decoded.userId);
    if (user) {
      return user.name;
    }
  }
};

app.get("/state", async (req: Request, res: Response) => {
  const token = req.headers.authorization || "";
  const user = findDb(token);


  const cachedCheckbox = await redis.get("checkbox");
  const totalTic = await redis.get("totalCheckboxTic");
  if (cachedCheckbox) {
    try {
      const cachedParseData = await JSON.parse(cachedCheckbox);

      console.log("Mil gaya", totalTic);
      return res.json({ cachedParseData, totalTic });
    } catch (error) {
      console.error("Error parsing checkbox state from Redis:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
  await redis.set("checkbox", JSON.stringify(checkbox));
  await redis.set("totalCheckboxTic", "0");

  return res.json(checkbox);
});

app.use(express.static(path.join(__dirname, "../public")));

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
    });
  })
  .catch((e) => {
    console.log("Connection Failed db not connected");
    process.exit(1);
  });
