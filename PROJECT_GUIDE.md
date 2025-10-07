# Physical AI Robot Simulator - 프로젝트 가이드

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [아키텍처 구조](#아키텍처-구조)
3. [핵심 파일 설명](#핵심-파일-설명)
4. [확장 방법](#확장-방법)
5. [학습 가이드](#학습-가이드)
6. [데이터 흐름](#데이터-흐름)

---

## 프로젝트 개요

### 기술 스택
- **프론트엔드**: React 18 + TypeScript + Vite
- **3D 렌더링**: Three.js + React Three Fiber (@react-three/fiber)
- **스타일링**: Tailwind CSS 3
- **AI**: OpenAI GPT-4o-mini (자연어 파싱)

### 주요 기능
1. **자연어 명령 처리**: "초록색 주워", "빨간색 내리고 파란색 들어" 같은 한국어/영어 명령
2. **3D 휴머노이드 로봇**: Three.js로 구현된 관절 기반 로봇
3. **물리 기반 모션**: 걷기, 앉기, 집기 등 자연스러운 동작
4. **다단계 액션 플래너**: 복잡한 동작을 작은 단계로 분해하여 실행

---

## 아키텍처 구조

```
src/
├── components/          # React 컴포넌트
│   ├── PhysicalAIMVP.tsx     ★ 메인 앱 (상태 관리)
│   ├── Scene.tsx             # 3D 씬 (로봇, 오브젝트, 조명)
│   ├── Humanoid.tsx          # 로봇 3D 모델
│   ├── ChatPanel.tsx         # 명령 입력 UI
│   └── PickableObject.tsx    # 줍기 가능한 오브젝트
│
├── lib/                 # 핵심 로직 라이브러리
│   ├── types.ts              ★ 모든 타입 정의
│   ├── openai.ts             # GPT API 파싱
│   ├── actionPlanner.ts      ★ 액션 플랜 생성
│   ├── actionExecutor.ts     ★ 액션 실행 엔진
│   ├── motion.ts             # 모션 라이브러리 (걷기, 앉기 등)
│   └── clamp.ts              # 관절 제한 (안전장치)
│
└── hooks/
    └── useIntentParser.ts    # 규칙 기반 파서 (폴백용)
```

### 데이터 흐름 (Data Flow)

```
1. 사용자 입력 (ChatPanel)
   "초록색 주워"
        ↓
2. GPT 파싱 (openai.ts)
   → Intent: { type: "pick", objectName: "green" }
        ↓
3. 액션 플래닝 (actionPlanner.ts)
   → 오브젝트 찾기 (findObjectByDescription)
   → ActionPlan 생성 (createPickPlan)
      [navigate → align → squat → reach → grasp → lift]
        ↓
4. 액션 실행 (actionExecutor.ts)
   → 각 단계를 순차적으로 실행
   → setRobots/setObjects로 상태 업데이트
        ↓
5. 화면 렌더링 (Scene.tsx, Humanoid.tsx)
   → Three.js가 로봇/오브젝트 렌더링
```

---

## 핵심 파일 설명

### 1. `src/lib/types.ts` ⭐ 가장 먼저 볼 것!

**목적**: 모든 데이터 구조 정의

```typescript
// 로봇의 관절 각도
interface FullPose {
  leftArm: { shoulder: { pitch }, elbow: { flex } }
  rightArm: { shoulder: { pitch }, elbow: { flex } }
  leftLeg: { hip: { pitch }, knee: { flex } }
  rightLeg: { hip: { pitch }, knee: { flex } }
}

// 로봇 전체 상태
interface Robot {
  id: string
  pose: FullPose           // 관절 각도
  position: Vector3        // 3D 위치
  rotation: number         // Y축 회전 (앞 방향)
  holdingObjectId: string | null  // 들고 있는 물건
}

// 액션 플랜 (다단계 동작)
interface ActionPlan {
  id: string
  steps: ActionStep[]      // 순차 실행할 단계들
}

interface ActionStep {
  type: "navigate" | "align" | "squat" | "reach" | "grasp" | "lift" | "drop"
  targetPosition?: Vector3
  targetRotation?: number
  objectId?: string
  duration?: number
}
```

**확장 포인트**:
- 새로운 관절 추가: `FullPose`에 추가 (예: `head`, `waist`)
- 새로운 액션 타입: `ActionStepType`에 추가 (예: `"throw"`, `"push"`)

---

### 2. `src/lib/motion.ts` ⭐ 모션 추가 시 수정

**목적**: 로봇의 모든 동작(포즈) 정의

```typescript
export const MOTIONS = {
  // 기본 서있는 자세
  idle: (): FullPose => ({
    leftArm: { shoulder: { pitch: 0 }, elbow: { flex: 0 } },
    rightArm: { shoulder: { pitch: 0 }, elbow: { flex: 0 } },
    leftLeg: { hip: { pitch: 0 }, knee: { flex: 0 } },
    rightLeg: { hip: { pitch: 0 }, knee: { flex: 0 } },
  }),

  // 걷기 사이클 (phase = 0~1)
  walkCycle: (phase: number): FullPose => {
    const legSwing = Math.sin(phase * Math.PI * 2) * 35;  // 다리 흔들기
    const legLift = Math.max(0, Math.sin(phase * Math.PI * 2)) * 45;  // 무릎 들기
    // ...
  },

  // 앉기 (물건 줍기용)
  squat: (): FullPose => ({ /* ... */ }),

  // 손 뻗기
  reachDown: (): FullPose => ({ /* ... */ }),

  // 물건 들고 있기
  holding: (): FullPose => ({ /* ... */ }),
}
```

**확장 방법 - 새 모션 추가**:
```typescript
// 예: 점프 동작 추가
jump: (phase: number): FullPose => ({
  leftArm: { shoulder: { pitch: -45 }, elbow: { flex: 0 } },  // 팔 뒤로
  rightArm: { shoulder: { pitch: -45 }, elbow: { flex: 0 } },
  leftLeg: { hip: { pitch: -20 }, knee: { flex: 30 } },  // 다리 살짝 굽히기
  rightLeg: { hip: { pitch: -20 }, knee: { flex: 30 } },
})
```

---

### 3. `src/lib/actionPlanner.ts` ⭐ 새 액션 추가 시 수정

**목적**: 의도(Intent)를 구체적인 실행 계획(ActionPlan)으로 변환

```typescript
// 예: "초록색 주워" 명령
export function createPickPlan(
  robot: Robot,
  targetObject: PickableObject
): ActionPlan {
  const steps: ActionStep[] = [];

  // 1단계: 물건까지 걸어가기
  if (distance > 0.5) {
    steps.push({
      type: "navigate",
      targetPosition: { x: obj.x, y: 0, z: obj.z },
      duration: distance * 500  // 거리에 비례
    });
  }

  // 2단계: 물건 쪽으로 몸 돌리기
  steps.push({
    type: "align",
    targetRotation: angleTo(robot, targetObject),
    duration: 300
  });

  // 3~6단계: 앉기 → 손 뻗기 → 잡기 → 일어서기
  steps.push({ type: "squat", duration: 500 });
  steps.push({ type: "reach", duration: 400 });
  steps.push({ type: "grasp", objectId: obj.id, duration: 100 });
  steps.push({ type: "lift", duration: 600 });

  return { id: `pick-${Date.now()}`, steps };
}
```

**확장 방법 - 새 액션 플랜 추가**:
```typescript
// 예: 물건 던지기
export function createThrowPlan(
  robot: Robot,
  targetPosition: Vector3
): ActionPlan {
  return {
    id: `throw-${Date.now()}`,
    steps: [
      { type: "align", targetRotation: angleTo(robot, targetPosition) },
      { type: "windUp", duration: 400 },      // 새 액션 타입!
      { type: "release", duration: 200 },     // 새 액션 타입!
      { type: "followThrough", duration: 300 } // 새 액션 타입!
    ]
  };
}
```

---

### 4. `src/lib/actionExecutor.ts` ⭐ 새 액션 타입 구현

**목적**: ActionStep을 실제로 실행 (애니메이션 + 상태 업데이트)

```typescript
export function executeActionStep(
  step: ActionStep,
  robot: Robot,
  setRobots: Function,
  setObjects: Function,
  onComplete: Function  // 완료 시 호출
) {
  switch (step.type) {
    case "navigate": {
      // 60fps로 위치를 부드럽게 보간
      const interval = setInterval(() => {
        const progress = (Date.now() - startTime) / duration;
        const newPos = lerpVec3(startPos, targetPos, progress);
        setRobots(/* 위치 업데이트 */);

        if (progress >= 1) {
          clearInterval(interval);
          onComplete();  // ⭐ 다음 단계로!
        }
      }, 16);  // 16ms = 60fps
      break;
    }

    case "squat": {
      // 앉는 동작 실행
      const interval = setInterval(() => {
        const newPose = lerpPose(startPose, MOTIONS.squat(), progress);
        const newY = startY - progress * 0.6;  // 몸 낮추기
        setRobots(/* 포즈, 위치 업데이트 */);

        if (progress >= 1) {
          clearInterval(interval);
          onComplete();
        }
      }, 16);
      break;
    }

    case "grasp": {
      // 물건 잡기 (즉시 실행)
      setObjects(obj => obj.isPicked = true);
      setRobots(r => r.holdingObjectId = objectId);
      setTimeout(onComplete, duration);
      break;
    }

    // ... 다른 액션들
  }
}
```

**확장 방법 - 새 액션 타입 구현**:
```typescript
case "windUp": {
  // 던지기 준비 동작
  const windUpPose = {
    leftArm: { shoulder: { pitch: -120 }, elbow: { flex: 90 } },
    rightArm: { shoulder: { pitch: -120 }, elbow: { flex: 90 } },
    // ...
  };

  const interval = setInterval(() => {
    const newPose = lerpPose(startPose, windUpPose, progress);
    setRobots(/* 업데이트 */);

    if (progress >= 1) {
      clearInterval(interval);
      onComplete();
    }
  }, 16);
  break;
}
```

---

### 5. `src/lib/openai.ts` - GPT 프롬프트 수정

**목적**: 자연어 → Intent 변환

```typescript
const systemPrompt = `
당신은 로봇 명령 파서입니다.

사용 가능한 오브젝트:
- "red box" (빨간색, 빨강)
- "blue ball" (파란색, 파랑)
- "green cylinder" (초록색, 초록)

명령 예시:
- "초록색 주워" → [{"type":"pick","objectName":"green"}]
- "빨간색 내리고 파란색 들어" → [{"type":"drop"},{"type":"pick","objectName":"blue"}]
`;
```

**확장 방법 - 새 명령 추가**:
```typescript
// 던지기 명령 추가
명령 예시:
- "빨간색 던져" → [{"type":"throw","objectName":"red"}]
- "앞으로 던져" → [{"type":"throw","direction":"forward"}]
```

---

### 6. `src/components/PhysicalAIMVP.tsx` - 메인 로직

**목적**: 상태 관리 + 명령 처리

```typescript
export default function PhysicalAIMVP() {
  // 상태
  const [robots, setRobots] = useState<Robot[]>([...]);
  const [objects, setObjects] = useState<PickableObject[]>([...]);
  const [logs, setLogs] = useState<Intent[]>([]);

  // 명령 처리
  const handleCommand = async (text: string) => {
    // 1. GPT로 파싱
    const intents = await parseCommandWithGPT(text);

    // 2. 순차 실행
    for (const intent of intents) {
      if (intent.type === "pick") {
        const targetObject = findObjectByDescription(objects, intent.objectName);
        const plan = createPickPlan(robots[0], targetObject);
        await executeActionPlan(plan, robots[0], setRobots, setObjects);
      }
      // ... 다른 intent 처리
    }
  };

  return (
    <div>
      <Scene robots={robots} objects={objects} />
      <ChatPanel onCommand={handleCommand} logs={logs} />
    </div>
  );
}
```

**확장 방법 - 새 Intent 타입 처리**:
```typescript
if (intent.type === "throw") {
  const plan = createThrowPlan(robots[0], intent.targetPosition);
  await executeActionPlan(plan, robots[0], setRobots, setObjects);
}
```

---

### 7. `src/components/Humanoid.tsx` - 로봇 3D 모델

**목적**: Three.js로 로봇 렌더링

```typescript
export default function Humanoid({ robot, heldObject }: Props) {
  // 관절 레퍼런스
  const leftShoulderRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  // ...

  // 매 프레임마다 관절 각도 업데이트
  useFrame(() => {
    if (leftShoulderRef.current) {
      leftShoulderRef.current.rotation.x =
        THREE.MathUtils.degToRad(-robot.pose.leftArm.shoulder.pitch);
    }
    // ... 다른 관절들
  });

  return (
    <group position={[robot.position.x, robot.position.y, robot.position.z]}>
      {/* 몸통 */}
      <mesh>
        <boxGeometry args={[0.8, 1.2, 0.4]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>

      {/* 왼팔 */}
      <group ref={leftShoulderRef} position={[-0.5, 0.4, 0]}>
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, 0.6, 16]} />
        </mesh>

        {/* 팔꿈치 */}
        <group ref={leftElbowRef} position={[0, -0.6, 0]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.07, 0.5, 16]} />
          </mesh>
        </group>
      </group>

      {/* ... 다른 부위들 */}
    </group>
  );
}
```

**확장 방법 - 새 관절 추가**:
```typescript
// 예: 머리 추가
const neckRef = useRef<THREE.Group>(null);
const headRef = useRef<THREE.Group>(null);

useFrame(() => {
  if (neckRef.current) {
    neckRef.current.rotation.y =
      THREE.MathUtils.degToRad(robot.pose.head.yaw);  // 좌우 회전
  }
});

// JSX
<group ref={neckRef} position={[0, 0.6, 0]}>
  <group ref={headRef}>
    <mesh>
      <sphereGeometry args={[0.3]} />
    </mesh>
  </group>
</group>
```

---

## 확장 방법

### 🎯 새로운 액션 추가 (예: 물건 던지기)

#### Step 1: 타입 정의 (`types.ts`)
```typescript
export type ActionStepType =
  | "navigate" | "align" | "squat" | "reach" | "grasp" | "lift" | "drop" | "stand"
  | "windUp" | "release" | "followThrough";  // ✅ 추가

export type IntentType =
  | "pose" | "wave" | "reset" | "pick" | "drop"
  | "throw";  // ✅ 추가

export interface Intent {
  type: IntentType;
  // ...
  throwTarget?: Vector3;  // ✅ 추가
}
```

#### Step 2: 모션 정의 (`motion.ts`)
```typescript
export const MOTIONS = {
  // ...
  windUp: (): FullPose => ({
    leftArm: { shoulder: { pitch: -120 }, elbow: { flex: 90 } },
    rightArm: { shoulder: { pitch: -120 }, elbow: { flex: 90 } },
    leftLeg: { hip: { pitch: 0 }, knee: { flex: 0 } },
    rightLeg: { hip: { pitch: 0 }, knee: { flex: 0 } },
  }),

  throwRelease: (): FullPose => ({
    leftArm: { shoulder: { pitch: 45 }, elbow: { flex: 0 } },
    rightArm: { shoulder: { pitch: 45 }, elbow: { flex: 0 } },
    // ...
  }),
}
```

#### Step 3: 플래너 구현 (`actionPlanner.ts`)
```typescript
export function createThrowPlan(
  robot: Robot,
  targetPosition: Vector3
): ActionPlan {
  const targetRotation = angleTo(robot.position, targetPosition);

  return {
    id: `throw-${Date.now()}`,
    steps: [
      { type: "align", targetRotation, duration: 300 },
      { type: "windUp", duration: 500 },
      { type: "release", duration: 200 },
      { type: "followThrough", duration: 300 },
    ],
  };
}
```

#### Step 4: 실행기 구현 (`actionExecutor.ts`)
```typescript
export function executeActionStep(...) {
  switch (step.type) {
    // ... 기존 케이스들

    case "windUp": {
      const startPose = robot.pose;
      const windUpPose = MOTIONS.windUp();

      const interval = setInterval(() => {
        const progress = Math.min((Date.now() - startTime) / duration, 1);
        const newPose = lerpPose(startPose, windUpPose, ease.easeInOut(progress));

        setRobots((prev) =>
          prev.map((r) => r.id === robot.id ? { ...r, pose: newPose } : r)
        );

        if (progress >= 1) {
          clearInterval(interval);
          onComplete();
        }
      }, 16);
      break;
    }

    case "release": {
      // 물리 엔진이 있다면 여기서 velocity 적용
      // 지금은 단순히 물건을 날림
      setObjects((prev) =>
        prev.map((obj) =>
          obj.id === robot.holdingObjectId
            ? { ...obj, isPicked: false, position: /* 계산된 위치 */ }
            : obj
        )
      );

      setRobots((prev) =>
        prev.map((r) => r.id === robot.id ? { ...r, holdingObjectId: null } : r)
      );

      setTimeout(onComplete, duration);
      break;
    }
  }
}
```

#### Step 5: GPT 프롬프트 업데이트 (`openai.ts`)
```typescript
const systemPrompt = `
...

Available commands:
- pick <object>
- drop
- throw <direction>  // ✅ 추가

Examples:
- "던져" → [{"type":"throw"}]
- "앞으로 던져" → [{"type":"throw","direction":"forward"}]
`;
```

#### Step 6: 메인 로직 통합 (`PhysicalAIMVP.tsx`)
```typescript
const handleCommand = async (text: string) => {
  const intents = await parseCommandWithGPT(text);

  for (const intent of intents) {
    // ... 기존 코드

    if (intent.type === "throw") {  // ✅ 추가
      const robot = robots[0];
      if (!robot.holdingObjectId) {
        console.warn("Nothing to throw");
        continue;
      }

      // 던질 방향 계산 (예: 로봇 앞쪽)
      const throwTarget = {
        x: robot.position.x,
        y: robot.position.y,
        z: robot.position.z - 3  // 앞으로 3 unit
      };

      const plan = createThrowPlan(robot, throwTarget);
      await new Promise<void>((resolve) => {
        executeActionPlan(plan, robot, setRobots, setObjects, resolve);
      });
    }
  }
};
```

---

### 🎯 새로운 오브젝트 추가

#### `PhysicalAIMVP.tsx`에서 초기 상태 수정:
```typescript
const [objects, setObjects] = useState<PickableObject[]>([
  // 기존 오브젝트들...

  // ✅ 새 오브젝트 추가
  {
    id: "obj-4",
    name: "yellow cube",
    type: "box",
    position: { x: -1, y: -1.5, z: -1 },
    color: "#fbbf24",
    size: 0.3,
    isPicked: false
  },
]);
```

#### `actionPlanner.ts`의 색상 맵 업데이트:
```typescript
const colorMap: { [key: string]: string[] } = {
  // 기존...
  "노란": ["yellow", "#fbbf24"],  // ✅ 추가
  "yellow": ["yellow", "#fbbf24"],
};
```

#### GPT 프롬프트 업데이트 (`openai.ts`):
```typescript
Available objects in scene:
- "red box" (빨간색)
- "blue ball" (파란색)
- "green cylinder" (초록색)
- "yellow cube" (노란색)  // ✅ 추가
```

---

### 🎯 새로운 관절 추가 (예: 허리 waist)

#### Step 1: 타입 정의 (`types.ts`)
```typescript
export interface FullPose {
  leftArm: ArmJointAngles;
  rightArm: ArmJointAngles;
  leftLeg: LegJointAngles;
  rightLeg: LegJointAngles;
  waist?: { pitch: number; yaw: number };  // ✅ 추가 (옵션)
}
```

#### Step 2: 관절 제한 (`clamp.ts`)
```typescript
export const JOINT_LIMITS = {
  // ...
  waist: {
    pitch: { min: -20, max: 20 },  // 앞/뒤 굽히기
    yaw: { min: -45, max: 45 },    // 좌/우 회전
  },
};
```

#### Step 3: 모든 모션에 waist 추가 (`motion.ts`)
```typescript
export const MOTIONS = {
  idle: (): FullPose => ({
    // ...
    waist: { pitch: 0, yaw: 0 },
  }),

  squat: (): FullPose => ({
    // ...
    waist: { pitch: 10, yaw: 0 },  // 약간 앞으로 숙임
  }),
};
```

#### Step 4: 3D 모델 업데이트 (`Humanoid.tsx`)
```typescript
const waistRef = useRef<THREE.Group>(null);

useFrame(() => {
  if (waistRef.current && robot.pose.waist) {
    waistRef.current.rotation.x = THREE.MathUtils.degToRad(robot.pose.waist.pitch);
    waistRef.current.rotation.y = THREE.MathUtils.degToRad(robot.pose.waist.yaw);
  }
});

return (
  <group position={[...]}>
    {/* 허리 그룹으로 상체 전체를 감싸기 */}
    <group ref={waistRef}>
      <mesh>{/* 몸통 */}</mesh>
      <group>{/* 왼팔 */}</group>
      <group>{/* 오른팔 */}</group>
    </group>

    {/* 다리는 허리 밖에 */}
    <group>{/* 왼다리 */}</group>
    <group>{/* 오른다리 */}</group>
  </group>
);
```

---

## 학습 가이드

### 📚 단계별 학습 로드맵

#### Level 1: 기초 이해 (1-2일)
1. **프로젝트 실행해보기**
   ```bash
   npm install
   npm run dev
   ```
   - "초록색 주워" 입력해서 동작 관찰
   - 브라우저 개발자 도구 (F12) → Console 탭에서 로그 확인

2. **타입부터 공부**
   - `src/lib/types.ts` 전체 읽기
   - 각 인터페이스가 무엇을 표현하는지 이해
   - **실습**: `Robot` 타입에 `speed: number` 필드 추가해보기

3. **데이터 흐름 따라가기**
   - ChatPanel에서 입력 → handleCommand → parseCommandWithGPT → applyAction
   - 각 함수에 `console.log()` 추가해서 데이터 확인

#### Level 2: 모션 시스템 (2-3일)
1. **motion.ts 분석**
   - `MOTIONS.idle()`, `MOTIONS.squat()` 각도 변경해보기
   - **실습**: 새로운 포즈 추가 (예: 만세 자세)
   ```typescript
   manse: (): FullPose => ({
     leftArm: { shoulder: { pitch: -180 }, elbow: { flex: 0 } },
     rightArm: { shoulder: { pitch: -180 }, elbow: { flex: 0 } },
     leftLeg: { hip: { pitch: 0 }, knee: { flex: 0 } },
     rightLeg: { hip: { pitch: 0 }, knee: { flex: 0 } },
   })
   ```

2. **보간(Interpolation) 이해**
   - `lerpPose()`, `lerpVec3()` 함수 원리 파악
   - **실습**: 커스텀 easing 함수 만들기
   ```typescript
   export const ease = {
     // ...
     bounce: (t: number) => {
       // 바운스 효과 구현
     }
   }
   ```

3. **Humanoid.tsx 3D 구조**
   - Three.js `group`, `mesh`, `geometry` 개념
   - **실습**: 로봇 색상 변경, 크기 조정

#### Level 3: 액션 시스템 (3-4일)
1. **actionPlanner.ts 분석**
   - `createPickPlan()` 각 단계 이해
   - **실습**: 기존 플랜 수정 (예: squat 빼고 직접 reach)

2. **actionExecutor.ts 실행 원리**
   - `setInterval` 기반 애니메이션 이해
   - `onComplete` 콜백 체인 분석
   - **실습**: 새로운 액션 타입 구현 (예: "wave")

3. **상태 관리 (React State)**
   - `setRobots`, `setObjects`가 어떻게 화면을 업데이트하는지
   - **실습**: 로봇 2대로 확장

#### Level 4: AI 통합 (2-3일)
1. **openai.ts GPT 파싱**
   - System Prompt 구조 분석
   - Few-shot Learning 예제들 이해
   - **실습**: 새로운 명령어 추가 (예: "뛰어")

2. **다중 명령 시퀀스**
   - `handleCommand`의 `for` 루프와 `await` 이해
   - **실습**: 3단계 명령 테스트 (예: "A 주워 B 주워 C 주워")

3. **에러 처리**
   - 물건이 없을 때, 이미 들고 있을 때 처리
   - **실습**: 더 나은 에러 메시지 추가

#### Level 5: 고급 기능 (5+ 일)
1. **물리 엔진 통합**
   - [Rapier](https://rapier.rs/) 또는 [Cannon.js](https://github.com/pmndrs/use-cannon) 연구
   - 실제 충돌, 중력 구현

2. **역운동학 (IK)**
   - 손 위치를 목표로 관절 각도 자동 계산
   - [FABRIK 알고리즘](https://en.wikipedia.org/wiki/FABRIK) 공부

3. **RL 데이터 수집**
   - 각 action의 (state, action, reward) 기록
   - JSON 파일로 export

4. **Behavior Cloning**
   - 수집한 데이터로 policy network 학습
   - PyTorch/TensorFlow 연동

---

### 🔍 디버깅 팁

#### 1. 관절 각도 확인
```typescript
// Humanoid.tsx
useFrame(() => {
  console.log("Left shoulder pitch:", robot.pose.leftArm.shoulder.pitch);
});
```

#### 2. 액션 플랜 로깅
```typescript
// PhysicalAIMVP.tsx
const plan = createPickPlan(robot, targetObject);
console.log("Generated plan:", JSON.stringify(plan, null, 2));
```

#### 3. 프레임별 위치 추적
```typescript
// actionExecutor.ts - navigate 케이스
setRobots((prevRobots) => {
  const newPos = lerpVec3(startPos, targetPos, easedProgress);
  console.log(`Frame: ${Date.now()}, Position:`, newPos);
  // ...
});
```

#### 4. React DevTools
- Chrome Extension "React Developer Tools" 설치
- Components 탭에서 `PhysicalAIMVP` 선택
- `robots`, `objects` 상태 실시간 확인

---

### 📖 추천 학습 자료

#### Three.js / React Three Fiber
- [React Three Fiber 공식 문서](https://docs.pmnd.rs/react-three-fiber)
- [Three.js Journey](https://threejs-journey.com/) (유료지만 최고)
- [Discover Three.js](https://discoverthreejs.com/) (무료)

#### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/) (무료)

#### 로봇 공학 기초
- [Modern Robotics](http://hades.mech.northwestern.edu/index.php/Modern_Robotics) (무료 교재)
- [Kinematics](https://www.youtube.com/watch?v=cKyGG7_53lY) - YouTube 강의

#### Reinforcement Learning
- [Spinning Up in Deep RL](https://spinningup.openai.com/) (OpenAI 공식)
- [Deep RL Course](https://huggingface.co/learn/deep-rl-course/unit0/introduction) (Hugging Face)

---

### 🎓 실습 과제

#### 과제 1: 새로운 포즈 추가 (난이도: ⭐)
"앉아" 명령으로 바닥에 앉는 동작 구현
- `MOTIONS.sit()` 정의
- GPT 프롬프트 업데이트
- `applyAction`에서 처리

#### 과제 2: 로봇 속도 조절 (난이도: ⭐⭐)
로봇이 빠르게/느리게 움직이도록
- `Robot` 타입에 `speed` 추가
- `navigate` 단계에서 `duration` 계산 시 반영
- "빠르게 가", "천천히 가" 명령 지원

#### 과제 3: 물건 색상 변경 (난이도: ⭐⭐)
"빨간색을 파란색으로 바꿔" 같은 명령
- 새로운 Intent 타입 `"changeColor"` 추가
- GPT 파싱 업데이트
- `setObjects`로 색상 변경

#### 과제 4: 장애물 회피 (난이도: ⭐⭐⭐⭐)
로봇이 물건을 피해서 이동
- A* 또는 RRT 경로 계획 알고리즘
- `navigate` 단계를 여러 waypoint로 분할

#### 과제 5: 두 손으로 들기 (난이도: ⭐⭐⭐⭐⭐)
큰 물건을 양손으로 들기
- `PickableObject`에 `size` 고려
- 새로운 `twoHandGrasp` 모션
- IK로 양 손 위치 계산

---

## 자주 묻는 질문 (FAQ)

### Q: 로봇이 너무 빨리/느리게 움직여요
**A**: `actionPlanner.ts`와 `actionExecutor.ts`에서 `duration` 값을 조정하세요.
```typescript
// actionPlanner.ts
steps.push({ type: "squat", duration: 1000 });  // 500 → 1000 (느리게)
```

### Q: 관절이 이상하게 꺾여요
**A**: `clamp.ts`의 `JOINT_LIMITS` 확인. 범위를 벗어난 각도가 들어가고 있는지 체크.
```typescript
// motion.ts에서 실수로 범위 벗어난 각도
rightArm: { shoulder: { pitch: 200 } }  // ❌ max는 180
```

### Q: GPT가 명령을 잘못 이해해요
**A**: `openai.ts`의 프롬프트에 더 많은 예시 추가. Few-shot learning 개선.

### Q: 여러 로봇을 동시에 제어하고 싶어요
**A**: `PhysicalAIMVP.tsx`에서 `robots` 배열 확장. `handleCommand`에서 어떤 로봇인지 지정.
```typescript
const intents = await parseCommandWithGPT(text);
// "로봇1, 빨간색 주워" → {"robotId": "robot-1", "type": "pick", ...}
```

### Q: 물건을 쌓고 싶어요 (스태킹)
**A**: 물리 엔진 필요. Rapier 또는 Cannon.js 통합 후 구현 가능.

---

## 다음 단계 (Phase 2+)

### Phase 2: 고급 내비게이션
- A* 경로 계획
- 장애물 감지 및 회피
- 동적 환경 대응

### Phase 3: LLM 플래닝
- GPT가 직접 ActionPlan 생성
- "테이블을 정리해" → 여러 물건을 순서대로 정리

### Phase 4: 데이터 수집
- 모든 액션을 (state, action, next_state, reward) 형태로 기록
- CSV/JSON export
- 시각화 대시보드

### Phase 5: Behavior Cloning
- PyTorch/TensorFlow policy network
- 수집한 데이터로 supervised learning
- 모델 추론 → 로봇 제어

### Phase 6: Reinforcement Learning
- 환경 보상 함수 설계
- PPO/SAC 알고리즘 구현
- 시뮬레이션에서 학습 → 실전 적용

---

## 마치며

이 프로젝트는 **Physical AI**의 기초입니다. 핵심은:

1. **모듈화**: 각 파일이 명확한 역할 (타입, 모션, 플래너, 실행기)
2. **상태 기계**: 복잡한 동작을 작은 단계로 분해
3. **데이터 흐름**: Intent → ActionPlan → Execution → State Update

**학습 순서**:
1. types.ts 이해 → 전체 구조 파악
2. motion.ts 수정 → 즉각적인 시각적 피드백
3. actionPlanner/Executor → 시스템의 핵심
4. GPT 통합 → AI 파워 활용

**막히면**:
- Console.log로 중간값 확인
- React DevTools로 상태 추적
- 한 번에 하나씩 변경하고 테스트

**화이팅! 🚀**
