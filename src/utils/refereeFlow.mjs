function sameId(first, second) {
  return String(first ?? '') === String(second ?? '');
}

function attendanceCounts(participants) {
  return participants.reduce(
    (counts, participant) => {
      if (participant.checkInStatus === 'CHECKED_IN') counts.checkedInCount += 1;
      else if (participant.checkInStatus !== 'ABSENT') counts.pendingCheckInCount += 1;
      return counts;
    },
    {
      checkedInCount: 0,
      pendingCheckInCount: 0,
      participantCount: participants.length,
    },
  );
}

function attendanceContribution(status) {
  if (!status) return { checkedInCount: 0, pendingCheckInCount: 0 };
  return {
    checkedInCount: status === 'CHECKED_IN' ? 1 : 0,
    pendingCheckInCount: status !== 'CHECKED_IN' && status !== 'ABSENT' ? 1 : 0,
  };
}

export function applyParticipantCheckIn(data, { raceId, participantId, participant }) {
  const previousParticipant = (data.participants || []).find((item) => sameId(item.id, participantId));
  const previousContribution = attendanceContribution(previousParticipant?.checkInStatus);
  const nextContribution = attendanceContribution(participant?.checkInStatus);
  const nextParticipants = (data.participants || []).map((item) =>
    sameId(item.id, participantId)
      ? {
          ...item,
          ...participant,
          raceId: item.raceId || raceId,
          raceName: item.raceName,
          tournamentName: item.tournamentName,
        }
      : item,
  );
  const selectedRaceCounts = attendanceCounts(
    nextParticipants.filter((item) => sameId(item.raceId, raceId)),
  );
  const updateRaceCounts = (race) =>
    sameId(race.id, raceId) ? { ...race, ...selectedRaceCounts } : race;

  return {
    ...data,
    participants: nextParticipants,
    races: (data.races || []).map(updateRaceCounts),
    dashboard: {
      ...data.dashboard,
      checkedInCount:
        Number(data.dashboard?.checkedInCount || 0) +
        nextContribution.checkedInCount -
        previousContribution.checkedInCount,
      pendingCheckInCount:
        Number(data.dashboard?.pendingCheckInCount || 0) +
        nextContribution.pendingCheckInCount -
        previousContribution.pendingCheckInCount,
      upcomingRaces: (data.dashboard?.upcomingRaces || []).map(updateRaceCounts),
    },
  };
}
