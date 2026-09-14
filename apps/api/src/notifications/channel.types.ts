export interface OutboundMessage {
  to: string;
  subject: string;
  /** Plain-text body (email). */
  body: string;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

/** A delivery channel (email now; SMS/WhatsApp adapters can implement this later). */
export interface NotificationChannelImpl {
  readonly channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  readonly name: string;
  send(msg: OutboundMessage): Promise<SendResult>;
}
