import { Address } from '@ton/core';

export function validateAddress(address: string): string {
  try {
    const addr = Address.parse(address);
    return addr.toRawString();
  } catch (error) {
    throw new Error(`Invalid TON address: ${address}`);
  }
}

export function isRawAddress(address: string): boolean {
  return /^[-0-1]:[a-fA-F0-9]{64}$/.test(address);
}

export function parseTransactionStatus(tx: any): { success: boolean; status: number } {
  let success = true;
  let exitCode = 0;

  if (tx.description) {
    const desc = tx.description;

    if (desc.compute_phase) {
      if (desc.compute_phase.type === 'vm') {
        if (desc.compute_phase.exit_code !== 0) {
          success = false;
          exitCode = desc.compute_phase.exit_code;
        }
      }
    }

    if (desc.action_phase) {
      if (desc.action_phase.result_code !== 0) {
        success = false;
        exitCode = desc.action_phase.result_code;
      }
    }

    if (desc.aborted) {
      success = false;
      if (exitCode === 0) exitCode = -1;
    }
  }

  return { success, status: exitCode };
}

export function parseUnits(amount: number | string, decimals: number): bigint {
  const amountStr = amount.toString().trim();
  const [integerPart, fractionalPart = ''] = amountStr.split('.');

  if (!/^-?\d+$/.test(integerPart)) {
    throw new Error(`Invalid amount format: ${amount}`);
  }

  if (fractionalPart && !/^\d+$/.test(fractionalPart)) {
    throw new Error(`Invalid amount format: ${amount}`);
  }

  if (fractionalPart.length > decimals) {
    throw new Error(`Fractional part ${fractionalPart} exceeds allowed decimals (${decimals}) for amount: ${amount}`);
  }

  const paddedFractional = fractionalPart.padEnd(decimals, '0');
  const fullNumber = integerPart + paddedFractional;
  return BigInt(fullNumber);
}

export function formatUnits(value: bigint | string, decimals: number): string {
  let valueStr = value.toString();
  const negative = valueStr.startsWith('-');
  if (negative) valueStr = valueStr.slice(1);

  valueStr = valueStr.padStart(decimals + 1, '0');
  const integerPart = valueStr.slice(0, valueStr.length - decimals);
  const fractionalPart = valueStr.slice(valueStr.length - decimals).replace(/0+$/, '');

  let result = integerPart;
  if (fractionalPart) result += '.' + fractionalPart;
  return negative ? '-' + result : result;
}
