import type { ScanStartReply } from '../messaging/contracts';
import { isWorkerMessage } from '../messaging/guards';
import { startScan, type ScanDeps } from './scan-orchestrator';

/**
 * Only SiteCheck's own extension pages may start scans. Content scripts carry
 * the extension id too but run inside web pages, so the sender's URL must also
 * be an extension page.
 */
export function isTrustedSender(
  sender: chrome.runtime.MessageSender,
  extensionOrigin: string,
): boolean {
  return (
    sender.id === new URL(extensionOrigin).host && (sender.url ?? '').startsWith(extensionOrigin)
  );
}

/** Returns the reply to send, or null to ignore the message entirely. */
export async function handleMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
  extensionOrigin: string,
  deps: ScanDeps,
): Promise<ScanStartReply | null> {
  if (!isTrustedSender(sender, extensionOrigin) || !isWorkerMessage(message)) return null;
  try {
    const { reply } = await startScan(message.tabId, deps);
    return reply;
  } catch (error) {
    deps.log('scan could not start', { error: String(error) });
    return { accepted: false, error: 'scan-failed' };
  }
}
