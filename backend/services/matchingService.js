const EmergencyCase = require('../models/EmergencyCase');
const Paramedic = require('../models/Paramedic');
const { haversineMeters } = require('./geoService');

const DEFAULT_MAX_DISTANCE_M = 10000; // 10km

async function findNearestAvailableParamedic({ lat, lng, maxDistanceM = DEFAULT_MAX_DISTANCE_M }) {
  // MVP: GeoJSON 인덱스를 아직 안 쓰고, “가까운 후보”를 단순 조회 후 거리 계산
  // 규모 커지면 2dsphere로 전환 권장
  const candidates = await Paramedic.find({ status: 'available' })
    .select('_id currentLocation notificationSettings')
    .lean();

  let best = null;
  for (const p of candidates) {
    const pLoc = p.currentLocation;
    if (!pLoc || pLoc.lat === undefined || pLoc.lng === undefined) continue;
    const dist = haversineMeters({ lat, lng }, { lat: pLoc.lat, lng: pLoc.lng });
    const max = p.notificationSettings?.maxDistance ?? maxDistanceM;
    if (dist > max) continue;
    if (!best || dist < best.distanceM) best = { paramedicId: p._id, distanceM: dist };
  }
  return best;
}

async function autoMatchParamedicForCase(caseId) {
  const ec = await EmergencyCase.findById(caseId);
  if (!ec) {
    const err = new Error('케이스를 찾을 수 없습니다.');
    err.statusCode = 404;
    throw err;
  }
  if (ec.paramedic?.paramedicId) {
    return { matched: false, reason: 'already_matched', caseId: ec._id };
  }

  const lat = ec.locations?.current?.lat ?? ec.locations?.detectedAt?.lat;
  const lng = ec.locations?.current?.lng ?? ec.locations?.detectedAt?.lng;
  if (lat === undefined || lng === undefined) {
    return { matched: false, reason: 'no_location', caseId: ec._id };
  }

  const nearest = await findNearestAvailableParamedic({ lat, lng });
  if (!nearest) return { matched: false, reason: 'no_paramedic', caseId: ec._id };

  ec.paramedic = {
    paramedicId: nearest.paramedicId,
    matchedAt: new Date(),
    status: 'pending',
  };
  ec.status = 'matched';
  await ec.save();

  // 응급구조사 문서에 pending 케이스 추가(알림 큐)
  await Paramedic.findByIdAndUpdate(nearest.paramedicId, {
    $push: {
      pendingCases: {
        caseId: ec._id,
        receivedAt: new Date(),
        distance: nearest.distanceM,
      },
    },
  });

  return { matched: true, caseId: ec._id, paramedicId: nearest.paramedicId, distanceM: nearest.distanceM };
}

module.exports = {
  autoMatchParamedicForCase,
  findNearestAvailableParamedic,
};

