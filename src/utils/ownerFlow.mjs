const INVITATION_STATUS_CODES = {
  PENDING: 'PENDING',
  'CHỜ XỬ LÝ': 'PENDING',
  ACCEPTED: 'ACCEPTED',
  'ĐÃ CHẤP NHẬN': 'ACCEPTED',
  REJECTED: 'REJECTED',
  'ĐÃ TỪ CHỐI': 'REJECTED',
  CANCELLED: 'CANCELLED',
  CANCELED: 'CANCELLED',
  'ĐÃ HỦY': 'CANCELLED',
};

const REGISTRATION_STATUS_CODES = {
  PENDING: 'PENDING',
  'CHỜ DUYỆT': 'PENDING',
  APPROVED: 'APPROVED',
  'ĐÃ DUYỆT': 'APPROVED',
  ONGOING: 'ONGOING',
  'ĐANG CHẠY': 'ONGOING',
  'ĐANG DIỄN RA': 'ONGOING',
  COMPLETED: 'COMPLETED',
  'HOÀN THÀNH': 'COMPLETED',
  REJECTED: 'REJECTED',
  'TỪ CHỐI': 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
  'ĐÃ RÚT': 'WITHDRAWN',
  CANCELLED: 'CANCELLED',
  CANCELED: 'CANCELLED',
  'ĐÃ HỦY': 'CANCELLED',
};

const ACTIVE_INVITATION_CODES = new Set(['PENDING', 'ACCEPTED']);
const ACTIVE_REGISTRATION_CODES = new Set(['PENDING', 'APPROVED', 'ONGOING']);

export function sameOwnerFlowId(left, right) {
  return String(left || '') === String(right || '');
}

export function normalizeInvitationStatus(status) {
  const value = String(status || 'PENDING').trim().toUpperCase();
  return INVITATION_STATUS_CODES[value] || value;
}

export function normalizeRegistrationStatus(status) {
  const value = String(status || 'PENDING').trim().toUpperCase();
  return REGISTRATION_STATUS_CODES[value] || value;
}

export function isActiveOwnerInvitation(item) {
  return ACTIVE_INVITATION_CODES.has(
    normalizeInvitationStatus(item?.statusCode || item?.status),
  );
}

export function isAcceptedOwnerInvitation(item) {
  return normalizeInvitationStatus(item?.statusCode || item?.status) === 'ACCEPTED';
}

export function isActiveOwnerRegistration(item) {
  return ACTIVE_REGISTRATION_CODES.has(
    normalizeRegistrationStatus(item?.statusCode || item?.status),
  );
}

export function isApprovedOwnerHorse(horse) {
  const status = String(
    horse?.approvalStatus || horse?.statusCode || horse?.status || '',
  )
    .trim()
    .toUpperCase();
  return status === 'APPROVED';
}

export function isOwnerHorseRaceEligible(horse) {
  return (
    isApprovedOwnerHorse(horse) &&
    horse?.canRace !== false &&
    String(horse?.racingStatus || 'can-race') !== 'cannot-race'
  );
}

function toTimestamp(value) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function schedulesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  const firstStartAt = toTimestamp(firstStart);
  const secondStartAt = toTimestamp(secondStart);
  if (firstStartAt === null || secondStartAt === null) return false;

  const defaultDuration = 2 * 60 * 60 * 1000;
  const firstEndAt = toTimestamp(firstEnd) ?? firstStartAt + defaultDuration;
  const secondEndAt = toTimestamp(secondEnd) ?? secondStartAt + defaultDuration;
  return firstStartAt < secondEndAt && secondStartAt < firstEndAt;
}

function itemRaceStart(item) {
  return item?.raceScheduledStartAt || item?.raceScheduledAt || item?.scheduledStartAt || '';
}

function itemRaceEnd(item) {
  return item?.raceScheduledEndAt || item?.scheduledEndAt || '';
}

export function raceHorseLockedByInvitation(invitations, race, horseId) {
  return (invitations || []).some((item) => {
    if (!isActiveOwnerInvitation(item) || !sameOwnerFlowId(item.horseId, horseId)) {
      return false;
    }
    if (sameOwnerFlowId(item.raceId, race?.id || race)) return true;
    if (!race || typeof race !== 'object') return false;
    return schedulesOverlap(
      itemRaceStart(item),
      itemRaceEnd(item),
      itemRaceStart(race),
      itemRaceEnd(race),
    );
  });
}

export function raceJockeyLockedByInvitation(invitations, race, jockeyId) {
  return (invitations || []).some((item) => {
    if (!isActiveOwnerInvitation(item) || !sameOwnerFlowId(item.jockeyId, jockeyId)) {
      return false;
    }
    if (sameOwnerFlowId(item.raceId, race?.id || race)) return true;
    if (!race || typeof race !== 'object') return false;
    return schedulesOverlap(
      itemRaceStart(item),
      itemRaceEnd(item),
      itemRaceStart(race),
      itemRaceEnd(race),
    );
  });
}

export function raceHorseLockedByRegistration(registrations, race, horseId) {
  return (registrations || []).some((item) => {
    if (!isActiveOwnerRegistration(item) || !sameOwnerFlowId(item.horseId, horseId)) {
      return false;
    }
    if (sameOwnerFlowId(item.raceId, race?.id || race)) return true;
    if (!race || typeof race !== 'object') return false;
    return schedulesOverlap(
      itemRaceStart(item),
      itemRaceEnd(item),
      itemRaceStart(race),
      itemRaceEnd(race),
    );
  });
}

export function raceJockeyLockedByRegistration(registrations, race, jockeyId) {
  return (registrations || []).some((item) => {
    if (!isActiveOwnerRegistration(item) || !sameOwnerFlowId(item.jockeyId, jockeyId)) {
      return false;
    }
    if (sameOwnerFlowId(item.raceId, race?.id || race)) return true;
    if (!race || typeof race !== 'object') return false;
    return schedulesOverlap(
      itemRaceStart(item),
      itemRaceEnd(item),
      itemRaceStart(race),
      itemRaceEnd(race),
    );
  });
}

export function jockeyLockedForRace(locks, raceId) {
  return (locks || []).some((item) => sameOwnerFlowId(item.raceId, raceId));
}

export function uniqueAcceptedRaceHorseInvitations(invitations) {
  const seen = new Set();
  return (invitations || []).filter((item) => {
    if (!isAcceptedOwnerInvitation(item)) return false;
    const key = `${item.raceId || ''}:${item.horseId || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
