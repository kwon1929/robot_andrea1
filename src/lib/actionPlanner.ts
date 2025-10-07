/**
 * ============================================
 * ACTION PLANNER (액션 플래너)
 * ============================================
 *
 * 역할: 사용자의 의도(Intent)를 구체적인 실행 계획(ActionPlan)으로 변환
 *
 * 예: "초록색 주워"
 *   → findObjectByDescription("green")
 *   → createPickPlan(robot, greenObject)
 *   → ActionPlan { steps: [navigate, align, squat, reach, grasp, lift] }
 *
 * 확장 방법:
 * 1. 새 액션 추가: createThrowPlan(), createPushPlan() 등의 함수 추가
 * 2. 새 오브젝트 색상: colorMap에 항목 추가
 * 3. 복잡한 플랜: 여러 단계를 조합 (예: 물건 쌓기 = pick + navigate + drop)
 */

import type { Robot, PickableObject, ActionPlan, ActionStep, Vector3 } from "./types";

// 두 3D 점 사이의 거리 계산 (피타고라스 정리)
function distance(p1: Vector3, p2: Vector3): number {
  return Math.sqrt(
    Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2) + Math.pow(p2.z - p1.z, 2)
  );
}

// 목표를 향해 돌아야 할 각도 계산 (degrees, Y축 회전)
// 예: 로봇이 (0,0,0)에서 물건(1,0,0)을 보려면 90도 회전
function angleTo(from: Vector3, to: Vector3): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return (Math.atan2(dx, -dz) * 180) / Math.PI;
}

/**
 * 색상, 이름, 형태로 오브젝트 찾기
 *
 * @param objects - 씬의 모든 오브젝트
 * @param description - 검색어 (예: "빨간색", "red", "box")
 * @returns 찾은 오브젝트 또는 null
 *
 * 확장 예시:
 * - 거리순 정렬 추가
 * - 크기로 필터링
 * - 여러 개 찾아서 배열로 반환
 */
export function findObjectByDescription(
  objects: PickableObject[],
  description: string
): PickableObject | null {
  const desc = description.toLowerCase();

  // 1단계: 이름으로 찾기 (예: "red box", "blue ball")
  let found = objects.find((obj) => !obj.isPicked && obj.name.toLowerCase().includes(desc));
  if (found) return found;

  // 2단계: 색상 키워드로 찾기
  // ✅ 여기에 새 색상 추가! (예: "노란": ["yellow", "#fbbf24"])
  const colorMap: { [key: string]: string[] } = {
    "빨간": ["red", "#ef4444"],
    "red": ["red", "#ef4444"],
    "파란": ["blue", "#3b82f6"],
    "blue": ["blue", "#3b82f6"],
    "초록": ["green", "#10b981"],
    "green": ["green", "#10b981"],
  };

  for (const [keyword, colors] of Object.entries(colorMap)) {
    if (desc.includes(keyword)) {
      found = objects.find((obj) => !obj.isPicked && colors.some((c) => obj.color.includes(c) || obj.name.includes(c)));
      if (found) return found;
    }
  }

  // 3단계: 형태로 찾기
  // ✅ 새 형태 추가 시 여기에 케이스 추가
  if (desc.includes("상자") || desc.includes("box") || desc.includes("cube")) {
    found = objects.find((obj) => !obj.isPicked && obj.type === "box");
    if (found) return found;
  }
  if (desc.includes("공") || desc.includes("ball") || desc.includes("sphere")) {
    found = objects.find((obj) => !obj.isPicked && obj.type === "sphere");
    if (found) return found;
  }
  if (desc.includes("실린더") || desc.includes("cylinder")) {
    found = objects.find((obj) => !obj.isPicked && obj.type === "cylinder");
    if (found) return found;
  }

  return null;  // 못 찾음
}

/**
 * "줍기" 액션 플랜 생성
 *
 * 단계:
 * 1. navigate: 물건까지 걸어가기 (0.5 unit 이상 떨어져있을 때만)
 * 2. align: 물건 쪽으로 몸 돌리기
 * 3. squat: 무릎 굽혀 앉기 + 상체 내리기
 * 4. reach: 팔 뻗어서 손 내리기
 * 5. grasp: 물건 잡기 (holdingObjectId 설정, isPicked = true)
 * 6. lift: 일어서기 + 상체 올리기
 *
 * ✅ 확장 예시:
 * - 큰 물건은 양손으로: twoHandGrasp 단계 추가
 * - 높은 곳 물건: climb 단계 추가
 * - 멀리 있는 물건: 더 복잡한 pathfinding
 */
export function createPickPlan(
  robot: Robot,
  targetObject: PickableObject
): ActionPlan {
  const targetPos = { ...targetObject.position, y: 0 }; // 지면 높이로 통일
  const dist = distance(robot.position, targetPos);
  const needsNavigation = dist > 0.5; // 0.5 unit 이상이면 걸어감

  const steps: ActionStep[] = [];

  if (needsNavigation) {
    // 1단계: 걸어가기
    // ✅ duration 조정: dist * 500 → 더 빠르게/느리게
    steps.push({
      type: "navigate",
      targetPosition: targetPos,
      duration: dist * 500, // 거리 1 unit당 500ms
    });
  }

  // 2단계: 물건 쪽으로 회전
  const targetRotation = angleTo(robot.position, targetPos);
  steps.push({
    type: "align",
    targetRotation,
    duration: 300,  // ✅ 더 빠른 회전: 300 → 150
  });

  // 3단계: 앉기 (무릎 굽히기 + 몸 낮추기)
  steps.push({
    type: "squat",
    duration: 500,  // ✅ 더 천천히: 500 → 800
  });

  // 4단계: 팔 뻗기
  steps.push({
    type: "reach",
    duration: 400,
  });

  // 5단계: 잡기
  steps.push({
    type: "grasp",
    objectId: targetObject.id,
    duration: 100,
  });

  // 6단계: 일어서기
  steps.push({
    type: "lift",
    duration: 600,
  });

  return {
    id: `pick-${targetObject.id}-${Date.now()}`,
    steps,
    targetObjectName: targetObject.name,
    targetObjectColor: targetObject.color,
  };
}

/**
 * "내려놓기" 액션 플랜 생성
 *
 * 단계:
 * 1. squat: 앉기
 * 2. drop: 물건 놓기 (holdingObjectId = null, isPicked = false)
 * 3. stand: 일어서기
 *
 * ✅ 확장 예시:
 * - 특정 위치에 놓기: navigate 단계 먼저 추가
 * - 쌓기: place 단계에서 Y 좌표 계산
 */
export function createDropPlan(robot: Robot): ActionPlan {
  const steps: ActionStep[] = [];

  steps.push({
    type: "squat",
    duration: 500,
  });

  steps.push({
    type: "drop",
    duration: 100,
  });

  steps.push({
    type: "stand",
    duration: 600,
  });

  return {
    id: `drop-${Date.now()}`,
    steps,
  };
}

/**
 * ✅ 새 액션 추가 예시: 던지기
 *
 * export function createThrowPlan(
 *   robot: Robot,
 *   targetPosition: Vector3
 * ): ActionPlan {
 *   const targetRotation = angleTo(robot.position, targetPosition);
 *
 *   return {
 *     id: `throw-${Date.now()}`,
 *     steps: [
 *       { type: "align", targetRotation, duration: 300 },
 *       { type: "windUp", duration: 500 },     // 새 액션 타입!
 *       { type: "release", duration: 200 },    // 새 액션 타입!
 *       { type: "followThrough", duration: 300 },
 *     ],
 *   };
 * }
 */
