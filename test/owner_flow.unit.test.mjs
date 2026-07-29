import assert from 'node:assert/strict';

import {
  isActiveOwnerInvitation,
  isApprovedOwnerHorse,
  isOwnerHorseRaceEligible,
  jockeyLockedForRace,
  raceHorseLockedByInvitation,
  raceJockeyLockedByRegistration,
  schedulesOverlap,
  uniqueAcceptedRaceHorseInvitations,
} from '../src/utils/ownerFlow.mjs';

function test(name, run) {
  try {
    run();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('chuẩn hóa trạng thái lời mời Việt/Anh', () => {
  assert.equal(isActiveOwnerInvitation({ status: 'Chờ xử lý' }), true);
  assert.equal(isActiveOwnerInvitation({ status: 'ACCEPTED' }), true);
  assert.equal(isActiveOwnerInvitation({ status: 'Đã từ chối' }), false);
});

test('chỉ ngựa đã duyệt và có thể thi đấu được chọn', () => {
  assert.equal(isApprovedOwnerHorse({ statusCode: 'APPROVED' }), true);
  assert.equal(isOwnerHorseRaceEligible({ statusCode: 'APPROVED', canRace: true }), true);
  assert.equal(isOwnerHorseRaceEligible({ statusCode: 'PENDING', canRace: true }), false);
  assert.equal(
    isOwnerHorseRaceEligible({ statusCode: 'APPROVED', racingStatus: 'cannot-race' }),
    false,
  );
});

test('phát hiện hai lịch đua chồng thời gian', () => {
  assert.equal(
    schedulesOverlap(
      '2026-08-01T08:00:00Z',
      '2026-08-01T09:00:00Z',
      '2026-08-01T08:30:00Z',
      '2026-08-01T10:00:00Z',
    ),
    true,
  );
  assert.equal(
    schedulesOverlap(
      '2026-08-01T08:00:00Z',
      '2026-08-01T09:00:00Z',
      '2026-08-01T09:00:00Z',
      '2026-08-01T10:00:00Z',
    ),
    false,
  );
});

test('khóa một ngựa khi đã có lời mời cùng race hoặc trùng giờ', () => {
  const invitations = [{
    horseId: 'horse-1',
    raceId: 'race-1',
    status: 'PENDING',
    raceScheduledStartAt: '2026-08-01T08:00:00Z',
    raceScheduledEndAt: '2026-08-01T09:00:00Z',
  }];
  assert.equal(raceHorseLockedByInvitation(invitations, 'race-1', 'horse-1'), true);
  assert.equal(
    raceHorseLockedByInvitation(
      invitations,
      {
        id: 'race-2',
        scheduledStartAt: '2026-08-01T08:30:00Z',
        scheduledEndAt: '2026-08-01T09:30:00Z',
      },
      'horse-1',
    ),
    true,
  );
});

test('khóa một jockey đã đăng ký trong cùng race', () => {
  const registrations = [{
    jockeyId: 'jockey-1',
    raceId: 'race-1',
    statusCode: 'APPROVED',
  }];
  assert.equal(raceJockeyLockedByRegistration(registrations, 'race-1', 'jockey-1'), true);
  assert.equal(raceJockeyLockedByRegistration(registrations, 'race-1', 'jockey-2'), false);
});

test('khóa race đã được jockey nhận từ owner khác', () => {
  assert.equal(jockeyLockedForRace([{ raceId: 'race-1' }], 'race-1'), true);
  assert.equal(jockeyLockedForRace([{ raceId: 'race-1' }], 'race-2'), false);
});

test('mỗi race/ngựa chỉ giữ một lời mời đã chấp nhận để đăng ký', () => {
  const invitations = [
    { id: '1', raceId: 'race-1', horseId: 'horse-1', status: 'ACCEPTED' },
    { id: '2', raceId: 'race-1', horseId: 'horse-1', status: 'Đã chấp nhận' },
    { id: '3', raceId: 'race-1', horseId: 'horse-2', status: 'ACCEPTED' },
  ];
  assert.deepEqual(
    uniqueAcceptedRaceHorseInvitations(invitations).map((item) => item.id),
    ['1', '3'],
  );
});

console.log('Owner flow unit tests passed.');
