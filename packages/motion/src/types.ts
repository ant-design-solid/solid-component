export type MotionStatus = "appear" | "enter" | "leave";
export type MotionPhase = MotionStatus | "none";
export type MotionStep = "prepare" | "start" | "active" | "end" | "idle";

export type MotionEndEvent = Event & {
  deadline?: boolean;
};

export type MotionStageName = {
  base?: string;
  appear?: string;
  appearPrepare?: string;
  appearStart?: string;
  appearActive?: string;
  appearEnd?: string;
  enter?: string;
  enterPrepare?: string;
  enterStart?: string;
  enterActive?: string;
  enterEnd?: string;
  leave?: string;
  leavePrepare?: string;
  leaveStart?: string;
  leaveActive?: string;
  leaveEnd?: string;
};

export type MotionName = string | MotionStageName;
