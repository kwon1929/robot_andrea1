import type { Robot, PickableObject, ActionPlan, ActionStep, FullPose, Vector3 } from "./types";
import { MOTIONS, lerpPose, lerpVec3, ease } from "./motion";

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
      // Walk to target position
      if (!step.targetPosition) {
        onComplete();
        return;
      }

      const startPos = { ...robot.position };
      const targetPos = { ...step.targetPosition };

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = ease.easeInOut(progress);

        setRobots((prevRobots) =>
          prevRobots.map((r) => {
            if (r.id !== robot.id) return r;

            // Smooth position interpolation
            const newPos = lerpVec3(startPos, targetPos, easedProgress);

            // Add vertical bobbing for natural walk
            const steps = (elapsed / 600) % 1;
            newPos.y = Math.sin(steps * Math.PI * 2) * 0.03;

            // Natural walk cycle
            const walkPhase = (elapsed / 600) % 1;
            const walkPose = MOTIONS.walkCycle(walkPhase);

            return { ...r, position: newPos, pose: walkPose };
          })
        );

        if (progress >= 1) {
          clearInterval(interval);
          onComplete();
        }
      }, 16);
      break;
    }

    case "align": {
      // Rotate to face target
      if (step.targetRotation === undefined) {
        onComplete();
        return;
      }

      const startRotation = robot.rotation;
      const targetRotation = step.targetRotation;

      const interval = setInterval(() => {
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
          clearInterval(interval);
          onComplete();
        }
      }, 16);
      break;
    }

    case "squat": {
      // Squat down
      const startPose = robot.pose;
      const squatPose = MOTIONS.squat();
      const startY = robot.position.y;

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = ease.easeInOut(progress);

        setRobots((prevRobots) =>
          prevRobots.map((r) => {
            if (r.id !== robot.id) return r;

            const newPose = lerpPose(startPose, squatPose, easedProgress);
            const newPos = { ...r.position };
            newPos.y = startY - easedProgress * 0.6; // Lower body

            return { ...r, pose: newPose, position: newPos };
          })
        );

        if (progress >= 1) {
          clearInterval(interval);
          onComplete();
        }
      }, 16);
      break;
    }

    case "reach": {
      // Reach down to object
      const startPose = robot.pose;
      const reachPose = MOTIONS.reachDown();

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = ease.easeOut(progress);

        setRobots((prevRobots) =>
          prevRobots.map((r) => {
            if (r.id !== robot.id) return r;
            const newPose = lerpPose(startPose, reachPose, easedProgress);
            return { ...r, pose: newPose };
          })
        );

        if (progress >= 1) {
          clearInterval(interval);
          onComplete();
        }
      }, 16);
      break;
    }

    case "grasp": {
      // Grasp object instantly
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
      // Stand up with object
      const startPose = robot.pose;
      const holdPose = MOTIONS.holding();
      const startY = robot.position.y;

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = ease.easeInOut(progress);

        setRobots((prevRobots) =>
          prevRobots.map((r) => {
            if (r.id !== robot.id) return r;

            const newPose = lerpPose(startPose, holdPose, easedProgress);
            const newPos = { ...r.position };
            newPos.y = startY + easedProgress * 0.6; // Raise body back up

            return { ...r, pose: newPose, position: newPos };
          })
        );

        if (progress >= 1) {
          clearInterval(interval);
          onComplete();
        }
      }, 16);
      break;
    }

    case "drop": {
      // Drop object at current position
      setRobots((prevRobots) =>
        prevRobots.map((r) => {
          if (r.id !== robot.id) return r;
          if (!r.holdingObjectId) return r;

          // Drop object at robot's position
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
      // Stand up after dropping
      const startPose = robot.pose;
      const idlePose = MOTIONS.idle();
      const startY = robot.position.y;

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = ease.easeInOut(progress);

        setRobots((prevRobots) =>
          prevRobots.map((r) => {
            if (r.id !== robot.id) return r;

            const newPose = lerpPose(startPose, idlePose, easedProgress);
            const newPos = { ...r.position };
            newPos.y = startY + easedProgress * 0.6; // Raise body

            return { ...r, pose: newPose, position: newPos };
          })
        );

        if (progress >= 1) {
          clearInterval(interval);
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
