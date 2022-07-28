/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import * as express from 'express';
import { createServer } from 'http';
import { Server as SocketIoServer } from 'socket.io';
import * as uuid from 'uuid';

import cors = require('cors');
import delay = require('delay');

const app = express();
const server = createServer(app);
const io = new SocketIoServer(server, {
  cors: {
    origin: '*',
  },
});

app.use(
  cors({
    origin: '*',
  })
);

app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to api!' });
});

const activeJobProgress: {
  [id: string]: number | undefined;
} = {};

const computeProgress = (current: number, total: number) => {
  return Number(((current / total) * 100).toFixed(1));
};

const reportJobProgress = (id: string, progress: number) => {
  activeJobProgress[id] = progress;
  const topic = `api/jobs/progress`;
  io.emit(topic, {
    id,
    progress,
  });
};

const startTimedJob = async (id: string, times: number) => {
  for (let i = 0; i < times; i += 5) {
    await delay(1000);
    console.log('update');
    reportJobProgress(id, computeProgress(i, times));
  }
  reportJobProgress(id, 100);
};

// post endpoint that accepts a new job
app.post('/api/jobs', (req, res) => {
  // get an id for the job using the uuid library
  const id = uuid.v4();
  startTimedJob(id, 100).finally(() => {
    delete activeJobProgress[id];
  });
  console.log('Started job ' + id);
  res.status(200).json({ id });
});

// add get endpoint for a specific jobs progress
app.get('/api/jobs/:id/progress', (req, res) => {
  const id = req.params.id;
  const progress = activeJobProgress[id];
  if (progress !== undefined) {
    res.status(200).json({
      id,
      progress,
    });
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
});

const port = process.env.port || 3333;

server
  .listen(port, () => {
    console.log(`Listening at http://localhost:${port}/api`);
  })
  .on('error', console.error);
