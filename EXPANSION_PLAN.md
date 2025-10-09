# ANDREA Kernel I - 확장 개선 플랜

## 현재 상태 분석

### 완료된 기능 ✅
- 기본 휴머노이드 3D 모델 (몸통, 머리, 팔, 다리)
- 자연어 명령 파싱 (한국어/영어, GPT-4o-mini)
- 기본 동작: 걷기, 회전, 앉기, 물건 줍기/내려놓기
- 다단계 명령 처리 ("빨간색 내려놓고 파란색 들어")
- 5가지 물체 인식 (빨강, 파랑, 초록, 노랑, 보라)

### 주요 문제점 🔴
1. **행동이 부자연스러움** (가장 큰 문제)
   - 로봇 동작이 로봇같고 경직됨
   - 관절 움직임이 기계적
   - 무게 중심 이동이 없음

2. **손이 없음**
   - 팔 끝이 박스로 끝남
   - 손가락 표현 불가
   - 물건을 "잡는" 느낌이 없음

3. **제한적인 동작**
   - pick/drop만 가능
   - 던지기, 밀기, 쌓기 등 불가

---

## 📋 단계별 확장 플랜

---

## PHASE 1: 자연스러운 동작 개선 🎯 **최우선**

### 1.1 관절 부드러움 개선
**목표**: 로봇이 아닌 사람처럼 움직이기

**기술적 접근**:
- [ ] **Ease 함수 다양화** (`motion.ts`)
  - 현재: easeInOut만 사용
  - 추가: easeOutBack, easeOutElastic (탄성 효과)
  - 각 동작별 맞춤 easing 적용

- [ ] **관절 체인 애니메이션**
  - 현재: 모든 관절 동시 움직임
  - 개선: 어깨→팔꿈치→손목 순차 움직임 (100-200ms 딜레이)
  - 예: 손 뻗을 때 어깨가 먼저 움직이고 팔꿈치가 따라감

**구현 파일**:
- `src/lib/motion.ts` - 새로운 ease 함수 추가
- `src/lib/actionExecutor.ts` - 관절별 타이밍 오프셋

**예상 효과**: 움직임이 30-40% 더 자연스러워짐

---

### 1.2 무게 중심 이동 시뮬레이션
**목표**: 물건을 들 때 몸이 균형을 맞추는 모습

**기술적 접근**:
- [ ] **물건 무게에 따른 반동**
  - 무거운 물건: 몸이 약간 뒤로 기울어짐
  - 가벼운 물건: 자연스럽게 들어올림
  - `PickableObject.size` 기반 무게 계산

- [ ] **앉을 때 몸 앞으로 숙이기**
  - 현재: 수직으로 앉음 (부자연스러움)
  - 개선: 엉덩이를 뒤로 빼면서 상체 앞으로 (실제 사람처럼)
  - 새 pose: `MOTIONS.squatPrep()` - 준비 자세

- [ ] **걸을 때 몸 흔들림**
  - 좌우 체중 이동 (팔 스윙과 반대 방향)
  - 상체 약간 전진 자세

**구현 파일**:
- `src/lib/motion.ts` - 새 포즈 추가
- `src/lib/actionExecutor.ts` - squat, reach 동작 수정
- `src/components/Humanoid.tsx` - 몸통 회전 추가

**예상 효과**: 사람 같은 느낌 60% 개선

---

### 1.3 관절 제약 개선
**목표**: 해부학적으로 올바른 움직임

**기술적 접근**:
- [ ] **현재 제약 검토** (`clamp.ts`)
  - shoulder pitch: -90 ~ 180도 (과도하게 넓음)
  - 실제 인체: -45 ~ 170도 정도

- [ ] **새 제약 추가**
  - shoulder roll (좌우 회전)
  - hip roll (다리 벌리기)
  - 척추 굽힘

**구현 파일**:
- `src/lib/clamp.ts` - JOINT_LIMITS 업데이트
- `src/lib/types.ts` - FullPose에 roll 추가

---

## PHASE 2: 손 추가 ✋

### 2.1 기본 손 모델
**목표**: 박스 대신 손 모양 추가

