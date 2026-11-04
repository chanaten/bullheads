/** Shared test helpers. */

export {
  type EngineEvent,
  type MatchState,
  createMatch,
  findTargetRow,
  isMatchOver,
} from '../src/engine/rules';
export { chooseRow as chooseRowForTest } from '../src/ai/bots';
