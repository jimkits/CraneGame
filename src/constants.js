export const CASE_W  = 3.6;   // glass prize-area width
export const CASE_D  = 3.0;   // glass prize-area depth
export const CASE_H  = 4.2;   // glass prize-area height  (Y: 0 → CASE_H)
export const CAB_H   = 2.2;   // solid cabinet body below glass (Y: -CAB_H → 0)
export const CLAW_MIN_Y = 0.90;  // arm tips (closed: ~0.82 below body) must clear floor top at y=0.06
export const CLAW_MAX_Y = CASE_H - 0.55;
export const CRANE_SPEED   = 2.8;
export const CLAW_DROP_SPD = 3.5;
export const CLAW_RISE_SPD = 4.2;
export const DROP_X = 1.1;
export const DROP_Z = 1.0;
export const BIN_W  = 0.72;  // collection bin inner width
export const BIN_D  = 0.72;  // collection bin inner depth
export const STATE  = { IDLE:0, DROPPING:1, GRABBING:2, RISING:3, RETURNING:4, RELEASING:5 };
