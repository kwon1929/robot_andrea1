export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Human-like joint limits (in degrees)
export const JOINT_LIMITS = {
  shoulder: {
    pitch: { min: -45, max: 180 } // -45 = backward, 180 = full forward
  },
  elbow: {
    flex: { min: 0, max: 140 } // 0 = straight, 140 = fully bent (ONLY FORWARD)
  },
  hip: {
    pitch: { min: -30, max: 110 } // -30 = back extension, 110 = forward (sitting)
  },
  knee: {
    flex: { min: 0, max: 140 } // 0 = straight, 140 = fully bent (ONLY FORWARD)
  },
};

// Apply constraints to pose to prevent unnatural joint angles
export function constrainPose(pose: any): any {
  const constrained = JSON.parse(JSON.stringify(pose));

  // Constrain arms
  constrained.leftArm.shoulder.pitch = clamp(
    constrained.leftArm.shoulder.pitch,
    JOINT_LIMITS.shoulder.pitch.min,
    JOINT_LIMITS.shoulder.pitch.max
  );
  constrained.rightArm.shoulder.pitch = clamp(
    constrained.rightArm.shoulder.pitch,
    JOINT_LIMITS.shoulder.pitch.min,
    JOINT_LIMITS.shoulder.pitch.max
  );

  // Elbows can ONLY bend forward (positive values only)
  constrained.leftArm.elbow.flex = clamp(
    Math.abs(constrained.leftArm.elbow.flex), // Force positive
    JOINT_LIMITS.elbow.flex.min,
    JOINT_LIMITS.elbow.flex.max
  );
  constrained.rightArm.elbow.flex = clamp(
    Math.abs(constrained.rightArm.elbow.flex), // Force positive
    JOINT_LIMITS.elbow.flex.min,
    JOINT_LIMITS.elbow.flex.max
  );

  // Constrain legs
  constrained.leftLeg.hip.pitch = clamp(
    constrained.leftLeg.hip.pitch,
    JOINT_LIMITS.hip.pitch.min,
    JOINT_LIMITS.hip.pitch.max
  );
  constrained.rightLeg.hip.pitch = clamp(
    constrained.rightLeg.hip.pitch,
    JOINT_LIMITS.hip.pitch.min,
    JOINT_LIMITS.hip.pitch.max
  );

  // Knees can ONLY bend forward (positive values only)
  constrained.leftLeg.knee.flex = clamp(
    Math.abs(constrained.leftLeg.knee.flex), // Force positive
    JOINT_LIMITS.knee.flex.min,
    JOINT_LIMITS.knee.flex.max
  );
  constrained.rightLeg.knee.flex = clamp(
    Math.abs(constrained.rightLeg.knee.flex), // Force positive
    JOINT_LIMITS.knee.flex.min,
    JOINT_LIMITS.knee.flex.max
  );

  return constrained;
}
