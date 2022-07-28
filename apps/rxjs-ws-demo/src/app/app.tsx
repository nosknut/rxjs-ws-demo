// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { bind } from '@react-rxjs/core';
import { map, ReplaySubject, scan } from 'rxjs';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3333');

type Progress = {
  id: string;
  progress: number;
};

type DeleteProgress = {
  id: string;
  delete: true;
};

type ProgressMap = {
  [id: string]: Progress;
};

const $jobsStream = new ReplaySubject<Progress | DeleteProgress>();

socket.on('api/jobs/progress', (message) => {
  $jobsStream.next(message);
  console.log(message);
});

const $jobsMap = $jobsStream.pipe(
  scan((acc, curr) => {
    if ('delete' in curr) {
      delete acc[curr.id];
      return acc;
    }
    return {
      ...acc,
      [curr.id]: curr,
    };
  }, {} as ProgressMap)
);

// Will contain exactly one entry for each job because of the $jobsMap scan
const $jobsList = $jobsMap.pipe(map((jobs) => Object.values(jobs)));

const [useJobs] = bind($jobsList, []);

const getJobProgress = async (id: string) => {
  const response = await fetch(`http://localhost:3333/api/jobs/${id}/progress`);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return response.json();
};

const startJob = async () => {
  const response = await fetch('http://localhost:3333/api/jobs', {
    method: 'POST',
  });
  const { id } = await response.json();
  // optionally pre-fetch the job progress immedietly after starting it
  const progress = await getJobProgress(id);
  $jobsStream.next(progress);
};

const deleteJob = (id: string) => {
  $jobsStream.next({ id, delete: true });
};

export function JobsList() {
  const jobs = useJobs();
  const jobsList = jobs.map((job) => {
    const deleteJobButton =
      job.progress >= 100 ? (
        <button onClick={() => deleteJob(job.id)}>Delete Job</button>
      ) : null;

    return (
      <div key={job.id}>
        <div>{job.id}</div>
        <div>{job.progress}</div>
        {deleteJobButton}
      </div>
    );
  });

  return <div>{jobsList}</div>;
}

export function App() {
  return (
    <>
      <button onClick={() => startJob().catch(console.error)}>Start job</button>
      <JobsList />
    </>
  );
}

export default App;
