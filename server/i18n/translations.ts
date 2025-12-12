export const serverTranslations = {
  en: {
    email: {
      applicationReceived: {
        subject: "Application Received",
        greeting: "Hello",
        message: "We have received your application. We will review it and get back to you soon.",
        thanks: "Thank you",
        team: "The Team"
      },
      applicationApproved: {
        subject: "Application Approved",
        greeting: "Congratulations",
        message: "Your application has been approved! You can now log in to your account.",
        loginButton: "Log In Now",
        thanks: "Welcome aboard",
        team: "The Team"
      },
      applicationRejected: {
        subject: "Application Status Update",
        greeting: "Hello",
        message: "Unfortunately, your application has been rejected.",
        reason: "Reason",
        contact: "If you have any questions, please don't hesitate to contact us.",
        thanks: "Thank you for your interest",
        team: "The Team"
      },
      verification: {
        subject: "Verification Code",
        greeting: "Hello",
        message: "Your verification code is:",
        expires: "This code will expire in 10 minutes.",
        ignore: "If you didn't request this code, please ignore this email.",
        thanks: "Thank you",
        team: "The Team"
      },
      passwordReset: {
        subject: "Password Reset Code",
        greeting: "Hello",
        message: "You requested a password reset. Your reset code is:",
        expires: "This code will expire in 10 minutes.",
        ignore: "If you didn't request this, please ignore this email.",
        thanks: "Thank you",
        team: "The Team"
      },
      rewardClaimed: {
        subject: "Reward Claimed Successfully",
        greeting: "Congratulations",
        message: "You have successfully claimed a reward:",
        pointsUsed: "Points Used",
        remainingPoints: "Remaining Points",
        contact: "We will contact you shortly regarding your reward.",
        thanks: "Thank you",
        team: "The Team"
      },
      ftdNotification: {
        subject: "New FTD Recorded",
        greeting: "Great news",
        message: "A new FTD has been recorded for your account:",
        customer: "Customer",
        amount: "Amount",
        date: "Date",
        balance: "Your new balance is",
        thanks: "Keep up the great work",
        team: "The Team"
      }
    },
    errors: {
      unauthorized: "Unauthorized access",
      forbidden: "Forbidden",
      notFound: "Resource not found",
      serverError: "Internal server error",
      badRequest: "Bad request",
      emailExists: "Email already exists",
      invalidCredentials: "Invalid credentials",
      invalidToken: "Invalid or expired token",
      insufficientBalance: "Insufficient balance",
      insufficientPoints: "Insufficient points",
      rewardNotAvailable: "Reward not available"
    }
  },
  fr: {
    email: {
      applicationReceived: {
        subject: "Candidature reçue",
        greeting: "Bonjour",
        message: "Nous avons bien reçu votre candidature. Nous l'examinerons et vous contacterons bientôt.",
        thanks: "Merci",
        team: "L'équipe"
      },
      applicationApproved: {
        subject: "Candidature approuvée",
        greeting: "Félicitations",
        message: "Votre candidature a été approuvée ! Vous pouvez maintenant vous connecter à votre compte.",
        loginButton: "Se connecter maintenant",
        thanks: "Bienvenue à bord",
        team: "L'équipe"
      },
      applicationRejected: {
        subject: "Mise à jour du statut de candidature",
        greeting: "Bonjour",
        message: "Malheureusement, votre candidature a été rejetée.",
        reason: "Raison",
        contact: "Si vous avez des questions, n'hésitez pas à nous contacter.",
        thanks: "Merci pour votre intérêt",
        team: "L'équipe"
      },
      verification: {
        subject: "Code de vérification",
        greeting: "Bonjour",
        message: "Votre code de vérification est :",
        expires: "Ce code expirera dans 10 minutes.",
        ignore: "Si vous n'avez pas demandé ce code, veuillez ignorer cet email.",
        thanks: "Merci",
        team: "L'équipe"
      },
      passwordReset: {
        subject: "Code de réinitialisation du mot de passe",
        greeting: "Bonjour",
        message: "Vous avez demandé une réinitialisation de mot de passe. Votre code est :",
        expires: "Ce code expirera dans 10 minutes.",
        ignore: "Si vous n'avez pas fait cette demande, veuillez ignorer cet email.",
        thanks: "Merci",
        team: "L'équipe"
      },
      rewardClaimed: {
        subject: "Récompense réclamée avec succès",
        greeting: "Félicitations",
        message: "Vous avez réclamé une récompense avec succès :",
        pointsUsed: "Points utilisés",
        remainingPoints: "Points restants",
        contact: "Nous vous contacterons bientôt concernant votre récompense.",
        thanks: "Merci",
        team: "L'équipe"
      },
      ftdNotification: {
        subject: "Nouveau FTD enregistré",
        greeting: "Excellente nouvelle",
        message: "Un nouveau FTD a été enregistré pour votre compte :",
        customer: "Client",
        amount: "Montant",
        date: "Date",
        balance: "Votre nouveau solde est",
        thanks: "Continuez votre excellent travail",
        team: "L'équipe"
      }
    },
    errors: {
      unauthorized: "Accès non autorisé",
      forbidden: "Interdit",
      notFound: "Ressource non trouvée",
      serverError: "Erreur serveur interne",
      badRequest: "Requête incorrecte",
      emailExists: "L'email existe déjà",
      invalidCredentials: "Identifiants invalides",
      invalidToken: "Token invalide ou expiré",
      insufficientBalance: "Solde insuffisant",
      insufficientPoints: "Points insuffisants",
      rewardNotAvailable: "Récompense non disponible"
    }
  }
};

export type ServerLanguage = keyof typeof serverTranslations;
export function getServerTranslation(lang: ServerLanguage = 'fr') {
  return serverTranslations[lang] || serverTranslations.fr;
}
