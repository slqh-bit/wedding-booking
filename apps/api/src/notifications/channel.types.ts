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

/** A delivery channel (email, SMS, WhatsApp, Telegram). */
export interface NotificationChannelImpl {
  readonly channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'TELEGRAM';
  readonly name: string;
  send(msg: OutboundMessage): Promise<SendResult>;
}