**기술적 접근**:
- [ ] **간단한 손 (5개 손가락)**
  ```typescript
  // Humanoid.tsx에 추가
  <group ref={leftHandRef} position={[0, -0.42, 0]}>
    {/* 손바닥 */}
    <mesh>
      <boxGeometry args={[0.08, 0.02, 0.1]} />
    </mesh>
    {/* 5개 손가락 (간단한 캡슐) */}
    {[0, 1, 2, 3, 4].map(i => (
      <mesh key={i} position={[...]}>
        <capsuleGeometry args={[0.008, 0.03]} />
      </mesh>
    ))}
  </group>
  ```

- [ ] **손가락 애니메이션 (옵션)**
  - 상태: 펴진 손 vs 쥔 손
  - `FingerPose`: { thumb, index, middle, ring, pinky }
  - 물건 잡을 때만 손가락 오므리기

**구현 파일**:
- `src/components/Humanoid.tsx` - 손 추가
- `src/lib/types.ts` - HandPose 타입 추가 (옵션)
- `src/lib/motion.ts` - openHand(), closedHand() 포즈

**예상 작업시간**: 2-3시간

---

### 2.2 잡기 애니메이션 개선
**목표**: 손으로 물건을 "진짜" 잡는 느낌

**기술적 접근**:
- [ ] **손 위치 정확도**
  - 현재: 물건이 공중에 따라옴
  - 개선: 손 위치 계산 → 물건이 손 안에 위치

- [ ] **잡기 단계 세분화**
  - reach → **preGrasp** (손 열기) → grasp (손 닫기) → lift
  - 각 100ms씩 딜레이

**구현 파일**:
- `src/lib/actionPlanner.ts` - createPickPlan 수정
- `src/lib/actionExecutor.ts` - preGrasp 스텝 추가

---

## PHASE 3: 새로운 동작 추가 🎬

### 3.1 물건 던지기
**목표**: "빨간색 던져" 명령 지원

**기술적 접근**:
- [ ] **새 ActionStepType 추가**
  ```typescript
  type ActionStepType = ... | "windUp" | "throw" | "followThrough";
  ```

- [ ] **던지기 플랜**
  ```typescript
  export function createThrowPlan(robot, direction) {
    return {
      steps: [
        { type: "align", targetRotation: direction },
        { type: "windUp", duration: 400 },      // 팔 뒤로
        { type: "throw", duration: 200 },       // 던지기
        { type: "followThrough", duration: 300 }, // 팔 앞으로
      ]
    };
  }
  ```

- [ ] **물리 시뮬레이션 (간단)**
  - 물건에 velocity 부여
  - 포물선 궤적 계산 (간단한 중력)

**구현 파일**:
- `src/lib/types.ts` - ActionStepType 확장
- `src/lib/actionPlanner.ts` - createThrowPlan
- `src/lib/actionExecutor.ts` - throw 케이스
- `src/lib/motion.ts` - windUp, throw 포즈
- `src/lib/openai.ts` - GPT 프롬프트 업데이트

---

### 3.2 물건 쌓기
**목표**: "빨간색 위에 파란색 올려놔"

**기술적 접근**:
- [ ] **높이 계산**
  - 아래 물건 위치 + 높이
  - 위 물건 중심 = 아래 물건 중심 + (h1 + h2) / 2

- [ ] **정확도 개선**
  - 물건 위에 손 정확히 위치
  - 천천히 내려놓기 (controlled drop)

**구현 파일**:
- `src/lib/actionPlanner.ts` - createStackPlan
- `src/lib/actionExecutor.ts` - 높이 기반 drop

---

### 3.3 제스처 추가
**목표**: 더 다양한 커뮤니케이션

**동작 아이디어**:
- [ ] 👍 엄지척 (thumbsUp)
- [ ] 🙅 고개 흔들기 (headShake) - 현재 목 조인트 없음
- [ ] 👏 박수 (clap)
- [ ] 🤝 악수 (handshake)

**구현**:
- `src/lib/motion.ts` - 각 제스처 포즈
- 간단한 반복 애니메이션 (wave처럼)

---

## PHASE 4: 시각적 개선 🎨

### 4.1 모션 블러 효과
**목표**: 빠른 동작 시 잔상 효과

