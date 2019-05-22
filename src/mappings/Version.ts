import { NewFund, VersionContract } from "../types/VersionDataSource/VersionContract";
import { HubDataSource } from "../types/VersionDataSource/templates";
import { Fund, FundCount, FundCalculationsUpdate } from "../types/schema";
import { hexToAscii } from "./utils/hexToAscii";
import { HubContract } from "../types/VersionDataSource/HubContract";
import { BigInt, EthereumBlock, Address } from "@graphprotocol/graph-ts";
import { currentState } from "./utils/currentState";
import { versionAddress } from "../statics.template";
import { AccountingContract } from "../types/VersionDataSource/AccountingContract";

export function handleNewFund(event: NewFund): void {
  HubDataSource.create(event.params.hub);

  let hub = event.params.hub.toHex();
  let addresses = event.params.routes.map<string>(value => value.toHex());
  let contract = HubContract.bind(event.params.hub);
  let fund = new Fund(hub);
  fund.manager = event.params.manager.toHex();
  fund.name = hexToAscii(contract.name());
  fund.creationTime = contract.creationTime();
  fund.isShutdown = contract.isShutDown();
  fund.accounting = addresses[0];
  fund.feeManager = addresses[1];
  fund.participation = addresses[2];
  fund.policyManager = addresses[3];
  fund.shares = addresses[4];
  fund.trading = addresses[5];
  fund.vault = addresses[6];
  fund.registry = addresses[8];
  fund.version = addresses[9];
  fund.engine = addresses[10];
  fund.save();

  // update fund counts
  let state = currentState();

  let fundCount = new FundCount(event.transaction.hash.toHex());
  if (fund.isShutdown) {
    fundCount.active = state.activeFunds;
    fundCount.nonActive = state.nonActiveFunds.plus(BigInt.fromI32(1));
  } else {
    fundCount.active = state.activeFunds.plus(BigInt.fromI32(1));
    fundCount.nonActive = state.nonActiveFunds;
  }
  fundCount.timestamp = event.block.timestamp;
  fundCount.save();

  state.activeFunds = fundCount.active;
  state.nonActiveFunds = fundCount.nonActive;
  state.timestampFundCount = event.block.timestamp;
  state.save();
}

function getNextId(last: BigInt, max: BigInt): BigInt {  
  let next: BigInt;
  if (max.gt(last)) {
    next = last.plus(BigInt.fromI32(1));
  }
  else {
    next = BigInt.fromI32(0);
  }

  return next;
}

export function handleBlock(block: EthereumBlock): void {
  let state = currentState();

  let interval = BigInt.fromI32(60 * 60 * 24);
  let difference = block.timestamp.minus(state.lastCalculation);

  // Start a new calculation cycle if the previous one is finished and the
  // last calculation is more than a day old.
  if (state.lastCalculationId.equals(BigInt.fromI32(-1)) && difference.gt(interval)) {
    state.lastCalculationId = BigInt.fromI32(0);
    state.lastCalculation = block.timestamp;
    state.save();
  }

  // Bail out if the last calculation cycle was finished but the next one
  // hasn't started yet.
  if (state.lastCalculationId.equals(BigInt.fromI32(-1))) {
    return;
  }

  let versionContract = VersionContract.bind(versionAddress);
  let fundCount = versionContract.getLastFundId();
  if (fundCount.lt(BigInt.fromI32(0))) {
    // End the calculation cycle if no fund exists.
    state.lastCalculationId = BigInt.fromI32(-1);
    state.save();

    return;
  }

  let nextFundId = getNextId(state.lastCalculationId, fundCount);
  state.lastCalculationId = nextFundId;
  state.save();

  let fundAddress = versionContract.getFundById(nextFundId).toHex();
  let fund = Fund.load(fundAddress);
  if (!fund) {
    return;
  }

  let accountingAddress = Address.fromString(fund.accounting);
  let accountingContract = AccountingContract.bind(accountingAddress);
  // let values = accountingContract.performCalculations();

  let gav = accountingContract.calcGav();
  let calculationsId = fundAddress + "/" + block.timestamp.toString();
  let calculations = new FundCalculationsUpdate(calculationsId);
  calculations.fund = fundAddress;
  calculations.timestamp = block.timestamp;
  calculations.gav = gav;
  // calculations.feesInDenominationAsset = values.value1;
  // calculations.feesInShares = values.value2;
  // calculations.nav = values.value3;
  // calculations.sharePrice = values.value4;
  // calculations.gavPerShareNetManagementFee = values.value5;
  calculations.save();

  fund.gav = gav;
  // fund.feesInDenominationAsset = values.value1;
  // fund.feesInShares = values.value2;
  // fund.nav = values.value3;
  // fund.sharePrice = values.value4;
  // fund.gavPerShareNetManagementFee = values.value5;
  fund.lastCalculationsUpdate = block.timestamp;
  fund.save();
}

