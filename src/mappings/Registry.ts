import { Registry } from '../types/schema';
import { EthereumBlock } from '@graphprotocol/graph-ts';

export function handleBlockWithCallToContract(block: EthereumBlock): void {
  let registry = new Registry(block.hash.toHex());
  registry.save();
}
