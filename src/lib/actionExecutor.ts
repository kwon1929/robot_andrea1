import type { Robot, PickableObject, ActionPlan, ActionStep, FullPose, Vector3 } from "./types";
import { MOTIONS, lerpPose, lerpVec3, ease, lerp } from "./motion";

// Global interval tracker to prevent memory leaks
const activeIntervals = new Set<NodeJS.Timeout>();

function createManagedInterval(callback: () => void, ms: number): NodeJS.Timeout {
  const id = setInterval(callback, ms);
  activeIntervals.add(id);
  return id;
}

function clearManagedInterval(id: NodeJS.Timeout) {
  clearInterval(id);
  activeIntervals.delete(id);
}

// Cleanup all intervals (called on unmount or error)
export function cleanupAllIntervals() {
  activeIntervals.forEach(id => clearInterval(id));
  activeIntervals.clear();
}

// Execute a single action step
export function executeActionStep(
  step: ActionStep,
  robot: Robot,
  setRobots: (fn: (prev: Robot[]) => Robot[]) => void,
  setObjects: (fn: (prev: PickableObject[]) => PickableObject[]) => void,
  onComplete: () => void
) {
  const duration = step.duration || 500;
  const startTime = Date.now();

  switch (step.type) {
    case "navigate": {
      if (!step.targetPosition) {
        onComplete();
        return;
      }

      const startPos = { ...robot.position };
      const targetPos = { ...step.targetPosition };
      const targetRotation = step.targetRotation !== undefined ? step.targetRotation : robot.rotation;

      const interval = createManagedInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = ease.easeInOut(progress);

        setRobots((prevRobots) =>
          prevRobots.map((r) => {
            if (r.id !== robot.id) return r;

            const newPos = lerpVec3(startPos, targetPos, easedProgress);
            const steps = (elapsed / 600) % 1;
            const groundLevel = -0.35;
            newPos.y = groundLevel + Math.sin(steps * Math.PI * 2) * 0.03;

            const walkPhase = (elapsed / 600) % 1;
            const walkPose = MOTIONS.walkCycle(walkPhase);

            return { ...r, position: newPos, pose: walkPose, rotation: targetRotation };
          })
        );

        if (progress >= 1) {
          clearManagedInterval(interval);
          setRobots((prevRobots) =>
            prevRobots.map((r) => {
              if (r.id !== robot.id) return r;
              return { ...r, position: { ...targetPos, y: -0.35 } };
            })
          );
          onComplete();
        }
      }, 16);
      break;
    }

    case "align": {
      if (step.targetRotation === undefined) {
        onComplete();
        return;
      }

      const startRotation = robot.rotation;
      const targetRotation = step.targetRotation;

      const interval = createManagedInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = ease.easeInOut(progress);

        setRobots((prevRobots) =>
          prevRobots.map((r) => {
            if (r.id !== robot.id) return r;
            const newRotation = startRotation + (targetRotation - startRotation) * easedProgress;
            return { ...r, rotation: newRotation };
          })
        );

        if (progress >= 1) {
          clearManagedInterval(interval);
          onComplete();
        }
      }, 16);
      break;
    }

    case "squat": {
      const startPose = robot.pose;
      const prepPose = MOTIONS.squatPrep();
      const squatPose = MOTIONS.squat();
      const groundLevel = -0.35;

      const interval = createManagedInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = ease.easeOutBack(progress);

        let targetPose = squatPose;
        let poseProgress = easedProgress;

        if (progress < 0.3) {
          targetPose = prepPose;
          poseProgress = progress / 0.3;
        } else {
          poseProgress = (progress - 0.3) / 0.7;
          targetPose = squatPose;
        }

        setRobots((prevRobots) =>
          prevRobots.map((r) => {
            if (r.id !== robot.id) return r;

            const fromPose = progress < 0.3 ? startPose : prepPose;
            const newPose = lerpPose(fromPose, targetPose, poseProgress);
            const newPos = { ...r.position };
            newPos.y = groundLevel - easedProgress * 0.4;

            return { ...r, pose: newPose, position: newPos };
          })
        );

        if (progress >= 1) {
          clearManagedInterval(interval);
          onComplete();
        }
      }, 16);
      break;
    }

    case "reach": {
      const startPose = robot.pose;
      const reachPose = MOTIONS.reachDown();

      const interval = createManagedInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = ease.easeOut(progress);

        setRobots((prevRobots) =>
          prevRobots.map((r) => {
            if (r.id !== robot.id) return r;

            const shoulderProgress = Math.min(easedProgress * 1.3, 1);
            const elbowProgress = Math.max(0, easedProgress - 0.15);

            const newPose: FullPose = {
              torso: startPose.torso,
              leftArm: {
                shoulder: {
                  pitch: startPose.leftArm.shoulder.pitch + (reachPose.leftArm.shoulder.pitch - startPose.leftArm.shoulder.pitch) * shoulderProgress,
                  roll: startPose.leftArm.shoulder.roll || 0
                },
                elbow: { flex: startPose.leftArm.elbow.flex + (reachPose.leftArm.elbow.flex - startPose.leftArm.elbow.flex) * elbowProgress },
              },
              rightArm: {
                shoulder: {
                  pitch: startPose.rightArm.shoulder.pitch + (reachPose.rightArm.shoulder.pitch - startPose.rightArm.shoulder.pitch) * shoulderProgress,
                  roll: startPose.rightArm.shoulder.roll || 0
                },
                elbow: { flex: startPose.rightArm.elbow.flex + (reachPose.rightArm.elbow.flex - startPose.rightArm.elbow.flex) * elbowProgress },
              },
              leftLeg: startPose.leftLeg,
              rightLeg: startPose.rightLeg,
            };

            return { ...r, pose: newPose };
          })
        );

        if (progress >= 1) {
          clearManagedInterval(interval);
          onComplete();
        }
      }, 16);
      break;
    }

    case "grasp": {
      if (!step.objectId) {
        onComplete();
        return;
      }

      setObjects((prevObjects) =>
        prevObjects.map((obj) =>
          obj.id === step.objectId ? { ...obj, isPicked: true } : obj
        )
      );

      setRobots((prevRobots) =>
        prevRobots.map((r) =>
          r.id === robot.id ? { ...r, holdingObjectId: step.objectId! } : r
        )
      );

      setTimeout(onComplete, duration);
      break;
    }

    case "lift": {
      const startPose = robot.pose;
      const groundLevel = -0.35;

      const interval = createManagedInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = ease.easeOut(progress);

        setRobots((prevRobots) =>
          prevRobots.map((r) => {
            if (r.id !== robot.id) return r;

            let objectWeight = 0.3;
            setObjects((prevObjects) => {
              const heldObj = prevObjects.find(obj => obj.id === r.holdingObjectId);
              if (heldObj) objectWeight = heldObj.size;
              return prevObjects;
            });

            const holdPose = MOTIONS.holding(objectWeight);
            const torsoStraightenPhase = Math.max(0, (easedProgress - 0.4) / 0.6);
            const currentTorso = startPose.torso || { pitch: 55, roll: 0 };
            const targetTorso = holdPose.torso || { pitch: -3, roll: 0 };

            const newPose = lerpPose(startPose, holdPose, easedProgress);

            if (newPose.torso) {
              newPose.torso.pitch = lerp(currentTorso.pitch, targetTorso.pitch, torsoStraightenPhase);
            }

            const newPos = { ...r.position };
            const squatY = groundLevel - 0.4;
            newPos.y = squatY + easedProgress * 0.4;

            return { ...r, pose: newPose, position: newPos };
          })
        );

        if (progress >= 1) {
          clearManagedInterval(interval);
          onComplete();
        }
      }, 16);
      break;
    }

    case "drop": {
      setRobots((prevRobots) =>
        prevRobots.map((r) => {
          if (r.id !== robot.id) return r;
          if (!r.holdingObjectId) return r;

          setObjects((prevObjects) =>
            prevObjects.map((obj) =>
              obj.id === r.holdingObjectId
                ? { ...obj, isPicked: false, position: { ...r.position, y: -1.5 } }
                : obj
            )
          );

          return { ...r, holdingObjectId: null };
        })
      );

      setTimeout(onComplete, duration);
      break;
    }

    case "stand": {
      const startPose = robot.pose;
      const idlePose = MOTIONS.idle();
      const groundLevel = -0.4;

      const interval = createManagedInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = ease.easeInOut(progress);

        setRobots((prevRobots) =>
          prevRobots.map((r) => {
            if (r.id !== robot.id) return r;

            const newPose = lerpPose(startPose, idlePose, easedProgress);
            const newPos = { ...r.position };
            const squatY = groundLevel - 0.4;
            newPos.y = squatY + easedProgress * 0.4;

            return { ...r, pose: newPose, position: newPos };
          })
        );

        if (progress >= 1) {
          clearManagedInterval(interval);
          onComplete();
        }
      }, 16);
      break;
    }

    default:
      onComplete();
  }
}

// Execute entire action plan sequentially
export function executeActionPlan(
  plan: ActionPlan,
  robot: Robot,
  setRobots: (fn: (prev: Robot[]) => Robot[]) => void,
  setObjects: (fn: (prev: PickableObject[]) => PickableObject[]) => void,
  onComplete: () => void
) {
  let currentStepIndex = 0;

  const executeNext = () => {
    if (currentStepIndex >= plan.steps.length) {
      onComplete();
      return;
    }

    const step = plan.steps[currentStepIndex];
    currentStepIndex++;

    executeActionStep(step, robot, setRobots, setObjects, executeNext);
  };

  executeNext();
}
