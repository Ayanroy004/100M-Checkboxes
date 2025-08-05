import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const PORT = process.env.PORT || 8000;

let checkbox = new Array(10).fill(false); // Initialize an array of 100 checkboxes, all set to false

io.on("connection", (socket) => {
  console.log("User Connected", socket.id);
  // console.log("Current checkbox state:", checkbox);

  socket.on("checkboxChange", (data)=>{
    const { index, checked } = data;
    console.log(`Checkbox at index ${index} changed to ${checked}`);
    checkbox[index] = checked; // Update the checkbox state
    io.emit("checkboxUpdate",{index, checked}); // Broadcast the change to all connected
  })

});

app.get("/state", (req, res) => {
  console.log("Sending current checkbox state:", checkbox);
  return res.json(checkbox); // Send the current state of the checkboxes
});

app.use(express.static("./public"));

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
