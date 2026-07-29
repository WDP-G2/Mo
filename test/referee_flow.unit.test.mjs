import assert from 'node:assert/strict';

import {
  applyParticipantCheckIn,
  normalizeViolationMutation,
  simulationResultFromDraft,
} from '../src/utils/refereeFlow.mjs';

const initial = {
  participants: [
    { id: 'p1', raceId: 'r1', checkInStatus: 'PENDING', canCheckIn: true },
    { id: 'p2', raceId: 'r1', checkInStatus: 'CHECKED_IN', canCheckIn: false },
    { id: 'p3', raceId: 'r2', checkInStatus: 'PENDING', canCheckIn: true },
  ],
  races: [
    { id: 'r1', checkedInCount: 1, pendingCheckInCount: 1, participantCount: 2 },
    { id: 'r2', checkedInCount: 0, pendingCheckInCount: 1, participantCount: 1 },
  ],
  dashboard: {
    checkedInCount: 1,
    pendingCheckInCount: 2,
    upcomingRaces: [
      { id: 'r1', checkedInCount: 1, pendingCheckInCount: 1, participantCount: 2 },
    ],
  },
};

const checkedIn = applyParticipantCheckIn(initial, {
  raceId: 'r1',
  participantId: 'p1',
  participant: { id: 'p1', checkInStatus: 'CHECKED_IN', canCheckIn: false },
});

assert.equal(checkedIn.participants[0].checkInStatus, 'CHECKED_IN');
assert.equal(checkedIn.races[0].checkedInCount, 2);
assert.equal(checkedIn.races[0].pendingCheckInCount, 0);
assert.equal(checkedIn.dashboard.checkedInCount, 2);
assert.equal(checkedIn.dashboard.pendingCheckInCount, 1);
assert.equal(checkedIn.dashboard.upcomingRaces[0].checkedInCount, 2);
assert.equal(checkedIn.dashboard.upcomingRaces[0].pendingCheckInCount, 0);
assert.equal(checkedIn.races[1], initial.races[1]);

const absent = applyParticipantCheckIn(initial, {
  raceId: 'r1',
  participantId: 'p1',
  participant: { id: 'p1', checkInStatus: 'ABSENT', canCheckIn: true },
});

assert.equal(absent.races[0].checkedInCount, 1);
assert.equal(absent.races[0].pendingCheckInCount, 0);
assert.equal(absent.dashboard.checkedInCount, 1);
assert.equal(absent.dashboard.pendingCheckInCount, 1);

const draft = {
  status: 'REVIEW_PENDING',
  simulationRunId: 'run-1',
  version: 3,
  rows: [
    {
      participantId: 'p1',
      horseName: 'Ngân Nguyệt',
      jockeyName: 'Cao Tuấn Kiệt',
      gateNumber: 2,
      rank: 1,
      finishTimeMillis: 68120,
    },
  ],
};
const restoredSimulation = simulationResultFromDraft(draft);
assert.equal(restoredSimulation.runId, 'run-1');
assert.equal(restoredSimulation.status, 'DRAFTED');
assert.deepEqual(restoredSimulation.participants, draft.rows);

const mutation = normalizeViolationMutation({
  violation: { id: 'v1', type: 'Doping' },
  resultDraft: draft,
});
assert.equal(mutation.violation.id, 'v1');
assert.equal(mutation.resultDraft.version, 3);

console.log('Referee flow unit tests passed.');
