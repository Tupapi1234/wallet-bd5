"use client";

import { Core } from '@walletconnect/core';
import { Web3Wallet } from '@walletconnect/web3wallet';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';

let web3wallet: InstanceType<typeof Web3Wallet> | null = null;
const PROJECT_ID = 'a8a374fad866f2b82b8568df056b9c29';

export async function getWeb3Wallet() {
  if (web3wallet) return web3wallet;

  const core = new Core({
    projectId: PROJECT_ID,
  });

  web3wallet = await Web3Wallet.init({
    core: core as any,
    metadata: {
      name: 'Aether Wallet',
      description: 'The Ultimate Multichain Crypto Vault',
      url: 'https://aether-wallet.com', // Replace with real URL later
      icons: ['https://avatars.githubusercontent.com/u/37784886'],
    },
  });

  return web3wallet;
}

export async function pairWalletConnect(uri: string) {
  const wallet = await getWeb3Wallet();
  await wallet.core.pairing.pair({ uri });
}

export async function approveSessionProposal(proposal: any, solanaAddress: string, bnbAddress: string) {
  const wallet = await getWeb3Wallet();
  const { id, params } = proposal;

  const approvedNamespaces = buildApprovedNamespaces({
    proposal: params,
    supportedNamespaces: {
      solana: {
        chains: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'], // Solana Mainnet
        methods: ['solana_signTransaction', 'solana_signMessage'],
        events: ['accountsChanged', 'chainChanged'],
        accounts: [`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:${solanaAddress}`]
      },
      eip155: {
        chains: ['eip155:56'], // BNB Smart Chain
        methods: ['eth_sendTransaction', 'personal_sign'],
        events: ['chainChanged', 'accountsChanged'],
        accounts: [`eip155:56:${bnbAddress}`]
      }
    }
  });

  const session = await wallet.approveSession({
    id,
    namespaces: approvedNamespaces
  });

  return session;
}

export async function rejectSessionProposal(proposal: any) {
  const wallet = await getWeb3Wallet();
  await wallet.rejectSession({
    id: proposal.id,
    reason: getSdkError('USER_REJECTED')
  });
}

export async function getActiveSessions() {
  const wallet = await getWeb3Wallet();
  const sessions = wallet.getActiveSessions();
  return Object.values(sessions).map(session => ({
    id: session.topic,
    name: session.peer.metadata.name,
    url: session.peer.metadata.url,
    icon: session.peer.metadata.icons[0] || '⚡',
    connectedAt: new Date().toISOString()
  }));
}

export async function disconnectSession(topic: string) {
  const wallet = await getWeb3Wallet();
  await wallet.disconnectSession({
    topic,
    reason: getSdkError('USER_DISCONNECTED')
  });
}

export async function approveSessionRequest(topic: string, id: number, result: any) {
  const wallet = await getWeb3Wallet();
  await wallet.respondSessionRequest({
    topic,
    response: {
      id,
      jsonrpc: '2.0',
      result
    }
  });
}

export async function rejectSessionRequest(topic: string, id: number) {
  const wallet = await getWeb3Wallet();
  await wallet.respondSessionRequest({
    topic,
    response: {
      id,
      jsonrpc: '2.0',
      error: getSdkError('USER_REJECTED')
    }
  });
}
