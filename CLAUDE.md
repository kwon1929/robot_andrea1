# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Physical AI Robot Simulator - 3D humanoid robot controlled via natural language commands. Built with React + TypeScript + Vite, Three.js (React Three Fiber), and OpenAI GPT-4o-mini for natural language parsing.

**Key Features:**
- Natural language command processing (Korean/English): "초록색 주워", "pick up the green one"
- 3D humanoid robot with joint-based articulation
- Physics-based motion system (walking, squatting, reaching, grasping)
- Multi-step action planner that decomposes complex motions into atomic steps

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server with HMR
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm preview
```

## Environment Setup

Create `.env` file with:
```
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

## Architecture

### Data Flow
```
User Input (ChatPanel)
  → GPT Parsing (openai.ts) → Intent
  → Action Planning (actionPlanner.ts) → ActionPlan (multi-step)
  → Action Execution (actionExecutor.ts) → State Updates
  → 3D Rendering (Scene.tsx, Humanoid.tsx)
```

### Core Files Structure

**`src/lib/types.ts`** - ALL type definitions. Start here first.
- `Robot`: Full robot state (pose, position, rotation, holdingObjectId)
- `FullPose`: Joint angles for all limbs (shoulders, elbows, hips, knees)
- `ActionPlan`: Multi-step action sequence
- `ActionStep`: Atomic actions (navigate, align, squat, reach, grasp, lift, drop)
- `Intent`: Parsed user command
- `PickableObject`: Objects in the scene

**`src/lib/motion.ts`** - Motion library defining all robot poses
- `MOTIONS.idle()`: Default standing pose
- `MOTIONS.walkCycle(phase)`: Walking animation (phase 0-1)
- `MOTIONS.squat()`: Squatting pose (for picking)
- `MOTIONS.reachDown()`: Reaching down pose
- `MOTIONS.holding()`: Holding object pose
- Add new motions here when extending robot capabilities

**`src/lib/actionPlanner.ts`** - Converts Intents into ActionPlans
- `createPickPlan()`: Generates pick-up sequence (navigate → align → squat → reach → grasp → lift)
- `createDropPlan()`: Generates drop sequence (squat → release → stand)
- `findObjectByDescription()`: Maps color/name to PickableObject
- Add new plan creators here for new action types

**`src/lib/actionExecutor.ts`** - Executes ActionSteps with smooth animations
- `executeActionStep()`: 60fps interpolation for each step type
- `executeActionPlan()`: Chains steps sequentially via onComplete callbacks
- Uses setInterval at 16ms (60fps) for smooth motion
- Implement new step types here when adding actions

**`src/lib/openai.ts`** - GPT-based natural language parser
- System prompt with few-shot examples
- Parses commands into Intent[] array
- Update prompt here when adding new commands/objects

**`src/lib/clamp.ts`** - Joint angle limits for safety
- `JOINT_LIMITS`: Min/max angles for each joint
- `clampPose()`: Enforces limits
- Update limits when adding new joints

**`src/components/PhysicalAIMVP.tsx`** - Main application component
- State management: robots, objects, logs
- `handleCommand()`: Orchestrates parsing → planning → execution
- Initial scene setup (robot positions, available objects)

**`src/components/Humanoid.tsx`** - 3D robot model
- Three.js mesh hierarchy (torso → limbs → joints)
- `useFrame()`: Updates joint rotations every frame from Robot.pose
- Add new limb geometry here when extending robot body

**`src/components/Scene.tsx`** - 3D scene setup
- Lighting, camera, ground plane
- Renders all robots and objects

**`src/components/ChatPanel.tsx`** - Command input UI
- Text input for natural language commands
- Displays command history/logs

**`src/components/PickableObject.tsx`** - Interactive 3D objects
- Supports box, sphere, cylinder geometries
- `isPicked` state controls visibility/attachment to robot

## Adding New Features

### Adding New Actions (e.g., "throw")
1. Add action types to `ActionStepType` in `types.ts`
2. Define motion poses in `motion.ts` (e.g., `windUp`, `throwRelease`)
3. Create planner in `actionPlanner.ts` (e.g., `createThrowPlan()`)
4. Implement execution in `actionExecutor.ts` (switch case for each step)
5. Update GPT prompt in `openai.ts` with examples
6. Handle new intent type in `PhysicalAIMVP.tsx` handleCommand()

### Adding New Objects
1. Add to initial state in `PhysicalAIMVP.tsx` objects array
2. Update color map in `actionPlanner.ts` findObjectByDescription()
3. Update GPT prompt in `openai.ts` with new object descriptions

### Adding New Joints (e.g., waist, head)
1. Extend `FullPose` interface in `types.ts`
2. Add joint limits to `JOINT_LIMITS` in `clamp.ts`
3. Update all motion definitions in `motion.ts` to include new joint
4. Add mesh/group hierarchy in `Humanoid.tsx` with ref
5. Update `useFrame()` in `Humanoid.tsx` to apply joint angles

## Key Concepts

**Interpolation/Lerping**: Smooth transitions between poses/positions using linear interpolation with easing functions (`ease.easeInOut`, etc.)

**Sequential Execution**: ActionPlans execute steps one by one. Each step calls `onComplete()` callback when done, triggering next step.

**State Management**: React state (`setRobots`, `setObjects`) drives all updates. Changes propagate to 3D rendering automatically.

**Joint Hierarchy**: Three.js groups create parent-child relationships. Rotating shoulder group affects entire arm below it.

## Common Patterns

**Modifying Robot State:**
```typescript
setRobots(prev => prev.map(r =>
  r.id === targetId ? { ...r, pose: newPose } : r
))
```

**Chaining Actions:**
```typescript
await new Promise<void>(resolve => {
  executeActionPlan(plan, robot, setRobots, setObjects, resolve);
});
```

**Angle Conversions:**
- Internal representation: degrees
- Three.js requires: radians (use `THREE.MathUtils.degToRad()`)

## Debugging Tips

- Use browser DevTools console for logs
- Add `console.log()` to trace data flow through parser → planner → executor
- React DevTools to inspect component state
- Check `JOINT_LIMITS` if robot looks broken (angles exceeding limits)
- Verify `duration` values if motions too fast/slow

## Tech Stack Notes

- **Vite**: Fast dev server, HMR enabled
- **Three.js**: All angles in radians for rendering
- **React 19**: Using concurrent features
- **TypeScript**: Strict mode enabled (see tsconfig.json)
- **Tailwind CSS**: Utility-first styling
- **OpenAI SDK**: GPT-4o-mini for cost-efficient parsing
