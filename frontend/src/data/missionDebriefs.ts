import type { MissionId } from '../types/missions';

/** Short “what you learned” copy shown after each mission (CGIP learning goals). */
export const MISSION_DEBRIEFS: Record<MissionId, string> = {
  cadet_setup:
    'You connected your observatory to Earth: latitude and longitude feed ephemeris math that outputs azimuth and altitude—the same numbers AR projection uses later.',
  math_agreement:
    'Browser VSOP87 math and server NASA JPL DE421 agreed within a tiny angle. That proves our client is fast enough for AR while the server is the accuracy benchmark.',
  sky_scanner:
    'You aligned a 3D sky direction with your camera using compass heading and tilt. That is the same ENU → camera → screen pipeline used in computer graphics MVP thinking.',
  orbit_master:
    'The 3D map shows the diurnal path: the Sun’s arc comes from time + location. Visible and hidden parts of the orbit match altitude above the horizon.',
  lab_detective:
    'OpenCV turned pixels into a bright-region centroid. Optical detection is not perfect—it must be compared to math, not trusted alone.',
  planet_collector:
    'You discovered multiple worlds in one sky session. Each lock adds to your personal catalog—like a mini planetarium field journal.',
};

export function getMissionDebrief(missionId: MissionId): string {
  return MISSION_DEBRIEFS[missionId];
}
