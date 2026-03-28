export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  timestamp: number;
}

export interface Route {
  id: string;
  name: string;
  waypoints: Waypoint[];
  createdAt: number;
  isAccessible?: boolean;
}

export type HazardType = 'Steps or Stairs' | 'No Ramp' | 'Path Too Narrow' | 'Too Steep' | 'Broken Pavement' | 'No Curb Cut' | 'Broken Elevator' | 'General';

export interface Hazard {
  id: string;
  lat: number;
  lng: number;
  description: string;
  timestamp: number;
  type?: HazardType;
}

export interface Translations {
  greeting: string;
  instructions: string;
  recordRoute: string;
  followRoute: string;
  reportHazard: string;
  describeScene: string;
  startRecording: string;
  stopRecording: string;
  dropWaypoint: string;
  saveRoute: string;
  cancel: string;
  hazardReported: string;
  hazardWarning: string;
  waypointReached: string;
  selectRoute: string;
  noRoutes: string;
  back: string;
  analyzing: string;
  guardianMode: string;
  trafficWarning: string;
  approachingIntersection: string;
  dangerDetected: string;
  smartCaneMode: string;
  smartCaneActive: string;
  // Wheelchair specific
  steps: string;
  noRamp: string;
  narrowPath: string;
  tooSteep: string;
  brokenPavement: string;
  noCurbCut: string;
  brokenElevator: string;
  accessible: string;
  obstacleMapped: string;
  communityObstacles: string;
  wheelchairNavigator: string;
  descriptionPrompt: string;
  routeNamePrompt: string;
  // Creative features
  checkSlope: string;
  checkDoorway: string;
  slopeAnalysis: string;
  doorwayAnalysis: string;
  restroomSearch: string;
  surfaceTexture: string;
}
