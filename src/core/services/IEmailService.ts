export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface IEmailService {
  send(payload: SendEmailPayload): Promise<boolean>;
}
