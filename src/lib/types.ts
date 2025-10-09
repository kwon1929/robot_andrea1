export interface ArmJointAngles {
  shoulder: { pitch: number; roll?: number }; // roll = arm away from body (abduction)
  elbow: { flex: number };
}

export interface LegJointAngles {
  hip: { pitch: number; roll?: number }; // roll = leg away from body (abduction)
  knee: { flex: number };
}

export interface TorsoAngles {
  pitch: number; // Forward/backward lean
  roll: number;  // Left/right tilt
}

export interface FullPose {
  torso?: TorsoAngles; // Optional for backward compatibility
  leftArm: ArmJointAngles;
  rightArm: ArmJointAngles;
  leftLeg: LegJointAngles;
  rightLeg: LegJointAngles;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PickableObject {
  id: string;
  name: string; // e.g., "red box", "blue ball"
  type: "box" | "sphere" | "cylinder";
  position: Vector3;
  color: string;
  size: number;
  isPicked: boolean;
}

export interface Robot {
  id: string;
  name: string;
  pose: FullPose;
  position: Vector3;
  rotation: number; // Y-axis rotation in degrees (0 = facing +Z)
  holdingObjectId: string | null;
}

export type IntentType = "pose" | "delta" | "wave" | "reset" | "pick" | "drop" | "move" | "noop" | "unknown";
export type Side = "left" | "right";
export type Joint = "shoulder" | "elbow" | "hip" | "knee";
export type Axis = "pitch" | "flex";

export interface Intent {
  type: IntentType;
  side?: Side;
  joint?: Joint;
  axis?: Axis;
  angle?: number;
  delta?: number;
  targetPosition?: Vector3;
  objectId?: string;
  objectName?: string; // e.g., "red box", "blue ball"
  text: string;
}

// Multi-step action plan system
export type ActionStepType = "navigate" | "align" | "squat" | "reach" | "grasp" | "lift" | "drop" | "stand";

export interface ActionStep {
  type: ActionStepType;
  targetPosition?: Vector3; // For navigate
  targetRotation?: number; // For align (face object)
  objectId?: string; // For grasp
  duration?: number; // Step duration in ms
}

export interface ActionPlan {
  id: string;
  steps: ActionStep[];
  targetObjectName?: string; // What we're trying to pick/drop
  targetObjectColor?: string; // For object selection
}
