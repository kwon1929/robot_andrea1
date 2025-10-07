import type { Intent } from "../lib/types";

export function useIntentParser() {
  const parseCommand = (text: string): Intent => {
    const lower = text.toLowerCase().trim();

    // 한국어 패턴
    const koreanPatterns: Record<string, string> = {
      "오른팔 올려": "raise right arm",
      "왼팔 올려": "raise left arm",
      "오른팔 내려": "lower right arm",
      "왼팔 내려": "lower left arm",
      "오른팔 흔들어": "wave right arm",
      "왼팔 흔들어": "wave left arm",
      "리셋": "reset",
      "초기화": "reset",
    };

    let command = lower;
    for (const [ko, en] of Object.entries(koreanPatterns)) {
      if (lower.includes(ko)) {
        command = en;
        break;
      }
    }

    // raise/lower arm
    const raiseMatch = command.match(/raise (left|right) arm/);
    if (raiseMatch) {
      return {
        type: "pose",
        side: raiseMatch[1] as "left" | "right",
        joint: "shoulder",
        axis: "pitch",
        angle: 90,
        text,
      };
    }

    const lowerMatch = command.match(/lower (left|right) arm/);
    if (lowerMatch) {
      return {
        type: "pose",
        side: lowerMatch[1] as "left" | "right",
        joint: "shoulder",
        axis: "pitch",
        angle: 0,
        text,
      };
    }

    // rotate joint
    const rotateMatch = command.match(/rotate (left|right) (shoulder|elbow|hip|knee) (-?\d+)( deg)?/);
    if (rotateMatch) {
      const joint = rotateMatch[2] as "shoulder" | "elbow" | "hip" | "knee";
      let axis: "pitch" | "flex" = "pitch";
      if (joint === "elbow" || joint === "knee") {
        axis = "flex";
      }
      return {
        type: "pose",
        side: rotateMatch[1] as "left" | "right",
        joint,
        axis,
        angle: parseInt(rotateMatch[3]),
        text,
      };
    }

    // wave
    const waveMatch = command.match(/wave (left|right) arm/);
    if (waveMatch) {
      return {
        type: "wave",
        side: waveMatch[1] as "left" | "right",
        text,
      };
    }

    // reset
    if (command.includes("reset")) {
      return { type: "reset", text };
    }

    return { type: "unknown", text };
  };

  return { parseCommand };
}
