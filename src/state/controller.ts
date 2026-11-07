/**
 * Match controller: the three-beat round loop —
 *   1. your pick (human input phase)
 *   2. bots commit one-by-one (staggered beats)
 *   3. simultaneous reveal, then resolution in ascending order
 * followed by round/hand/match transitions. Rendering, timing, and
 * fast-forward live in the UI hooks; this module is pure game flow.
 */

import { chooseCard, chooseRow } from '../ai/bots';
import {
  type EngineEvent,
  type MatchState,
  consumeCard,
  createMatch,
  findTargetRow,
  isHandOver,
  isMatchOver,
  placeCard,
  resolveOrder,
  startNextHand,
  winners,
} from '../engine/rules';
import { clearMatch, saveMatch } from './persistence';

export type Phase =
  | 'choosing' // waiting for the human's card
  | 'committing' // bots revealing their cards
  | 'revealing' // all cards flipping
  | 'resolving' // cards landing in ascending order
  | 'rowChoose' // human must pick a row (card lower than all ends)
  | 'handEnd' // hand tally + scoreboard
  | 'matchEnd'
  | 'idle';

export interface UIHooks {
  /** Fresh deal (initial or next hand): render hands and rows. */
  deal(state: MatchState): Promise<void>;
  /** One bot's card committed (staggered beat). */
  botCommit(player: number, card: number): Promise<void>;
  /** All cards flip face-up together (the "tak!" beat). */
  reveal(plays: readonly { player: number; card: number }[]): Promise<void>;
  /** Apply one placement's events (cardPlaced, maybe rowChosen/rowTaken). */
  resolve(events: readonly EngineEvent[], player: number, card: number): Promise<void>;
  /** Human must choose which row to take. Resolve with the chosen index. */
  askRowChoice(card: number): Promise<number>;
  /** A round begins (progress display, gentle auto-advance beat). */
  roundStart(round: number): Promise<void>;
  /** Hand finished: tally handScore into scores. */
  handEnd(state: MatchState): Promise<void>;
  /** Scoreboard interlude; resolve when the player continues. */
  scoreboard(state: MatchState): Promise<void>;
  /** Match over. */
  matchEnd(winners: number[], state: MatchState): Promise<void>;
}

export class MatchController {
  readonly state: MatchState;
  phase: Phase = 'idle';
  private readonly ui: UIHooks;
  private readonly rng: () => number;
  private inputToken = 0; // invalidates stale async continuations

  constructor(state: MatchState, ui: UIHooks, rng: () => number = Math.random) {
    this.state = state;
    this.ui = ui;
    this.rng = rng;
  }

  /** Build a brand-new match (roster + mixed bot tiers sampled inside). */
  static create(
    playerNames: readonly string[],
    ui: UIHooks,
    rng: () => number = Math.random,
  ): MatchController {
    return new MatchController(createMatch(playerNames, rng), ui, rng);
  }

  /** Render an existing (e.g. resumed) match and enter the choosing phase. */
  async resume(): Promise<void> {
    await this.ui.deal(this.state);
    await this.ui.roundStart(this.state.round);
    this.phase = 'choosing';
  }

  /** Start a fresh match from construction. */
  async start(): Promise<void> {
    await this.ui.deal(this.state);
    await this.ui.roundStart(this.state.round);
    this.phase = 'choosing';
  }

  /** The human plays a card (confirm click). Ignored outside 'choosing'. */
  async humanPlay(card: number): Promise<void> {
    if (this.phase !== 'choosing') return;
    if (!this.state.players[0].hand.includes(card)) return;
    this.phase = 'committing';
    const token = ++this.inputToken;

    consumeCard(this.state, 0, card);
    const plays: { player: number; card: number }[] = [{ player: 0, card }];

    for (let id = 1; id < this.state.players.length; id++) {
      const botCard = chooseCard(this.state, id, { rng: this.rng });
      consumeCard(this.state, id, botCard);
      plays.push({ player: id, card: botCard });
      await this.ui.botCommit(id, botCard);
      if (token !== this.inputToken) return; // controller superseded
    }

    this.phase = 'revealing';
    await this.ui.reveal(plays);
    if (token !== this.inputToken) return;

    await this.resolveRound(plays, token);
  }

  /** Stop all pending flows (leaving the match). Safe to call twice. */
  dispose(): void {
    this.inputToken++;
    this.phase = 'idle';
  }

  private async resolveRound(
    plays: readonly { player: number; card: number }[],
    token: number,
  ): Promise<void> {
    this.phase = 'resolving';
    for (const { player, card } of resolveOrder(plays)) {
      let row = findTargetRow(card, this.state.rows);
      if (row === null) {
        if (player === 0) {
          this.phase = 'rowChoose';
          row = await this.ui.askRowChoice(card);
          this.phase = 'resolving';
        } else {
          row = chooseRow(this.state.rows);
        }
      }
      if (token !== this.inputToken) return;
      const events = placeCard(this.state, player, card, row);
      await this.ui.resolve(events, player, card);
      if (token !== this.inputToken) return;
    }

    this.state.round++;
    await this.endRound(token);
  }

  private async endRound(token: number): Promise<void> {
    if (isHandOver(this.state)) {
      this.phase = 'handEnd';
      await this.ui.handEnd(this.state);
      await this.ui.scoreboard(this.state);
      if (token !== this.inputToken) return;

      if (isMatchOver(this.state)) {
        this.phase = 'matchEnd';
        clearMatch();
        await this.ui.matchEnd(winners(this.state), this.state);
        return;
      }
      startNextHand(this.state, this.rng);
      saveMatch(this.state);
      await this.ui.deal(this.state);
      if (token !== this.inputToken) return;
      await this.ui.roundStart(this.state.round);
      this.phase = 'choosing';
      return;
    }

    // Between-round boundary: persist so a refresh resumes here.
    saveMatch(this.state);
    await this.ui.roundStart(this.state.round);
    if (token !== this.inputToken) return;
    this.phase = 'choosing';
  }
}