**기술적 접근**:
- Three.js EffectComposer 사용
- MotionBlurPass 추가 (빠른 동작 시에만)

---

### 4.2 발자국 표시
**목표**: 걸어간 경로 시각화

**기술적 접근**:
- 걸을 때 바닥에 발자국 데칼 추가
- 시간이 지나면 페이드아웃

---

### 4.3 눈 추가
**목표**: 더 생동감 있는 로봇

**기술적 접근**:
- 바이저 안에 간단한 LED 눈
- 깜빡임 애니메이션 (1-2초 간격)
- 물건 보는 방향으로 눈 이동

---

## PHASE 5: 지능 개선 🧠

### 5.1 경로 계획
**목표**: 장애물 피해서 이동

**기술적 접근**:
- 간단한 A* 알고리즘
- 그리드 기반 경로 찾기
- 물체를 장애물로 인식

---

### 5.2 맥락 이해
**목표**: "저거 주워" → 가장 가까운 물건

**기술적 접근**:
- GPT에 현재 장면 상태 전달
- 거리 기반 추론
- 최근 대화 기억 (세션 메모리)

---

### 5.3 실패 처리
**목표**: "물건을 못 찾겠어요" 같은 피드백

**기술적 접근**:
- 각 단계 검증
- 실패 시 사용자에게 메시지
- 대안 제시 ("파란색이 2개 있어요. 어느 걸 들까요?")

---

## 우선순위 요약 📊

### 🔥 즉시 (1-2주)
1. **관절 부드러움 개선** (PHASE 1.1)
   - 가장 큰 효과, 상대적으로 쉬움
   - 예상 시간: 3-4일

2. **무게 중심 이동** (PHASE 1.2)
   - 자연스러움 대폭 개선
   - 예상 시간: 4-5일

3. **손 모델 추가** (PHASE 2.1)
   - 시각적 완성도 큰 개선
   - 예상 시간: 2-3일

### 🎯 중기 (1개월)
4. **잡기 애니메이션 개선** (PHASE 2.2)
5. **던지기 구현** (PHASE 3.1)
6. **관절 제약 개선** (PHASE 1.3)

### 🌟 장기 (2-3개월)
7. 물건 쌓기 (PHASE 3.2)
8. 시각적 개선 (PHASE 4)
9. 지능 개선 (PHASE 5)

---

## 기술적 고려사항 ⚙️

### 성능 최적화
- 현재: 물리 엔진 제거됨 (좋음)
- 주의: 복잡한 애니메이션 추가 시 60fps 유지 필요
- 해결: requestAnimationFrame 대신 Web Worker 고려 (장기)

### 코드 구조
- 현재 구조: 명확하고 잘 분리됨 ✅
- 추가 필요:
  - `src/lib/physics.ts` - 간단한 물리 (던지기용)
  - `src/lib/inverse-kinematics.ts` - IK (손 위치 계산)

### 의존성 추가 가능성
- **IK 라이브러리**: fullik.js (손 정확도)
- **애니메이션**: gsap (더 부드러운 트윈)
- 현재는 필요 없음, 나중에 고려

---

## 측정 지표 📈

### 현재 상태 (베이스라인)
- 자연스러움: 3/10
- 기능성: 5/10
- 시각적 완성도: 6/10

### PHASE 1 완료 후 목표
- 자연스러움: 7/10 ⬆️ +4
- 기능성: 5/10
- 시각적 완성도: 6/10

### PHASE 2 완료 후 목표
- 자연스러움: 7/10
- 기능성: 6/10 ⬆️ +1
- 시각적 완성도: 8/10 ⬆️ +2

### 최종 목표 (전체 완료)
- 자연스러움: 9/10
- 기능성: 9/10
- 시각적 완성도: 9/10

---

## 다음 단계 🚀

**가장 먼저 할 일**:
1. `src/lib/motion.ts` - easeOutBack, easeOutElastic 함수 추가
2. `src/lib/actionExecutor.ts` - squat 동작에 상체 숙이기 추가
3. 테스트: "빨간색 주워" 실행해서 차이 확인

**예상 개선 효과**: 30분 작업으로 눈에 띄는 개선 가능!

---

이 플랜에 대한 의견이나 우선순위 조정이 필요하면 말씀해주세요! 🎯
