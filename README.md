# Project Title

# Express + TypeScript + MongoDB + Redis + Docker + Socket.IO Boilerplate

# Test URL
https://real-time-con.onrender.com

# 📌 Description :

This project is a real-time web application built with **Express**, **TypeScript**, **MongoDB**, **Redis**, and **Socket.IO**.

Users can connect using their name and claim a checkbox from a pool of 1,000. The app features real-time updates across clients, making it ideal for visualizing user participation, load simulation, or just an interactive demo.

# 📷 Screenshot 👇
![Screenshot](./public/Screenshot.png)

Features:

- 🔌 Real-time Communication via Socket.IO

- 📦 RESTful APIs with Express

- 🧠 MongoDB (Mongoose) for user storage

- ⚡ Redis for shared state and pub/sub communication

- 🛡️ JWT Authentication

- 🐳 Docker support for Redis setup

- 🧾 TypeScript for type safety

- 🌍 Ready for deployment on Render

## 🛠️ Prerequisites

- Node.js (v18+)

- npm or yarn

- Docker (for Redis/Mongo if needed)

- MongoDB instance (local or cloud)

- Redis (local or cloud)

## ⚙️ Installation

Clone the repository and install dependencies:

````bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

# Server
PORT=8000

# MongoDB
MONGO_URL="your-mongodb-url"
MONGO_PASSWORD="your-mongodb-password"

# JWT
JWT_SECRET="your-secret-key"

# Redis (for local/Docker)
REDIS_HOST=localhost
REDIS_PORT=6379

# Redis (for Render or other cloud provider)
REDIS_URL=redis://username:password@host:6379



## ▶️ Run Locally

Clone the project

```bash
  git clone https://github.com/Ayanroy004/100M-Checkboxes.git
````

Go to the project directory

```bash
  cd my-project
```

Install dependencies

```bash
  npm install
```

Run Docker Container create docker-compose.yml

```bash
services:
  redis:
    image: redis:latest
    container_name: redis_container
    ports:
      - "6379:6379"

```

Start Redis container:

```bash
docker-compose up -d
```

Stop Redis container:

```bash
docker stop redis-local
```

Start the server

```bash
  npm run dev
```

Build and start the production server:

```bash
npm run build
npm start
```

The app will run at:

http://localhost:8000

## 📦 Tech Stack

- Node.js

- Express.js

- TypeScript

- MongoDB (Mongoose)

- Redis

- Socket.IO

- Docker

- JWT Authentication

## 🚀 Deployment

This project is deployed on **Render**.

- Add your `REDIS_URL` and `MONGO_URI` in the Render environment variables.
- Use `npm run build` as the build command and `npm start` as the start command.

## 📜 License

This project is licensed under the MIT License.
