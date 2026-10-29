/**
 * Astronomical and System Data Types for SkyGazer AR.
 */

export interface GeodeticLocation {
  latitude: number;   // -90 to +90 deg
  longitude: number;  // -180 to +180 deg
  elevationM: number; // Elevation in meters
}

export interface SolarCoordinates {
  azimuthDeg: number;       // 0 = North, 90 = East, 180 = South, 270 = West
  altitudeDeg: number;      // -90 to +90 deg (apparent, refraction-corrected)
  geometricAltitudeDeg: number;
  refractionDeg: number;
  distanceAu: number;
  isAboveHorizon: boolean;
  timestampUtc: string;
}

export interface SolarEvents {
  sunriseUtc: string | null;
  solarNoonUtc: string | null;
  sunsetUtc: string | null;
}

export interface DiurnalWaypoint {
  timeUtc: string;
  azimuthDeg: number;
  altitudeDeg: number;
  vectorEnu: [number, number, number];
  isVisible: boolean;
}

export interface DeviceOrientationState {
  alpha: number | null; // Compass heading (yaw, 0 to 360)
  beta: number | null;  // Front-back pitch (-180 to 180)
  gamma: number | null; // Left-right roll (-90 to 90)
  absolute: boolean;
  compassAccuracy?: number;
  isSupported: boolean;
  permissionGranted: boolean;
}

export interface ManualCalibration {
  azimuthNudgeDeg: number;  // Offset added to orientation heading (-15 to +15)
  altitudeNudgeDeg: number; // Offset added to pitch (-15 to +15)
  fieldOfViewDeg: number;   // Camera vertical FOV (40 to 80 deg)
  declinationDeg: number;   // Magnetic declination correction (-30 to +30)
}

export interface VisionCandidate {
  centroid_px: [number, number];
  area_px: number;
  circularity: number;
}

export interface VisionProcessResult {
  filename: string;
  dimensions: { width: number; height: number };
  processing_time_ms: number;
  candidates_count: number;
  primary_candidate: VisionCandidate | null;
  all_candidates: VisionCandidate[];
}
