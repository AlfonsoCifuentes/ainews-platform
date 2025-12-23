import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Privacy Policy - ThotNet Core',
  description: 'Privacy Policy and Data Protection information for ThotNet Core.',
};

export default async function PrivacyPolicyPage({
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
        {isEs ? 'Política de Privacidad' : 'Privacy Policy'}
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
              ? 'En ThotNet Core, accesible desde thotnet.ai, una de nuestras principales prioridades es la privacidad de nuestros visitantes. Este documento de Política de Privacidad contiene tipos de información que es recopilada y registrada por ThotNet Core y cómo la usamos.'
              : 'At ThotNet Core, accessible from thotnet.ai, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by ThotNet Core and how we use it.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Consentimiento' : 'Consent'}
          </h2>
          <p>
            {isEs
              ? 'Al utilizar nuestro sitio web, usted acepta nuestra Política de Privacidad y acepta sus términos.'
              : 'By using our website, you hereby consent to our Privacy Policy and agree to its terms.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Información que recopilamos' : 'Information we collect'}
          </h2>
          <p>
            {isEs
              ? 'La información personal que se le pide que proporcione, y las razones por las que se le pide que la proporcione, se le aclararán en el momento en que le pidamos que proporcione su información personal.'
              : 'The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.'}
          </p>
          <p className="mt-4">
            {isEs
              ? 'Si se pone en contacto con nosotros directamente, podemos recibir información adicional sobre usted, como su nombre, dirección de correo electrónico, número de teléfono, el contenido del mensaje y/o archivos adjuntos que pueda enviarnos, y cualquier otra información que decida proporcionar.'
              : 'If you contact us directly, we may receive additional information about you such as your name, email address, phone number, the contents of the message and/or attachments you may send us, and any other information you may choose to provide.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Cómo usamos su información' : 'How we use your information'}
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>{isEs ? 'Proporcionar, operar y mantener nuestro sitio web' : 'Provide, operate, and maintain our website'}</li>
            <li>{isEs ? 'Mejorar, personalizar y expandir nuestro sitio web' : 'Improve, personalize, and expand our website'}</li>
            <li>{isEs ? 'Entender y analizar cómo utiliza nuestro sitio web' : 'Understand and analyze how you use our website'}</li>
            <li>{isEs ? 'Desarrollar nuevos productos, servicios, características y funcionalidades' : 'Develop new products, services, features, and functionality'}</li>
            <li>{isEs ? 'Comunicarnos con usted, ya sea directamente o a través de uno de nuestros socios' : 'Communicate with you, either directly or through one of our partners'}</li>
            <li>{isEs ? 'Enviarle correos electrónicos' : 'Send you emails'}</li>
            <li>{isEs ? 'Encontrar y prevenir el fraude' : 'Find and prevent fraud'}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Archivos de registro (Log Files)' : 'Log Files'}
          </h2>
          <p>
            {isEs
              ? 'ThotNet Core sigue un procedimiento estándar de uso de archivos de registro. Estos archivos registran a los visitantes cuando visitan sitios web. Todas las empresas de alojamiento hacen esto y es parte del análisis de los servicios de alojamiento. La información recopilada por los archivos de registro incluye direcciones de protocolo de Internet (IP), tipo de navegador, proveedor de servicios de Internet (ISP), fecha y hora, páginas de referencia/salida y posiblemente el número de clics.'
              : 'ThotNet Core follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services\' analytics. The information collected by log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Cookies y Web Beacons' : 'Cookies and Web Beacons'}
          </h2>
          <p>
            {isEs
              ? 'Como cualquier otro sitio web, ThotNet Core utiliza "cookies". Estas cookies se utilizan para almacenar información, incluidas las preferencias de los visitantes y las páginas del sitio web a las que el visitante accedió o visitó. La información se utiliza para optimizar la experiencia de los usuarios personalizando el contenido de nuestra página web según el tipo de navegador de los visitantes y/u otra información.'
              : 'Like any other website, ThotNet Core uses "cookies". These cookies are used to store information including visitors\' preferences, and the pages on the website that the visitor accessed or visited. The information is used to optimize the users\' experience by customizing our web page content based on visitors\' browser type and/or other information.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Google DoubleClick DART Cookie' : 'Google DoubleClick DART Cookie'}
          </h2>
          <p>
            {isEs
              ? 'Google es uno de los proveedores externos en nuestro sitio. También utiliza cookies, conocidas como cookies DART, para publicar anuncios a los visitantes de nuestro sitio en función de su visita a www.website.com y otros sitios en Internet. Sin embargo, los visitantes pueden optar por rechazar el uso de cookies DART visitando la Política de privacidad de la red de contenido y anuncios de Google en la siguiente URL: https://policies.google.com/technologies/ads'
              : 'Google is one of a third-party vendor on our site. It also uses cookies, known as DART cookies, to serve ads to our site visitors based upon their visit to www.website.com and other sites on the internet. However, visitors may choose to decline the use of DART cookies by visiting the Google ad and content network Privacy Policy at the following URL – https://policies.google.com/technologies/ads'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Políticas de privacidad de socios publicitarios' : 'Advertising Partners Privacy Policies'}
          </h2>
          <p>
            {isEs
              ? 'Puede consultar esta lista para encontrar la Política de privacidad de cada uno de los socios publicitarios de ThotNet Core.'
              : 'You may consult this list to find the Privacy Policy for each of the advertising partners of ThotNet Core.'}
          </p>
          <p className="mt-4">
            {isEs
              ? 'Los servidores de anuncios de terceros o las redes publicitarias utilizan tecnologías como cookies, JavaScript o Web Beacons que se utilizan en sus respectivos anuncios y enlaces que aparecen en ThotNet Core, que se envían directamente al navegador de los usuarios. Reciben automáticamente su dirección IP cuando esto ocurre. Estas tecnologías se utilizan para medir la efectividad de sus campañas publicitarias y/o para personalizar el contenido publicitario que ve en los sitios web que visita.'
              : 'Third-party ad servers or ad networks uses technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on ThotNet Core, which are sent directly to users\' browser. They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.'}
          </p>
          <p className="mt-4 font-bold">
            {isEs
              ? 'Tenga en cuenta que ThotNet Core no tiene acceso ni control sobre estas cookies que utilizan los anunciantes de terceros.'
              : 'Note that ThotNet Core has no access to or control over these cookies that are used by third-party advertisers.'}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Derechos de privacidad de la CCPA (No vender mi información personal)' : 'CCPA Privacy Rights (Do Not Sell My Personal Information)'}
          </h2>
          <p>
            {isEs
              ? 'Según la CCPA, entre otros derechos, los consumidores de California tienen derecho a:'
              : 'Under the CCPA, among other rights, California consumers have the right to:'}
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>{isEs ? 'Solicitar que una empresa que recopila datos personales de un consumidor divulgue las categorías y piezas específicas de datos personales que la empresa ha recopilado sobre los consumidores.' : 'Request that a business that collects a consumer\'s personal data disclose the categories and specific pieces of personal data that a business has collected about consumers.'}</li>
            <li>{isEs ? 'Solicitar que una empresa elimine cualquier dato personal sobre el consumidor que haya recopilado una empresa.' : 'Request that a business delete any personal data about the consumer that a business has collected.'}</li>
            <li>{isEs ? 'Solicitar que una empresa que vende datos personales de un consumidor, no venda los datos personales del consumidor.' : 'Request that a business that sells a consumer\'s personal data, not sell the consumer\'s personal data.'}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {isEs ? 'Derechos de protección de datos del RGPD' : 'GDPR Data Protection Rights'}
          </h2>
          <p>
            {isEs
              ? 'Nos gustaría asegurarnos de que conoce todos sus derechos de protección de datos. Todo usuario tiene derecho a lo siguiente:'
              : 'We would like to make sure you are fully aware of all of your data protection rights. Every user is entitled to the following:'}
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>{isEs ? 'El derecho de acceso: tiene derecho a solicitar copias de sus datos personales.' : 'The right to access – You have the right to request copies of your personal data.'}</li>
            <li>{isEs ? 'El derecho de rectificación: tiene derecho a solicitar que corrijamos cualquier información que crea que es inexacta.' : 'The right to rectification – You have the right to request that we correct any information you believe is inaccurate.'}</li>
            <li>{isEs ? 'El derecho de supresión: tiene derecho a solicitar que eliminemos sus datos personales, bajo ciertas condiciones.' : 'The right to erasure – You have the right to request that we erase your personal data, under certain conditions.'}</li>
            <li>{isEs ? 'El derecho a restringir el procesamiento: tiene derecho a solicitar que restrinjamos el procesamiento de sus datos personales, bajo ciertas condiciones.' : 'The right to restrict processing – You have the right to request that we restrict the processing of your personal data, under certain conditions.'}</li>
            <li>{isEs ? 'El derecho a oponerse al procesamiento: tiene derecho a oponerse a nuestro procesamiento de sus datos personales, bajo ciertas condiciones.' : 'The right to object to processing – You have the right to object to our processing of your personal data, under certain conditions.'}</li>
            <li>{isEs ? 'El derecho a la portabilidad de los datos: tiene derecho a solicitar que transfiramos los datos que hemos recopilado a otra organización, o directamente a usted, bajo ciertas condiciones.' : 'The right to data portability – You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.'}</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
