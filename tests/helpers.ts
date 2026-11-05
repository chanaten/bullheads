/** Shared test helpers. */

export {
  type EngineEvent,
  type MatchState,
  createMatch,
  findTargetRow,
  isMatchOver,
  totalBullheads,
} from '../src/engine/rules';
export { chooseRow as chooseRowForTest } from '../src/ai/bots';
