import { State } from "../../types/schema";
import { BigInt } from "@graphprotocol/graph-ts";

export function currentState(): State {
  let state = State.load("0x");
  if (!state) {
    state = new State("0x");
    state.activeFunds = BigInt.fromI32(0);
    state.nonActiveFunds = BigInt.fromI32(0);
    state.timestampFundCount = BigInt.fromI32(0);
    state.numberOfInvestors = BigInt.fromI32(0);
    state.timestamptNumberOfInvestors = BigInt.fromI32(0);
    state.lastCalculation = BigInt.fromI32(0);
    state.lastCalculationId = BigInt.fromI32(-1);
    state.save();
  }

  return state as State;
}
