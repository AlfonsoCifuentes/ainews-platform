/**
 * Email Notification Service
 * Uses Resend API (free tier: 3,000 emails/month)
 */

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface WeeklyDigestData {
  user: {
    name: string;
    email: string;
    locale: 'en' | 'es';
  };
  topArticles: Array<{
    title: string;
    summary: string;
    url: string;
    category: string;
  }>;
  newCourses: Array<{
    title: string;
    description: string;
    url: string;
  }>;
  stats: {
    xp_gained: number;
    courses_progress: number;
    streak_days: number;
  };
}

export class EmailService {
  private apiKey: string;
  private baseUrl = 'https://api.resend.com';
  private from = 'AINews <noreply@ainews.dev>'; // Configure your domain

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
  }

  private async send(options: EmailOptions) {
    if (!this.apiKey) {
      console.warn('[Email] Resend API key not configured');
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text
        })
      });

      if (!response.ok) {
        throw new Error(`Email send failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Email] Sent successfully:', data.id);
      return data;

    } catch (error) {
      console.error('[Email] Send error:', error);
      throw error;
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(email: string, name: string, locale: 'en' | 'es') {
    const subject = locale === 'en'
      ? 'Welcome to AINews! 🎉'
      : '¡Bienvenido a AINews! 🎉';

    const html = locale === 'en' ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Welcome to AINews, ${name}!</h1>
        <p>We're excited to have you join our community of AI enthusiasts.</p>
        <p>Here's what you can do:</p>
        <ul>
          <li>📰 Read curated AI news from 15+ top sources</li>
          <li>🎓 Generate custom AI courses on any topic</li>
          <li>🏆 Earn badges and level up as you learn</li>
          <li>🔥 Build learning streaks and compete on leaderboards</li>
        </ul>
        <a href="https://ainews.dev" style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #6366f1, #a855f7); color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Start Learning
        </a>
        <p style="margin-top: 32px; color: #666;">
          Happy learning!<br>
          The AINews Team
        </p>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">¡Bienvenido a AINews, ${name}!</h1>
        <p>Estamos emocionados de tenerte en nuestra comunidad de entusiastas de la IA.</p>
        <p>Esto es lo que puedes hacer:</p>
        <ul>
          <li>📰 Lee noticias de IA curadas de más de 15 fuentes</li>
          <li>🎓 Genera cursos personalizados de IA sobre cualquier tema</li>
          <li>🏆 Gana insignias y sube de nivel mientras aprendes</li>
          <li>🔥 Construye rachas de aprendizaje y compite en tablas de clasificación</li>
        </ul>
        <a href="https://ainews.dev" style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #6366f1, #a855f7); color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Empezar a Aprender
        </a>
        <p style="margin-top: 32px; color: #666;">
          ¡Feliz aprendizaje!<br>
          El equipo de AINews
        </p>
      </div>
    `;

    return this.send({ to: email, subject, html });
  }

  /**
   * Send weekly digest email
   */
  async sendWeeklyDigest(data: WeeklyDigestData) {
    const { user, topArticles, newCourses, stats } = data;
    const locale = user.locale;

    const subject = locale === 'en'
      ? `Your Weekly AI Digest - ${stats.xp_gained} XP Gained! 🚀`
      : `Tu Resumen Semanal de IA - ¡${stats.xp_gained} XP Ganado! 🚀`;

    const articlesHtml = topArticles
      .map(
        (article) => `
        <div style="margin-bottom: 20px; padding: 16px; border-left: 4px solid #6366f1; background: #f9fafb;">
          <h3 style="margin: 0 0 8px 0; color: #111;">
            <a href="${article.url}" style="color: #6366f1; text-decoration: none;">${article.title}</a>
          </h3>
          <p style="margin: 0; color: #666; font-size: 14px;">${article.summary}</p>
          <span style="display: inline-block; margin-top: 8px; padding: 4px 8px; background: #e0e7ff; color: #6366f1; font-size: 12px; border-radius: 4px;">
            ${article.category}
          </span>
        </div>
      `
      )
      .join('');

    const coursesHtml = newCourses
      .map(
        (course) => `
        <div style="margin-bottom: 16px;">
          <h4 style="margin: 0 0 4px 0;">
            <a href="${course.url}" style="color: #6366f1; text-decoration: none;">${course.title}</a>
          </h4>
          <p style="margin: 0; color: #666; font-size: 14px;">${course.description}</p>
        </div>
      `
      )
      .join('');

    const html =
      locale === 'en'
        ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Your Weekly AI Digest</h1>
        <p>Hi ${user.name}, here's what happened this week:</p>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0;">
          <div style="text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px;">
            <div style="font-size: 32px; font-weight: bold; color: #6366f1;">+${stats.xp_gained}</div>
            <div style="font-size: 14px; color: #666;">XP Gained</div>
          </div>
          <div style="text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px;">
            <div style="font-size: 32px; font-weight: bold; color: #10b981;">${stats.courses_progress}%</div>
            <div style="font-size: 14px; color: #666;">Progress</div>
          </div>
          <div style="text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px;">
            <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${stats.streak_days}🔥</div>
            <div style="font-size: 14px; color: #666;">Streak</div>
          </div>
        </div>

        <h2 style="color: #111; margin-top: 32px;">📰 Top AI News This Week</h2>
        ${articlesHtml}

        ${
          newCourses.length > 0
            ? `
          <h2 style="color: #111; margin-top: 32px;">🎓 New Courses Available</h2>
          ${coursesHtml}
        `
            : ''
        }

        <a href="https://ainews.dev" style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #6366f1, #a855f7); color: white; text-decoration: none; border-radius: 8px; margin-top: 32px;">
          Continue Learning
        </a>

        <p style="margin-top: 48px; color: #999; font-size: 12px;">
          You're receiving this because you subscribed to weekly digests. 
          <a href="https://ainews.dev/settings" style="color: #6366f1;">Unsubscribe</a>
        </p>
      </div>
    `
        : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Tu Resumen Semanal de IA</h1>
        <p>Hola ${user.name}, esto es lo que pasó esta semana:</p>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0;">
          <div style="text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px;">
            <div style="font-size: 32px; font-weight: bold; color: #6366f1;">+${stats.xp_gained}</div>
            <div style="font-size: 14px; color: #666;">XP Ganado</div>
          </div>
          <div style="text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px;">
            <div style="font-size: 32px; font-weight: bold; color: #10b981;">${stats.courses_progress}%</div>
            <div style="font-size: 14px; color: #666;">Progreso</div>
          </div>
          <div style="text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px;">
            <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${stats.streak_days}🔥</div>
            <div style="font-size: 14px; color: #666;">Racha</div>
          </div>
        </div>

        <h2 style="color: #111; margin-top: 32px;">📰 Principales Noticias de IA</h2>
        ${articlesHtml}

        ${
          newCourses.length > 0
            ? `
          <h2 style="color: #111; margin-top: 32px;">🎓 Nuevos Cursos Disponibles</h2>
          ${coursesHtml}
        `
            : ''
        }

        <a href="https://ainews.dev" style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #6366f1, #a855f7); color: white; text-decoration: none; border-radius: 8px; margin-top: 32px;">
          Continuar Aprendiendo
        </a>

        <p style="margin-top: 48px; color: #999; font-size: 12px;">
          Recibes esto porque te suscribiste a resúmenes semanales. 
          <a href="https://ainews.dev/settings" style="color: #6366f1;">Cancelar suscripción</a>
        </p>
      </div>
    `;

    return this.send({ to: user.email, subject, html });
  }

  /**
   * Send course completion congratulations
   */
  async sendCourseCompletionEmail(
    email: string,
    name: string,
    courseTitle: string,
    locale: 'en' | 'es',
    badgesEarned: string[]
  ) {
    const subject =
      locale === 'en'
        ? `🎉 Congratulations! You completed "${courseTitle}"`
        : `🎉 ¡Felicitaciones! Completaste "${courseTitle}"`;

    const badgesHtml = badgesEarned
      .map((badge) => `<span style="font-size: 24px; margin: 0 4px;">${badge}</span>`)
      .join('');

    const html =
      locale === 'en'
        ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
        <h1 style="font-size: 48px; margin: 32px 0;">🎉</h1>
        <h2 style="color: #6366f1;">Congratulations, ${name}!</h2>
        <p style="font-size: 18px; color: #666;">You've completed</p>
        <h3 style="color: #111; margin: 16px 0;">${courseTitle}</h3>
        
        ${
          badgesEarned.length > 0
            ? `
          <div style="margin: 32px 0; padding: 24px; background: #f9fafb; border-radius: 12px;">
            <p style="margin: 0 0 12px 0; font-weight: bold;">Badges Earned:</p>
            <div>${badgesHtml}</div>
          </div>
        `
            : ''
        }

        <p style="margin-top: 32px;">Keep up the great work! 🚀</p>
        <a href="https://ainews.dev/courses" style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #6366f1, #a855f7); color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Start Another Course
        </a>
      </div>
    `
        : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
        <h1 style="font-size: 48px; margin: 32px 0;">🎉</h1>
        <h2 style="color: #6366f1;">¡Felicitaciones, ${name}!</h2>
        <p style="font-size: 18px; color: #666;">Has completado</p>
        <h3 style="color: #111; margin: 16px 0;">${courseTitle}</h3>
        
        ${
          badgesEarned.length > 0
            ? `
          <div style="margin: 32px 0; padding: 24px; background: #f9fafb; border-radius: 12px;">
            <p style="margin: 0 0 12px 0; font-weight: bold;">Insignias Ganadas:</p>
            <div>${badgesHtml}</div>
          </div>
        `
            : ''
        }

        <p style="margin-top: 32px;">¡Sigue con el excelente trabajo! 🚀</p>
        <a href="https://ainews.dev/courses" style="display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #6366f1, #a855f7); color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
          Comenzar Otro Curso
        </a>
      </div>
    `;

    return this.send({ to: email, subject, html });
  }
}

export const emailService = new EmailService();
