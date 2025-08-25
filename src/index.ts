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

const createRedisClient = () => {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, {
      tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
    });
  }
  // Local Docker Redis
  return new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
  });
};

export const redis = createRedisClient();
export const publisher = createRedisClient();
export const subscriber = createRedisClient();

let checkbox = new Array(1000).fill(false);

subscriber.subscribe("server:broker");
subscriber.on("message", async (channel, message) => {
  const messageObject = JSON.parse(message);
  if (messageObject.message === "disconnect") {
    const index = messageObject.randomIndex;
    const totalTic = await redis.get("totalCheckboxTic");
    const count = Number(totalTic || 0);
    io.emit("userDisconnectedDone", { index, count });
  } else if (messageObject.message === "connected") {
    const index = messageObject.index;
    const totalTic = await redis.get("totalCheckboxTic");
    const count = Number(totalTic || 0);

    io.emit("userConnectedDone", { index, count });
  } else if (messageObject.message === "clear") {
    io.emit("userConnectedDone", { checkbox, flag: 1 });
  }
});

io.on("connection", async (socket: Socket) => {
  console.log("User Connected:", socket.id);

  socket.on("clear", async () => {
    await redis.del("checkbox");
    await redis.del("totalCheckboxTic");

    publisher.publish("server:broker", JSON.stringify({ message: "clear" }));
  });

  socket.on("userConnected", async (data: UserData) => {

    const checkboxes = await redis.get("checkbox");
    let trulyData = [];
    if (checkboxes) {
      const parseData = JSON.parse(checkboxes);
      trulyData = parseData.filter((e: boolean) => e === false);
    }
    if (!trulyData) {
      socket.emit("noCheckbox", { message: "No free checkbox left!" });
      return;
    }
    if (data) {
      const holdRes = await addUserData(data); // check jwt and store user data
      let createdJwt = "";
      if (holdRes) {
        const userId = holdRes._id;
        createdJwt = jwt.sign(
          { data, role: "user", userId },
          process.env.JWT_SECRET as string
        );
      }

      const checkboxes = await redis.get("checkbox");
      if (checkboxes) {
        const parseData = JSON.parse(checkboxes);

        // Find all available (false) indexes
        const availableIndexes: number[] = [];
        for (let i = 0; i < parseData.length; i++) {
          if (!parseData[i]) {
            availableIndexes.push(i);
          }
        }

        if (availableIndexes.length === 0) {
          socket.emit("noCheckbox", { message: "No free checkbox left!" });
          return;
        }

        // Pick one randomly
        const randomIndex =
          availableIndexes[randomNumber(availableIndexes.length)];

        // Mark it as true
        parseData[randomIndex] = true;

        // Update Redis
        await redis.set("checkbox", JSON.stringify(parseData));
        await redis.incr("totalCheckboxTic");

        // Notify other users
        publisher.publish(
          "server:broker",
          JSON.stringify({ index: randomIndex, message: "connected" })
        );

        // Send to this client
        socket.emit("saveUser", { name: data, jwt: createdJwt });
      }
    }
  });

  socket.on("userDisconnect", async () => {
    let randomIndex: number | null = null;

    const checkboxes = await redis.get("checkbox");
    if (checkboxes) {
      const parseData = JSON.parse(checkboxes);
      const trueIndexes: number[] = [];

      // Find all indexes currently set to true
      for (let i = 0; i < parseData.length; i++) {
        if (parseData[i] === true) {
          trueIndexes.push(i);
        }
      }

      if (trueIndexes.length > 0) {
        // Select a random index from active ones
        const selected = randomNumber(trueIndexes.length);
        randomIndex = trueIndexes[selected];

        // Set it to false (uncheck)
        parseData[randomIndex] = false;

        // Save updated checkbox state
        await redis.set("checkbox", JSON.stringify(parseData));

        // Decrease active count
        await redis.decr("totalCheckboxTic");
      }
    }

    // Notify client & others
    socket.emit("userDisconnected", { randomIndex });
    publisher.publish(
      "server:broker",
      JSON.stringify({ randomIndex, message: "disconnect" })
    );
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
  const cachedCheckbox = await redis.get("checkbox");
  const totalTic = await redis.get("totalCheckboxTic");
  if (cachedCheckbox) {
    try {
      const cachedParseData = await JSON.parse(cachedCheckbox);
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

app.get("/check-user", async (req: Request, res: Response) => {
  const token = req.headers.authorization || "";
  const user = await findDb(token);
  if (user) {
    return res.json({ user });
  }
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
