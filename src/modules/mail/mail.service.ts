import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly frontendUrl: string;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.resend = new Resend(config.getOrThrow<string>('RESEND_API_KEY'));
    this.frontendUrl = config.getOrThrow<string>('FRONTEND_URL');
    this.from = config.getOrThrow<string>('MAIL_FROM');
  }

  /**
   * Falha de envio é logada, não propagada: a resposta do fluxo de
   * recuperação é sempre 200 (não vazar existência de conta) e o usuário
   * pode simplesmente solicitar um novo link.
   */
  async sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/recuperar-senha?token=${token}`;
    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject: 'Recuperação de senha — Miyrah',
        html: [
          '<p>Recebemos um pedido para redefinir a senha da sua conta no Miyrah.</p>',
          `<p><a href="${link}">Clique aqui para definir uma nova senha</a>.</p>`,
          '<p>O link expira em 1 hora e só pode ser usado uma vez. Se você não pediu a redefinição, ignore este e-mail.</p>',
        ].join('\n'),
      });
      if (error) {
        this.logger.error(
          `Falha ao enviar e-mail de recuperação para ${to}: ${error.message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail de recuperação para ${to}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
