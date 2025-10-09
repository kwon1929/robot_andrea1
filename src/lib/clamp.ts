export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Anatomically accurate human joint limits (in degrees)
// Based on average human range of motion
export const JOINT_LIMITS = {
  shoulder: {
    pitch: { min: -50, max: 170 }, // -50 = arm back, 170 = arm forward/up (realistic max, not 180)
    roll: { min: -40, max: 180 }   // -40 = arm across body, 180 = arm out to side and up
  },
  elbow: {
    flex: { min: 0, max: 145 } // 0 = straight, 145 = fully bent (ONLY FORWARD)
  },
  hip: {
    pitch: { min: -20, max: 120 }, // -20 = leg back, 120 = leg forward (sitting/squat)
    roll: { min: -45, max: 45 }    // -45 = leg cross inward, 45 = leg out (abduction)
  },
  knee: {
    flex: { min: 0, max: 135 } // 0 = straight, 135 = fully bent (can't touch heel to butt)
  },
  torso: {
    pitch: { min: -30, max: 60 }, // -30 = lean back, 60 = bend forward
    roll: { min: -30, max: 30 }   // -30/30 = side bending
  }
};

// Apply constraints to pose to prevent unnatural joint angles
export function constrainPose(pose: any): any {
  const constrained = JSON.parse(JSON.stringify(pose));

  // Constrain torso (if exists)
  if (constrained.torso) {
    constrained.torso.pitch = clamp(
      constrained.torso.pitch,
      JOINT_LIMITS.torso.pitch.min,
      JOINT_LIMITS.torso.pitch.max
    );
    constrained.torso.roll = clamp(
      constrained.torso.roll,
      JOINT_LIMITS.torso.roll.min,
      JOINT_LIMITS.torso.roll.max
    );
  }

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
