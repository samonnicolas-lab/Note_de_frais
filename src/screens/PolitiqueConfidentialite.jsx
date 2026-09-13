const DERNIERE_MISE_A_JOUR = "13 septembre 2026";

export default function PolitiqueConfidentialite() {
  return (
    <div className="screen legal-page">
      <header className="screen-header">
        <h1>Politique de confidentialité</h1>
      </header>

      <p className="text-muted text-small">Dernière mise à jour : {DERNIERE_MISE_A_JOUR}</p>

      <p>
        "Notes de frais" est une application gratuite qui permet de scanner des factures et tickets
        de caisse, d'en extraire automatiquement les informations, et de gérer ses notes de frais
        professionnelles. Cette page explique quelles données sont utilisées, pourquoi, et comment
        elles sont protégées.
      </p>

      <section>
        <h2>Qui gère cette application ?</h2>
        <p>
          L'application est développée et financée par une seule personne, à titre personnel, sans
          société ni équipe derrière. Pour toute question, voir la section Contact en bas de page.
        </p>
      </section>

      <section>
        <h2>Données utilisées</h2>
        <ul>
          <li>
            <strong>Identité Google</strong> : votre adresse email et votre nom, fournis par Google
            lors de la connexion, pour vous identifier dans l'application.
          </li>
          <li>
            <strong>Factures et tickets scannés</strong> : les images ou PDF que vous importez, ainsi
            que les informations qui en sont extraites (fournisseur, date, montants, catégorie,
            description, personnes invitées le cas échéant).
          </li>
          <li>
            <strong>Informations de profil</strong> (facultatives) : nom, fonction et IBAN, si vous
            choisissez de les renseigner dans les réglages, pour préremplir vos exports.
          </li>
          <li>
            <strong>Cookie de session</strong> : un cookie technique, chiffré, qui vous garde connecté
            entre deux visites.
          </li>
        </ul>
      </section>

      <section>
        <h2>Où sont stockées vos données</h2>
        <p>
          Vos factures, vos notes de frais et vos informations de profil sont stockées
          exclusivement dans <strong>votre propre Google Drive</strong>, dans un dossier "Notes de
          frais" créé par l'application. L'application ne dispose d'aucune base de données propre
          contenant vos notes de frais : vous en restez propriétaire et vous pouvez à tout moment
          consulter, exporter ou supprimer ce dossier directement depuis votre Drive.
        </p>
        <p>
          L'application ne demande d'ailleurs accès qu'aux fichiers qu'elle crée elle-même sur votre
          Drive (autorisation Google "drive.file"), jamais à l'ensemble de votre Drive.
        </p>
      </section>

      <section>
        <h2>Partage avec des tiers</h2>
        <ul>
          <li>
            <strong>Anthropic (API Claude)</strong> : lorsqu'une facture ne peut pas être reconnue
            automatiquement, l'image ou le PDF est envoyé à l'API Claude d'Anthropic pour en extraire
            le contenu. Cet envoi sert uniquement à traiter votre demande et n'est pas conservé par
            l'application au-delà du traitement.
          </li>
          <li>
            <strong>Supabase</strong> (base de données partagée) : utilisé pour deux choses, sans
            aucune donnée personnelle identifiable stockée dans les deux cas : (1) un cache commun de
            structures de factures déjà rencontrées (mise en page générique d'un fournisseur, pas son
            contenu) pour éviter de solliciter l'IA à chaque fois, et (2) un compteur global
            d'utilisation de l'IA et une limitation anti-abus (votre email y est brièvement associé à
            un horodatage, puis supprimé automatiquement après une minute).
          </li>
        </ul>
        <p>Vos données ne sont jamais vendues, ni utilisées à des fins publicitaires.</p>
      </section>

      <section>
        <h2>Cookies et suivi</h2>
        <p>
          L'application utilise un seul cookie, strictement nécessaire à la connexion (session
          chiffrée). Aucun cookie publicitaire, aucun outil d'analyse d'audience ou de suivi
          tiers n'est utilisé.
        </p>
      </section>

      <section>
        <h2>Durée de conservation</h2>
        <p>
          Vos factures et notes de frais restent dans votre Drive tant que vous ne les supprimez pas
          vous-même. Le cookie de session expire automatiquement après un maximum de 180 jours
          d'inactivité. Vous pouvez vous déconnecter à tout moment depuis les réglages de
          l'application.
        </p>
      </section>

      <section>
        <h2>Vos droits</h2>
        <p>
          Vos notes de frais étant stockées sur votre propre Google Drive, vous en gardez à tout
          moment le contrôle total (accès, modification, export, suppression) sans avoir à passer par
          le développeur de l'application. Pour toute question sur les données partagées décrites
          ci-dessus (cache de structures de factures, compteurs d'usage), vous pouvez contacter le
          développeur à l'adresse ci-dessous.
        </p>
      </section>

      <section>
        <h2>Sécurité</h2>
        <p>
          La connexion à votre compte Google est chiffrée et n'est jamais accessible en clair par
          l'application elle-même. Les échanges avec les services tiers (Anthropic, Supabase) se
          font exclusivement depuis les serveurs de l'application, jamais directement depuis votre
          navigateur.
        </p>
      </section>

      <section>
        <h2>Modifications</h2>
        <p>
          Cette politique peut évoluer si l'application change. La date de dernière mise à jour en
          haut de cette page reflète toute modification.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Pour toute question concernant cette politique ou vos données, vous pouvez contacter le
          développeur de l'application à l'adresse : <a href="mailto:samon.nicolas@gmail.com">samon.nicolas@gmail.com</a>.
        </p>
      </section>
    </div>
  );
}
