import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private async send(options: EmailOptions): Promise<boolean> {
    try {
      if (!resend || !process.env.RESEND_API_KEY || !process.env.RESEND_FROM_DOMAIN) {
        console.log(`Email (dev mode): ${options.subject}`);
        return true;
      }

      const fromDomain = process.env.RESEND_FROM_DOMAIN;
      const fromEmail = fromDomain.includes('@') ? fromDomain : `noreply@${fromDomain}`;

      const result = await resend.emails.send({
        from: `AprilFTD <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html
      });

      if (result.error) {
        console.error(`Email send failed: ${JSON.stringify(result.error)}`);
        return false;
      }

      console.log('Email sent successfully');
      return true;
    } catch (error) {
      console.error(`Email error: ${error}`);
      return false;
    }
  }

  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    const html = this.getVerificationCodeTemplate(code);
    return this.send({
      to: email,
      subject: 'Code de vérification - AprilFTD',
      html
    });
  }

  async sendPasswordResetCode(email: string, code: string): Promise<boolean> {
    const html = this.getPasswordResetCodeTemplate(code);
    return this.send({
      to: email,
      subject: 'Réinitialisation de mot de passe - AprilFTD',
      html
    });
  }

  async sendWelcomeEmail(email: string, username: string): Promise<boolean> {
    const html = this.getWelcomeTemplate(username);
    return this.send({
      to: email,
      subject: 'Bienvenue sur AprilFTD',
      html
    });
  }

  async sendApplicationReceived(email: string, username: string): Promise<boolean> {
    const html = this.getApplicationReceivedTemplate(username);
    return this.send({
      to: email,
      subject: 'Candidature reçue - AprilFTD',
      html
    });
  }

  async sendApplicationAccepted(email: string, username: string): Promise<boolean> {
    const html = this.getApplicationAcceptedTemplate(username);
    return this.send({
      to: email,
      subject: 'Candidature acceptée - AprilFTD',
      html
    });
  }

  async sendApplicationRejected(email: string, username: string, reason: string): Promise<boolean> {
    const html = this.getApplicationRejectedTemplate(username, reason);
    return this.send({
      to: email,
      subject: 'Candidature refusée - AprilFTD',
      html
    });
  }

  private getBaseTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AprilFTD</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #ffffff; min-height: 100vh;">
        <table width="100%" cellpadding="0" cellspacing="0" style="min-height: 100vh; padding: 40px 20px; background: #ffffff;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e5e5;">
                <!-- Header -->
                <tr>
                  <td style="background: #171717; padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #262626;">
                    <h1 style="margin: 0; color: #fafafa; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">AprilFTD</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px; background: #ffffff;">
                    ${content}
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; background: #fafafa; border-top: 1px solid #e5e5e5; text-align: center;">
                    <p style="margin: 0 0 10px; color: #737373; font-size: 14px;">
                      © ${new Date().getFullYear()} AprilFTD. Tous droits réservés.
                    </p>
                    <p style="margin: 0; color: #a3a3a3; font-size: 12px;">
                      Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private getVerificationCodeTemplate(code: string): string {
    const content = `
      <div style="text-align: center;">
        <h2 style="margin: 0 0 16px; color: #0a0a0a; font-size: 28px; font-weight: 700;">Code de vérification</h2>

        <p style="margin: 0 0 30px; color: #737373; font-size: 16px; line-height: 1.6;">
          Utilisez le code ci-dessous pour vérifier votre adresse email :
        </p>

        <div style="background: #fafafa; border: 2px solid #e5e5e5; border-radius: 12px; padding: 24px; margin: 0 0 30px;">
          <div style="font-size: 48px; font-weight: 700; letter-spacing: 8px; color: #171717; font-family: 'Courier New', monospace;">
            ${code}
          </div>
        </div>

        <p style="margin: 0; color: #a3a3a3; font-size: 14px;">
          Ce code expirera dans <strong style="color: #737373;">15 minutes</strong>.
        </p>
      </div>
    `;
    return this.getBaseTemplate(content);
  }

  private getPasswordResetCodeTemplate(code: string): string {
    const content = `
      <div style="text-align: center;">
        <h2 style="margin: 0 0 16px; color: #0a0a0a; font-size: 28px; font-weight: 700;">Réinitialisation de mot de passe</h2>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Vous avez demandé à réinitialiser votre mot de passe. Utilisez le code ci-dessous :
        </p>

        <div style="background: #fafafa; border: 2px solid #e5e5e5; border-radius: 12px; padding: 24px; margin: 0 0 24px;">
          <div style="font-size: 48px; font-weight: 700; letter-spacing: 8px; color: #171717; font-family: 'Courier New', monospace;">
            ${code}
          </div>
        </div>

        <p style="margin: 0 0 20px; color: #a3a3a3; font-size: 14px;">
          Ce code expirera dans <strong style="color: #737373;">15 minutes</strong>.
        </p>

        <div style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; text-align: left;">
          <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
            <strong>Attention :</strong> Si vous n'avez pas demandé cette réinitialisation, ignorez cet email et votre mot de passe restera inchangé.
          </p>
        </div>
      </div>
    `;
    return this.getBaseTemplate(content);
  }

  private getWelcomeTemplate(username: string): string {
    const content = `
      <div style="text-align: center;">
        <h2 style="margin: 0 0 16px; color: #0a0a0a; font-size: 28px; font-weight: 700;">Bienvenue, ${username} !</h2>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Votre compte a été créé avec succès. Nous sommes ravis de vous compter parmi nous !
        </p>

        <p style="margin: 0 0 30px; color: #737373; font-size: 16px; line-height: 1.6;">
          Vous pouvez maintenant accéder à votre espace et profiter de toutes les fonctionnalités disponibles.
        </p>

        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="display: inline-block; background: #171717; color: #fafafa; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px; margin-top: 10px;">
          Se connecter
        </a>
      </div>
    `;
    return this.getBaseTemplate(content);
  }

  private getApplicationReceivedTemplate(username: string): string {
    const content = `
      <div style="text-align: center;">
        <div style="background: #171717; color: white; border-radius: 12px; padding: 20px; margin-bottom: 30px; display: inline-block;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>

        <h2 style="margin: 0 0 16px; color: #0a0a0a; font-size: 28px; font-weight: 700;">Candidature reçue</h2>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Bonjour <strong style="color: #171717;">${username}</strong>,
        </p>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Nous avons bien reçu votre candidature et nous vous en remercions.
        </p>

        <p style="margin: 0; color: #737373; font-size: 16px; line-height: 1.6;">
          Notre équipe va l'examiner dans les plus brefs délais. Vous recevrez un email dès qu'une décision sera prise.
        </p>
      </div>
    `;
    return this.getBaseTemplate(content);
  }

  private getApplicationAcceptedTemplate(username: string): string {
    const content = `
      <div style="text-align: center;">
        <h2 style="margin: 0 0 16px; color: #0a0a0a; font-size: 28px; font-weight: 700;">Félicitations !</h2>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Bonjour <strong style="color: #171717;">${username}</strong>,
        </p>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Nous avons le plaisir de vous informer que votre candidature a été <strong style="color: #171717;">acceptée</strong> !
        </p>

        <p style="margin: 0 0 30px; color: #737373; font-size: 16px; line-height: 1.6;">
          Vous pouvez dès maintenant vous connecter à votre espace et commencer votre aventure avec nous.
        </p>

        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" style="display: inline-block; background: #171717; color: #fafafa; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px; margin-top: 10px;">
          Se connecter
        </a>
      </div>
    `;
    return this.getBaseTemplate(content);
  }

  private getApplicationRejectedTemplate(username: string, reason: string): string {
    const content = `
      <div style="text-align: center;">
        <div style="background: #171717; color: white; border-radius: 12px; padding: 20px; margin-bottom: 30px; display: inline-block;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>

        <h2 style="margin: 0 0 16px; color: #0a0a0a; font-size: 28px; font-weight: 700;">Candidature refusée</h2>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Bonjour <strong style="color: #171717;">${username}</strong>,
        </p>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Nous vous remercions de l'intérêt que vous avez porté à notre plateforme.
        </p>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Malheureusement, après examen de votre candidature, nous ne pouvons pas y donner suite pour le moment.
        </p>

        ${reason ? `
        <div style="background: #fafafa; border-left: 4px solid #171717; border-radius: 8px; padding: 20px; margin: 0 0 24px; text-align: left;">
          <p style="margin: 0 0 8px; color: #171717; font-weight: 600; font-size: 14px;">Raison :</p>
          <p style="margin: 0; color: #737373; font-size: 14px; line-height: 1.6;">
            ${reason}
          </p>
        </div>
        ` : ''}

        <p style="margin: 0; color: #737373; font-size: 16px; line-height: 1.6;">
          Nous vous souhaitons bonne chance dans vos futurs projets.
        </p>
      </div>
    `;
    return this.getBaseTemplate(content);
  }

  async sendPaymentRequestConfirmation(email: string, username: string, amount: number, cryptoType: string, network: string): Promise<boolean> {
    const html = this.getPaymentRequestConfirmationTemplate(username, amount, cryptoType, network);
    return this.send({
      to: email,
      subject: 'Demande de paiement reçue - AprilFTD',
      html
    });
  }

  async sendPaymentRequestProcessed(email: string, username: string, amount: number, cryptoType: string, status: 'accepted' | 'declined', adminNote: string | null): Promise<boolean> {
    const html = this.getPaymentRequestProcessedTemplate(username, amount, cryptoType, status, adminNote);
    return this.send({
      to: email,
      subject: status === 'accepted' ? 'Paiement accepté - AprilFTD' : 'Paiement refusé - AprilFTD',
      html
    });
  }

  private getPaymentRequestConfirmationTemplate(username: string, amount: number, cryptoType: string, network: string): string {
    const content = `
      <div style="text-align: center;">
        <div style="background: #171717; color: white; border-radius: 12px; padding: 20px; margin-bottom: 30px; display: inline-block;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>

        <h2 style="margin: 0 0 16px; color: #0a0a0a; font-size: 28px; font-weight: 700;">Demande de paiement reçue</h2>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Bonjour <strong style="color: #171717;">${username}</strong>,
        </p>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Nous avons bien reçu votre demande de paiement.
        </p>

        <div style="background: #fafafa; border-radius: 12px; padding: 24px; margin: 0 0 24px; text-align: left;">
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; color: #a3a3a3; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Montant</p>
            <p style="margin: 0; color: #171717; font-size: 24px; font-weight: 700;">${Number(amount).toFixed(2)} €</p>
          </div>
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; color: #a3a3a3; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Crypto</p>
            <p style="margin: 0; color: #171717; font-size: 16px; font-weight: 600;">${cryptoType}</p>
          </div>
          <div>
            <p style="margin: 0 0 4px; color: #a3a3a3; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Réseau</p>
            <p style="margin: 0; color: #171717; font-size: 16px; font-weight: 600;">${network}</p>
          </div>
        </div>

        <p style="margin: 0; color: #737373; font-size: 16px; line-height: 1.6;">
          Votre demande sera traitée dans les plus brefs délais. Vous recevrez un email dès qu'elle sera validée ou refusée.
        </p>
      </div>
    `;
    return this.getBaseTemplate(content);
  }

  private getPaymentRequestProcessedTemplate(username: string, amount: number, cryptoType: string, status: 'accepted' | 'declined', adminNote: string | null): string {
    const isAccepted = status === 'accepted';
    const content = `
      <div style="text-align: center;">
        <h2 style="margin: 0 0 16px; color: #0a0a0a; font-size: 28px; font-weight: 700;">
          ${isAccepted ? 'Paiement accepté' : 'Paiement refusé'}
        </h2>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Bonjour <strong style="color: #171717;">${username}</strong>,
        </p>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Votre demande de paiement de <strong style="color: #171717;">${Number(amount).toFixed(2)} €</strong> en <strong style="color: #171717;">${cryptoType}</strong> a été ${isAccepted ? 'acceptée' : 'refusée'}.
        </p>

        ${!isAccepted && adminNote ? `
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px; margin: 0 0 24px; text-align: left;">
          <p style="margin: 0 0 8px; color: #dc2626; font-weight: 600; font-size: 14px;">Raison du refus :</p>
          <p style="margin: 0; color: #737373; font-size: 14px; line-height: 1.6;">
            ${adminNote}
          </p>
        </div>
        ` : ''}

        ${isAccepted ? `
        <p style="margin: 0; color: #737373; font-size: 16px; line-height: 1.6;">
          Le paiement sera effectué dans les prochaines 24-48 heures sur votre adresse wallet.
        </p>
        ` : `
        <p style="margin: 0; color: #737373; font-size: 16px; line-height: 1.6;">
          Pour plus d'informations, vous pouvez contacter notre support.
        </p>
        `}
      </div>
    `;
    return this.getBaseTemplate(content);
  }

  async sendExpenseReimbursementConfirmation(email: string, username: string, amount: number, description: string, cryptoType: string, network: string): Promise<boolean> {
    const html = this.getExpenseReimbursementConfirmationTemplate(username, amount, description, cryptoType, network);
    return this.send({
      to: email,
      subject: 'Demande de remboursement de dépense reçue - AprilFTD',
      html
    });
  }

  async sendExpenseReimbursementProcessed(email: string, username: string, amount: number, description: string, cryptoType: string, status: 'accepted' | 'declined', adminNote: string | null): Promise<boolean> {
    const html = this.getExpenseReimbursementProcessedTemplate(username, amount, description, cryptoType, status, adminNote);
    return this.send({
      to: email,
      subject: status === 'accepted' ? 'Remboursement de dépense accepté - AprilFTD' : 'Remboursement de dépense refusé - AprilFTD',
      html
    });
  }

  private getExpenseReimbursementConfirmationTemplate(username: string, amount: number, description: string, cryptoType: string, network: string): string {
    const content = `
      <div style="text-align: center;">
        <h2 style="margin: 0 0 16px; color: #0a0a0a; font-size: 28px; font-weight: 700;">Demande de remboursement reçue</h2>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Bonjour <strong style="color: #171717;">${username}</strong>,
        </p>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Nous avons bien reçu votre demande de remboursement de dépense.
        </p>

        <div style="background: #fafafa; border-radius: 12px; padding: 24px; margin: 0 0 24px; text-align: left;">
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; color: #a3a3a3; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Montant</p>
            <p style="margin: 0; color: #171717; font-size: 24px; font-weight: 700;">${Number(amount).toFixed(2)} €</p>
          </div>
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; color: #a3a3a3; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Description</p>
            <p style="margin: 0; color: #171717; font-size: 14px; line-height: 1.5;">${description}</p>
          </div>
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; color: #a3a3a3; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Crypto</p>
            <p style="margin: 0; color: #171717; font-size: 16px; font-weight: 600;">${cryptoType}</p>
          </div>
          <div>
            <p style="margin: 0 0 4px; color: #a3a3a3; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Réseau</p>
            <p style="margin: 0; color: #171717; font-size: 16px; font-weight: 600;">${network}</p>
          </div>
        </div>

        <p style="margin: 0; color: #737373; font-size: 16px; line-height: 1.6;">
          Votre demande sera traitée dans les plus brefs délais. Vous recevrez un email dès qu'elle sera validée ou refusée.
        </p>
      </div>
    `;
    return this.getBaseTemplate(content);
  }

  private getExpenseReimbursementProcessedTemplate(username: string, amount: number, description: string, cryptoType: string, status: 'accepted' | 'declined', adminNote: string | null): string {
    const isAccepted = status === 'accepted';
    const content = `
      <div style="text-align: center;">
        <h2 style="margin: 0 0 16px; color: #0a0a0a; font-size: 28px; font-weight: 700;">
          ${isAccepted ? 'Remboursement accepté' : 'Remboursement refusé'}
        </h2>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Bonjour <strong style="color: #171717;">${username}</strong>,
        </p>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Votre demande de remboursement de <strong style="color: #171717;">${Number(amount).toFixed(2)} €</strong> en <strong style="color: #171717;">${cryptoType}</strong> a été ${isAccepted ? 'acceptée' : 'refusée'}.
        </p>

        <div style="background: #fafafa; border-radius: 12px; padding: 20px; margin: 0 0 24px; text-align: left;">
          <p style="margin: 0 0 4px; color: #a3a3a3; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Dépense</p>
          <p style="margin: 0; color: #171717; font-size: 14px; line-height: 1.5;">${description}</p>
        </div>

        ${!isAccepted && adminNote ? `
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px; margin: 0 0 24px; text-align: left;">
          <p style="margin: 0 0 8px; color: #dc2626; font-weight: 600; font-size: 14px;">Raison du refus :</p>
          <p style="margin: 0; color: #737373; font-size: 14px; line-height: 1.6;">
            ${adminNote}
          </p>
        </div>
        ` : ''}

        ${isAccepted ? `
        <p style="margin: 0; color: #737373; font-size: 16px; line-height: 1.6;">
          Le remboursement sera effectué dans les prochaines 24-48 heures sur votre adresse wallet.
        </p>
        ` : `
        <p style="margin: 0; color: #737373; font-size: 16px; line-height: 1.6;">
          Pour plus d'informations, vous pouvez contacter notre support.
        </p>
        `}
      </div>
    `;
    return this.getBaseTemplate(content);
  }

  async sendRewardMilestoneReached(email: string, username: string, rewardName: string, ftdCount: number): Promise<boolean> {
    const html = this.getRewardMilestoneReachedTemplate(username, rewardName, ftdCount);
    return this.send({
      to: email,
      subject: 'Nouveau palier de récompense atteint - AprilFTD',
      html
    });
  }

  async sendRewardClaimProcessed(email: string, username: string, rewardName: string, rewardValue: number, claimType: 'physical' | 'balance', status: 'approved' | 'rejected', adminNote?: string): Promise<boolean> {
    const html = this.getRewardClaimProcessedTemplate(username, rewardName, rewardValue, claimType, status, adminNote);
    return this.send({
      to: email,
      subject: status === 'approved' ? 'Demande de récompense approuvée - AprilFTD' : 'Demande de récompense refusée - AprilFTD',
      html
    });
  }

  private getRewardMilestoneReachedTemplate(username: string, rewardName: string, ftdCount: number): string {
    const content = `
      <div style="text-align: center;">
        <h2 style="margin: 0 0 16px; color: #0a0a0a; font-size: 28px; font-weight: 700;">Félicitations !</h2>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Bonjour <strong style="color: #171717;">${username}</strong>,
        </p>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Vous avez atteint un nouveau palier de récompense avec <strong style="color: #171717;">${ftdCount} FTD</strong> !
        </p>

        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 24px; margin: 0 0 24px;">
          <p style="margin: 0 0 8px; color: #78350f; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Récompense débloquée</p>
          <p style="margin: 0; color: #92400e; font-size: 20px; font-weight: 700;">${rewardName}</p>
        </div>

        <p style="margin: 0 0 30px; color: #737373; font-size: 16px; line-height: 1.6;">
          Connectez-vous à votre espace pour demander votre récompense. Vous pouvez la recevoir en physique ou en ajout de solde.
        </p>

        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/affiliate/rewards" style="display: inline-block; background: #171717; color: #fafafa; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px; margin-top: 10px;">
          Voir mes récompenses
        </a>
      </div>
    `;
    return this.getBaseTemplate(content);
  }

  private getRewardClaimProcessedTemplate(username: string, rewardName: string, rewardValue: number, claimType: 'physical' | 'balance', status: 'approved' | 'rejected', adminNote?: string): string {
    const isApproved = status === 'approved';
    const content = `
      <div style="text-align: center;">
        <h2 style="margin: 0 0 16px; color: #0a0a0a; font-size: 28px; font-weight: 700;">
          ${isApproved ? 'Récompense approuvée' : 'Récompense refusée'}
        </h2>

        <p style="margin: 0 0 24px; color: #737373; font-size: 16px; line-height: 1.6;">
          Bonjour <strong style="color: #171717;">${username}</strong>,
        </p>

        <div style="background: #fafafa; border-radius: 12px; padding: 24px; margin: 0 0 24px; text-align: left;">
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; color: #a3a3a3; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Récompense</p>
            <p style="margin: 0; color: #171717; font-size: 18px; font-weight: 700;">${rewardName}</p>
          </div>
          <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 4px; color: #a3a3a3; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Valeur</p>
            <p style="margin: 0; color: #171717; font-size: 16px; font-weight: 600;">${Number(rewardValue).toFixed(2)} €</p>
          </div>
          <div>
            <p style="margin: 0 0 4px; color: #a3a3a3; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Type</p>
            <p style="margin: 0; color: #171717; font-size: 16px; font-weight: 600;">${claimType === 'physical' ? 'Livraison physique' : 'Ajout au solde'}</p>
          </div>
        </div>

        ${isApproved ? `
          ${claimType === 'physical' ? `
          <p style="margin: 0; color: #737373; font-size: 16px; line-height: 1.6;">
            Votre récompense a été expédiée ! Vous devriez la recevoir dans les prochains jours.
          </p>
          ` : `
          <p style="margin: 0; color: #737373; font-size: 16px; line-height: 1.6;">
            Le montant de <strong style="color: #171717;">${Number(rewardValue).toFixed(2)} €</strong> a été ajouté à votre solde !
          </p>
          `}
        ` : `
        <p style="margin: 0; color: #737373; font-size: 16px; line-height: 1.6;">
          Votre demande de récompense a été refusée. Pour plus d'informations, veuillez contacter notre support.
        </p>
        `}

        ${adminNote ? `
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 24px 0 0; text-align: left;">
          <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 600;">Note de l'administrateur</p>
          <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">${adminNote}</p>
        </div>
        ` : ''}
      </div>
    `;
    return this.getBaseTemplate(content);
  }
}

export const emailService = new EmailService();

export async function sendPaymentRequestConfirmation(email: string, username: string, amount: number, cryptoType: string, network: string): Promise<boolean> {
  return emailService.sendPaymentRequestConfirmation(email, username, amount, cryptoType, network);
}

export async function sendPaymentRequestProcessed(email: string, username: string, amount: number, cryptoType: string, status: 'accepted' | 'declined', adminNote: string | null): Promise<boolean> {
  return emailService.sendPaymentRequestProcessed(email, username, amount, cryptoType, status, adminNote);
}

export async function sendExpenseReimbursementConfirmation(email: string, username: string, amount: number, description: string, cryptoType: string, network: string): Promise<boolean> {
  return emailService.sendExpenseReimbursementConfirmation(email, username, amount, description, cryptoType, network);
}

export async function sendExpenseReimbursementProcessed(email: string, username: string, amount: number, description: string, cryptoType: string, status: 'accepted' | 'declined', adminNote: string | null): Promise<boolean> {
  return emailService.sendExpenseReimbursementProcessed(email, username, amount, description, cryptoType, status, adminNote);
}

export async function sendRewardMilestoneReached(email: string, username: string, rewardName: string, ftdCount: number): Promise<boolean> {
  return emailService.sendRewardMilestoneReached(email, username, rewardName, ftdCount);
}

export async function sendRewardClaimProcessed(email: string, username: string, rewardName: string, rewardValue: number, claimType: 'physical' | 'balance', status: 'approved' | 'rejected', adminNote?: string): Promise<boolean> {
  return emailService.sendRewardClaimProcessed(email, username, rewardName, rewardValue, claimType, status, adminNote);
}
