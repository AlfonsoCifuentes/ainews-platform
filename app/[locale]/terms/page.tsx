import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Terms of Service - Las Noticias de la IA',
  description: 'Terms and Conditions for using Las Noticias de la IA.',
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isEs = locale === 'es';

  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">
        {isEs ? 'Términos de Servicio' : 'Terms of Service'}
      </h1>
      
      <div className="prose prose-invert max-w-none text-muted-foreground space-y-8">
        <section>
          <p className="text-sm italic">
            {isEs 
              ? 'Última actualización: 23 de Diciembre de 2025' 
              : 'Last Updated: December 23, 2025'}
          </p>
          <p>
            {isEs
              ? '¡Bienvenido a Las Noticias de la IA! Estos términos y condiciones describen las reglas y regulaciones para el uso del sitio web de Las Noticias de la IA, ubicado en lasnoticiasdelaia.com.'
              : 'Welcome to Las Noticias de la IA! These terms and conditions outline the rules and regulations for the use of Las Noticias de la IA\'s Website, located at lasnoticiasdelaia.com.'}
          </p>
          <p>
            {isEs
              ? 'Al acceder a este sitio web, asumimos que acepta estos términos y condiciones. No continúe utilizando Las Noticias de la IA si no está de acuerdo con todos los términos y condiciones establecidos en esta página.'
              : 'By accessing this website we assume you accept these terms and conditions. Do not continue to use Las Noticias de la IA if you do not agree to take all of the terms and conditions stated on this page.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Cookies' : 'Cookies'}
          </h2>
          <p>
            {isEs
              ? 'Empleamos el uso de cookies. Al acceder a Las Noticias de la IA, usted acordó utilizar cookies de acuerdo con la Política de Privacidad de Las Noticias de la IA.'
              : 'We employ the use of cookies. By accessing Las Noticias de la IA, you agreed to use cookies in agreement with the Las Noticias de la IA\'s Privacy Policy.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Licencia' : 'License'}
          </h2>
          <p>
            {isEs
              ? 'A menos que se indique lo contrario, Las Noticias de la IA y/o sus licenciantes poseen los derechos de propiedad intelectual de todo el material en Las Noticias de la IA. Todos los derechos de propiedad intelectual están reservados. Puede acceder a esto desde Las Noticias de la IA para su uso personal sujeto a las restricciones establecidas en estos términos y condiciones.'
              : 'Unless otherwise stated, Las Noticias de la IA and/or its licensors own the intellectual property rights for all material on Las Noticias de la IA. All intellectual property rights are reserved. You may access this from Las Noticias de la IA for your own personal use subjected to restrictions set in these terms and conditions.'}
          </p>
          <p className="mt-4 font-bold">{isEs ? 'No debe:' : 'You must not:'}</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>{isEs ? 'Republicar material de Las Noticias de la IA' : 'Republish material from Las Noticias de la IA'}</li>
            <li>{isEs ? 'Vender, alquilar o sublicenciar material de Las Noticias de la IA' : 'Sell, rent or sub-license material from Las Noticias de la IA'}</li>
            <li>{isEs ? 'Reproducir, duplicar o copiar material de Las Noticias de la IA' : 'Reproduce, duplicate or copy material from Las Noticias de la IA'}</li>
            <li>{isEs ? 'Redistribuir contenido de Las Noticias de la IA' : 'Redistribute content from Las Noticias de la IA'}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Hipervínculos a nuestro contenido' : 'Hyperlinking to our Content'}
          </h2>
          <p>
            {isEs
              ? 'Las siguientes organizaciones pueden vincular a nuestro sitio web sin aprobación previa por escrito: Agencias gubernamentales; Motores de búsqueda; Organizaciones de noticias; Los distribuidores de directorios en línea.'
              : 'The following organizations may link to our Website without prior written approval: Government agencies; Search engines; News organizations; Online directory distributors.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Responsabilidad del contenido' : 'Content Liability'}
          </h2>
          <p>
            {isEs
              ? 'No seremos responsables de ningún contenido que aparezca en su sitio web. Usted acepta protegernos y defendernos contra todas las reclamaciones que se presenten en su sitio web.'
              : 'We shall not be hold responsible for any content that appears on your Website. You agree to protect and defend us against all claims that is rising on your Website.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Reserva de derechos' : 'Reservation of Rights'}
          </h2>
          <p>
            {isEs
              ? 'Nos reservamos el derecho de solicitar que elimine todos los enlaces o cualquier enlace particular a nuestro sitio web. Usted aprueba eliminar inmediatamente todos los enlaces a nuestro sitio web cuando se le solicite.'
              : 'We reserve the right to request that you remove all links or any particular link to our Website. You approve to immediately remove all links to our Website upon request.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Descargo de responsabilidad' : 'Disclaimer'}
          </h2>
          <p>
            {isEs
              ? 'En la medida máxima permitida por la ley aplicable, excluimos todas las representaciones, garantías y condiciones relacionadas con nuestro sitio web y el uso de este sitio web.'
              : 'To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website.'}
          </p>
          <p className="mt-4">
            {isEs
              ? 'Siempre que el sitio web y la información y los servicios en el sitio web se proporcionen de forma gratuita, no seremos responsables de ninguna pérdida o daño de cualquier naturaleza.'
              : 'As long as the website and the information and services on the website are provided free of charge, we will not be liable for any loss or damage of any nature.'}
          </p>
        </section>
      </div>
    </main>
  );
}
