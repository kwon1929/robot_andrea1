import { useState } from "react";
import Scene from "./Scene";
import ChatPanel from "./ChatPanel";
import { useIntentParser } from "../hooks/useIntentParser";
import { parseCommandWithGPT } from "../lib/openai";
import type { Robot, Intent, FullPose, PickableObject, ActionPlan, ActionStep } from "../lib/types";
import { clamp, JOINT_LIMITS, constrainPose } from "../lib/clamp";
import { MOTIONS, lerpPose, ease, lerpVec3 } from "../lib/motion";
import { findObjectByDescription, createPickPlan, createDropPlan } from "../lib/actionPlanner";
import { executeActionPlan } from "../lib/actionExecutor";

const DEFAULT_POSE: FullPose = {
  leftArm: { shoulder: { pitch: 0 }, elbow: { flex: 0 } },
  rightArm: { shoulder: { pitch: 0 }, elbow: { flex: 0 } },
  leftLeg: { hip: { pitch: 0 }, knee: { flex: 0 } },
  rightLeg: { hip: { pitch: 0 }, knee: { flex: 0 } },
};

export default function PhysicalAIMVP() {
  const [robots, setRobots] = useState<Robot[]>([
    {
      id: "robot-1",
      name: "Robot 1",
      pose: JSON.parse(JSON.stringify(DEFAULT_POSE)),
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      holdingObjectId: null,
    },
  ]);

  const [objects, setObjects] = useState<PickableObject[]>([
    { id: "obj-1", name: "red box", type: "box", position: { x: 1, y: -1.5, z: 0 }, color: "#ef4444", size: 0.3, isPicked: false },
    { id: "obj-2", name: "blue ball", type: "sphere", position: { x: -1, y: -1.5, z: 1 }, color: "#3b82f6", size: 0.3, isPicked: false },
    { id: "obj-3", name: "green cylinder", type: "cylinder", position: { x: 0.5, y: -1.5, z: -1.5 }, color: "#10b981", size: 0.3, isPicked: false },
  ]);

  const [logs, setLogs] = useState<Intent[]>([]);
  const { parseCommand } = useIntentParser();

  const applyAction = (intent: Intent) => {
    setLogs((prev) => [...prev, intent]);

    if (intent.type === "unknown") {
      console.warn("Unknown command:", intent.text);
      return;
    }

    // Handle pick action with action planner
    if (intent.type === "pick") {
      const robot = robots[0]; // Assuming single robot for now

      if (robot.holdingObjectId) {
        console.warn("Robot is already holding an object");
        return;
      }

      // Find target object using improved search
      const targetObject = intent.objectName
        ? findObjectByDescription(objects, intent.objectName)
        : objects.find(obj => !obj.isPicked); // Default: first available

      if (!targetObject) {
        console.warn(`Object "${intent.objectName || 'any'}" not found`);
        return;
      }

      // Create and execute pick plan
      const plan = createPickPlan(robot, targetObject);
      executeActionPlan(plan, robot, setRobots, setObjects, () => {
        console.log(`Completed picking ${targetObject.name}`);
      });

      return;
    }

    // Handle drop action with action planner
    if (intent.type === "drop") {
      const robot = robots[0];

      if (!robot.holdingObjectId) {
        console.warn("Robot is not holding any object");
        return;
      }

      // Create and execute drop plan
      const plan = createDropPlan(robot);
      executeActionPlan(plan, robot, setRobots, setObjects, () => {
        console.log("Completed dropping object");
      });

      return;
    }

    setRobots((prev) =>
      prev.map((robot) => {
        if (intent.type === "reset") {
          return { ...robot, pose: JSON.parse(JSON.stringify(DEFAULT_POSE)) };
        }

        if (intent.type === "pose" && intent.side && intent.joint && intent.angle !== undefined) {
          const newPose = JSON.parse(JSON.stringify(robot.pose));
          const limit = JOINT_LIMITS[intent.joint];

          if (intent.joint === "shoulder" && intent.axis === "pitch") {
            const armKey = intent.side === "left" ? "leftArm" : "rightArm";
            newPose[armKey].shoulder.pitch = clamp(
              intent.angle,
              limit.pitch.min,
              limit.pitch.max
            );
          } else if (intent.joint === "elbow" && intent.axis === "flex") {
            const armKey = intent.side === "left" ? "leftArm" : "rightArm";
            newPose[armKey].elbow.flex = clamp(
              intent.angle,
              limit.flex.min,
              limit.flex.max
            );
          } else if (intent.joint === "hip" && intent.axis === "pitch") {
            const legKey = intent.side === "left" ? "leftLeg" : "rightLeg";
            newPose[legKey].hip.pitch = clamp(
              intent.angle,
              limit.pitch.min,
              limit.pitch.max
            );
          } else if (intent.joint === "knee" && intent.axis === "flex") {
            const legKey = intent.side === "left" ? "leftLeg" : "rightLeg";
            newPose[legKey].knee.flex = clamp(
              intent.angle,
              limit.flex.min,
              limit.flex.max
            );
          }

          return { ...robot, pose: newPose };
        }

        if (intent.type === "wave" && intent.side) {
          // Simple wave animation by toggling shoulder pitch
          const newPose = JSON.parse(JSON.stringify(robot.pose));
          const armKey = intent.side === "left" ? "leftArm" : "rightArm";
          const currentPitch = newPose[armKey].shoulder.pitch;
          newPose[armKey].shoulder.pitch = currentPitch > 45 ? 0 : 90;

          // Wave multiple times
          setTimeout(() => {
            setRobots((r) =>
              r.map((rb) => {
                const p = JSON.parse(JSON.stringify(rb.pose));
                const ak = intent.side === "left" ? "leftArm" : "rightArm";
                p[ak].shoulder.pitch = 0;
                return { ...rb, pose: p };
              })
            );
          }, 300);
          setTimeout(() => {
            setRobots((r) =>
              r.map((rb) => {
                const p = JSON.parse(JSON.stringify(rb.pose));
                const ak = intent.side === "left" ? "leftArm" : "rightArm";
                p[ak].shoulder.pitch = 90;
                return { ...rb, pose: p };
              })
            );
          }, 600);
          setTimeout(() => {
            setRobots((r) =>
              r.map((rb) => {
                const p = JSON.parse(JSON.stringify(rb.pose));
                const ak = intent.side === "left" ? "leftArm" : "rightArm";
                p[ak].shoulder.pitch = 0;
                return { ...rb, pose: p };
              })
            );
          }, 900);

          return { ...robot, pose: newPose };
        }

        return robot;
      })
    );
  };

  const handleCommand = async (text: string) => {
    // Try GPT parsing first, fallback to rule-based
    try {
      const intents = await parseCommandWithGPT(text);

      // Execute intents sequentially - wait for each to complete
      for (let i = 0; i < intents.length; i++) {
        const intent = intents[i];

        // For pick/drop actions, we need to wait for completion
        if (intent.type === "pick" || intent.type === "drop") {
          await new Promise<void>((resolve) => {
            // Wrap applyAction to capture completion
            const originalApplyAction = applyAction;

            // Temporarily override applyAction for this intent
            if (intent.type === "pick") {
              const robot = robots[0];
              if (robot.holdingObjectId) {
                console.warn("Robot is already holding an object");
                resolve();
                return;
              }

              const targetObject = intent.objectName
                ? findObjectByDescription(objects, intent.objectName)
                : objects.find(obj => !obj.isPicked);

              if (!targetObject) {
                console.warn(`Object "${intent.objectName || 'any'}" not found`);
                resolve();
                return;
              }

              const plan = createPickPlan(robot, targetObject);
              executeActionPlan(plan, robot, setRobots, setObjects, resolve);

            } else if (intent.type === "drop") {
              const robot = robots[0];
              if (!robot.holdingObjectId) {
                console.warn("Robot is not holding any object");
                resolve();
                return;
              }

              const plan = createDropPlan(robot);
              executeActionPlan(plan, robot, setRobots, setObjects, resolve);
            }
          });
        } else {
          // For other actions, execute normally
          applyAction(intent);
          // Small delay between non-action commands
          if (i < intents.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        setLogs((prev) => [...prev, intent]);
      }
    } catch (error) {
      console.error("GPT parsing failed, using rule-based parser:", error);
      const intent = parseCommand(text);
      applyAction(intent);
    }
  };

  return (
    <div className="h-screen flex">
      <div className="flex-1 bg-gray-100">
        <Scene robots={robots} objects={objects} />
      </div>
      <div className="w-96">
        <ChatPanel onCommand={handleCommand} logs={logs} />
      </div>
    </div>
  );
}
