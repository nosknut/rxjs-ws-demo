/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import * as express from 'express';
import { createServer } from 'http';
import socketIo from 'socket.io';
import * as uuid from 'uuid';
import wait from 'wait';

const app = express();
const server = createServer(app);
const io = socketIo(server);

app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to api!' });
});

const activeJobProgress: {
  [id: string]: number | undefined
} = {}

const computeProgress = (current: number, total: number) => {
  return Number(((current/total)*100).toFixed(1));
}

const reportJobProgress = (id: string, progress: number) => {
  activeJobProgress[id] = progress;
  const topic = `api/jobs/${id}/progress`;
  io.emit(topic, { progress });
}

const startTimedJob = async (id: string, times: number) => {
  for (let i = 0; i < times; i++) {
    await wait(1000);
    reportJobProgress(id, computeProgress(i, times));
  }
}

// post endpoint that accepts a new job
app.post('/api/jobs', (req, res) => {
  // get an id for the job using the uuid library
  const id = uuid.v4();
  startTimedJob(id, 60).finally(()=>{
    delete activeJobProgress[id];
  })
  res.status(200).json({ id });
});

// add get endpoint for a specific jobs progress
app.get('/api/jobs/:id/progress', (req, res) => {
  const id = req.params.id;
  const progress = activeJobProgress[id];
  if(progress !== undefined){
    res.status(200).json({ progress });
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
})

const port = process.env.port || 3333;

server.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
}).on('error', console.error);
