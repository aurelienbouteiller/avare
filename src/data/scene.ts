/* ---------- texte de la scène, blocs, notes de jeu et plan de répétition ---------- */
import type { Block, Line, Mask, Note, PlanDay, RawEntry, Seg, Tol } from '../types';

export const RAW: readonly RawEntry[] = [
  1,
  ['H', "Tout va comme il faut. Hé bien, qu'est-ce, Frosine ?"],
  ['F', 'Ah, mon Dieu ! Que vous vous portez bien ! Et que vous avez là un vrai visage de santé !'],
  ['H', 'Qui moi ?'],
  ['F', 'Jamais je ne vous vis un teint si frais et si gaillard.'],
  ['H', 'Tout de bon ?'],
  [
    'F',
    "Comment ? Vous n'avez de votre vie été si jeune que vous êtes ; et je vois des gens de vingt-cinq ans qui sont plus vieux que vous.",
  ],
  ['H', "Cependant, Frosine, j'en ai soixante bien comptés."],
  [
    'F',
    "Hé bien ! Qu'est-ce que cela, soixante ans ? Voilà bien de quoi ! C'est la fleur de l'âge cela ; et vous entrez maintenant dans la belle saison de l'homme.",
  ],
  ['H', 'Il est vrai ; mais vingt années de moins pourtant ne me feraient point de mal, que je crois.'],
  ['F', "Vous moquez-vous ? Vous n'avez pas besoin de cela ; et vous êtes d'une pâte à vivre jusques à cent ans."],
  ['H', 'Tu le crois !'],
  [
    'F',
    'Assurément. Vous en avez toutes les marques. Tenez-vous un peu. Ô que voilà bien là entre vos deux yeux un signe de longue vie !',
  ],
  ['H', 'Tu te connais à cela ?'],
  ['F', 'Sans doute. Montrez-moi votre main. Ah mon Dieu ! Quelle ligne de vie !'],
  ['H', 'Comment ?'],
  ['F', "Ne voyez-vous pas jusqu'où va cette ligne-là ?"],
  ['H', "Hé bien, qu'est-ce que cela veut dire ?"],
  ['F', 'Par ma foi, je disais cent ans, mais vous passerez les six-vingts.'],
  ['H', 'Est-il possible ?'],
  [
    'F',
    'Il faudra vous assommer, vous dis-je ; et vous mettrez en terre et vos enfants, et les enfants de vos enfants.',
  ],
  ['H', 'Tant mieux. Comment va notre affaire ?'],
  2,
  [
    'F',
    "Faut-il le demander ? Et me voit-on mêler de rien dont je ne vienne à bout ? J'ai, surtout, pour les mariages, un talent merveilleux. Il n'est point de partis au monde, que je ne trouve en peu de temps le moyen d'accoupler ; et je crois, si je me l'étais mis en tête, que je marierais le Grand Turc avec la République de Venise. Il n'y avait pas sans doute de si grandes difficultés à cette affaire-ci. Comme j'ai commercé chez elles, je les ai à fond l'une et l'autre entretenues de vous, et j'ai dit à la mère le dessein que vous aviez conçu pour Mariane, à la voir passer dans la rue, et prendre l'air à sa fenêtre.",
  ],
  ['H', 'Qui a fait réponse...'],
  [
    'F',
    "Elle a reçu la proposition avec joie, et quand je lui ai témoigné que vous souhaitiez fort que sa fille assistât ce soir au contrat de mariage qui se doit faire de la vôtre, elle y a consenti sans peine, et me l'a confiée pour cela.",
  ],
  [
    'H',
    "C'est que je suis obligé, Frosine, de donner à souper au Seigneur Anselme ; et je serai bien aise qu'elle soit du régale.",
  ],
  [
    'F',
    "Vous avez raison. Elle doit après dîné rendre visite à votre fille, d'où elle fait son compte d'aller faire un tour à la Foire, pour venir ensuite au soupé.",
  ],
  ['H', 'Hé bien, elles iront ensemble dans mon carrosse, que je leur prêterai.'],
  3,
  ['F', 'Voilà justement son affaire.'],
  [
    'H',
    "Mais, Frosine, as-tu entretenu la mère touchant le bien qu'elle peut donner à sa fille ? Lui as-tu dit qu'il fallait qu'elle s'aidât un peu, qu'elle fît quelque effort, qu'elle se saignât pour une occasion comme celle-ci ? Car encore n'épouse-t-on point une fille, sans qu'elle apporte quelque chose.",
  ],
  ['F', "Comment ? C'est une fille qui vous apportera douze mille livres de rente."],
  ['H', 'Douze mille livres de rente !'],
  [
    'F',
    "Oui. Premièrement, elle est nourrie et élevée dans une grande épargne de bouche. C'est une fille accoutumée à vivre de salade, de lait, de fromage et de pommes, et à laquelle par conséquent il ne faudra ni table bien servie, ni consommés exquis, ni orges mondés perpétuels, ni les autres délicatesses qu'il faudrait pour une autre femme ; et cela ne va pas à si peu de chose, qu'il ne monte bien, tous les ans, à trois mille francs pour le moins. Outre cela, elle n'est curieuse que d'une propreté fort simple, et n'aime point les superbes habits, ni les riches bijoux, ni les meubles somptueux, où donnent ses pareilles avec tant de chaleur ; et cet article-là vaut plus de quatre mille livres par an. De plus, elle a une aversion horrible pour le jeu, ce qui n'est pas commun aux femmes d'aujourd'hui ; et j'en sais une de nos quartiers qui a perdu, à trente-et-quarante, vingt mille francs cette année. Mais n'en prenons rien que le quart. Cinq mille francs au jeu par an, et quatre mille francs en habits et bijoux, cela fait neuf mille livres ; et mille écus que nous mettons pour la nourriture, ne voilà-t-il pas par année vos douze mille francs bien comptés ?",
  ],
  ['H', "Oui, cela n'est pas mal ; mais ce compte-là n'est rien de réel."],
  [
    'F',
    "Pardonnez-moi. N'est-ce pas quelque chose de réel, que de vous apporter en mariage une grande sobriété ; l'héritage d'un grand amour de simplicité de parure, et l'acquisition d'un grand fonds de haine pour le jeu ?",
  ],
  [
    'H',
    "C'est une raillerie, que de vouloir me constituer son dot de toutes les dépenses qu'elle ne fera point. Je n'irai pas donner quittance de ce que je ne reçois pas ; et il faut bien que je touche quelque chose.",
  ],
  4,
  [
    'F',
    "Mon Dieu, vous toucherez assez ; et elles m'ont parlé d'un certain pays, où elles ont du bien, dont vous serez le maître.",
  ],
  [
    'H',
    "Il faudra voir cela. Mais, Frosine, il y encore une chose qui m'inquiète. La fille est jeune, comme tu vois ; et les jeunes gens d'ordinaire n'aiment que leurs semblables, ne cherchent que leur compagnie. J'ai peur qu'un homme de mon âge ne soit pas de son goût ; et que cela ne vienne à produire chez moi certains petits désordres qui ne m'accommoderaient pas.",
  ],
  [
    'F',
    "Ah que vous la connaissez mal ! C'est encore une particularité que j'avais à vous dire. Elle a une aversion épouvantable pour tous les jeunes gens, et n'a de l'amour que pour les vieillards.",
  ],
  ['H', 'Elle ?'],
  [
    'F',
    "Oui, elle. Je voudrais que vous l'eussiez entendu parler là-dessus. Elle ne peut souffrir du tout la vue d'un jeune homme ; mais elle n'est point plus ravie, dit-elle, que lorsqu'elle peut voir un beau vieillard avec une barbe majestueuse. Les plus vieux sont pour elle les plus charmants, et je vous avertis de n'aller pas vous faire plus jeune que vous êtes. Elle veut tout au moins qu'on soit sexagénaire ; et il n'y a pas quatre mois encore, qu'étant prête d'être mariée, elle rompit tout net le mariage, sur ce que son amant fit voir qu'il n'avait que cinquante-six ans, et qu'il ne prit point de lunettes pour signer le contrat.",
  ],
  ['H', 'Sur cela seulement ?'],
  [
    'F',
    "Oui. Elle dit que ce n'est pas contentement pour elle que cinquante-six ans ; et surtout, elle est pour les nez qui portent des lunettes.",
  ],
  ['H', 'Certes, tu me dis là une chose toute nouvelle.'],
  [
    'F',
    "Cela va plus loin qu'on ne vous peut dire. On lui voit dans sa chambre quelques tableaux et quelques estampes ; mais que pensez-vous que ce soit ? Des Adonis ? Des Céphales ? Des Pâris ? Et des Apollons ? Non : de beaux portraits de Saturne, du roi Priam, du vieux Nestor, et du bon père Anchise sur les épaules de son fils.",
  ],
  [
    'H',
    "Cela est admirable ! Voilà ce que je n'aurais jamais pensé ; et je suis bien aise d'apprendre qu'elle est de cette humeur. En effet, si j'avais été femme, je n'aurais point aimé les jeunes hommes.",
  ],
  5,
  [
    'F',
    'Je le crois bien. Voilà de belles drogues que des jeunes gens, pour les aimer ! Ce sont de beaux morveux, de beaux godelureaux, pour donner envie de leur peau ; et je voudrais bien savoir quel ragoût il y a à eux.',
  ],
  ['H', "Pour moi, je n'y en comprends point ; et je ne sais pas comment il y a des femmes qui les aiment tant."],
  [
    'F',
    "Il faut être folle fieffée. Trouver la jeunesse aimable ! Est-ce avoir le sens commun ? Sont-ce des hommes que de jeunes blondins ? Et peut-on s'attacher à ces animaux-là ?",
  ],
  [
    'H',
    "C'est ce que je dis tous les jours, avec leur ton de poule laitée, et leurs trois petits brins de barbe relevés en barbe de chat, leurs perruques d'étoupes, leurs hauts-de-chausses tout tombants, et leurs estomacs débraillés.",
  ],
  [
    'F',
    "Eh ! Cela est bien bâti, auprès d'une personne comme vous. Voilà un homme cela. Il y a là de quoi satisfaire à la vue ; et c'est ainsi qu'il faut être fait, et vêtu, pour donner de l'amour.",
  ],
  ['H', 'Tu me trouves bien ?'],
  [
    'F',
    "Comment ? Vous êtes à ravir, et votre figure est à peindre. Tournez-vous un peu, s'il vous plaît. Il ne se peut pas mieux. Que je vous voie marcher. Voilà un corps taillé, libre, et dégagé comme il faut, et qui ne marque aucune incommodité.",
  ],
  ['H', "Je n'en ai pas de grandes, Dieu merci. Il n'y a que ma fluxion, qui me prend de temps en temps."],
  ['F', "Cela n'est rien. Votre fluxion ne vous sied point mal, et vous avez grâce à tousser."],
  ['H', "Dis-moi un peu : Mariane ne m'a-t-elle point encore vu ? N'a-t-elle point pris garde à moi en passant ?"],
  [
    'F',
    "Non. Mais nous nous sommes fort entretenues de vous. Je lui ai fait un portrait de votre personne ; et je n'ai pas manqué de lui vanter votre mérite, et l'avantage que ce lui serait d'avoir un mari comme vous.",
  ],
  ['H', "Tu as bien fait, et je t'en remercie."],
  6,
  [
    'F',
    "J'aurais, Monsieur, une petite prière à vous faire. {Il prend un air sévère.} J'ai un procès que je suis sur le point de perdre, faute d'un peu d'argent ; et vous pourriez facilement me procurer le gain de ce procès, si vous aviez quelque bonté pour moi. {Il reprend un air gai.} Vous ne sauriez croire le plaisir qu'elle aura de vous voir. Ah ! Que vous lui plairez ! Et que votre fraise à l'antique fera sur son esprit un effet admirable ! Mais surtout elle sera charmée de votre haut-de-chausses, attaché au pourpoint avec des aiguillettes. C'est pour la rendre folle de vous ; et un amant aiguilleté sera pour elle un ragoût merveilleux.",
  ],
  ['H', 'Certes, tu me ravis de me dire cela.'],
  [
    'F',
    "{Il reprend son visage sévère.} En vérité, Monsieur, ce procès m'est d'une conséquence tout à fait grande. Je suis ruinée, si je le perds ; et quelque petite assistance me rétablirait mes affaires. {Il reprend un air gai.} Je voudrais que vous eussiez vu le ravissement où elle était à m'entendre parler de vous. La joie éclatait dans ses yeux, au récit de vos qualités ; et je l'ai mise enfin dans une impatience extrême de voir ce mariage entièrement conclu.",
  ],
  ['H', "Tu m'as fait grand plaisir, Frosine ; et je t'en ai, je te l'avoue, toutes les obligations du monde."],
  [
    'F',
    '{Il reprend son air sérieux.} Je vous prie, Monsieur, de me donner le petit secours que je vous demande. Cela me remettra sur pied ; et je vous en serai éternellement obligée.',
  ],
  ['H', 'Adieu. Je vais achever mes dépêches.'],
  ['F', 'Je vous assure, Monsieur, que vous ne sauriez jamais me soulager dans un plus grand besoin.'],
  ['H', 'Je mettrai ordre que mon carrosse soit tout prêt pour vous mener à la Foire.'],
  ['F', "Je ne vous importunerais pas, si je ne m'y voyais forcée par la nécessité."],
  ['H', "Et j'aurai soin qu'on soupe de bonne heure, pour ne vous point faire malades."],
  ['F', 'Ne me refusez pas la grâce dont je vous sollicite. Vous ne sauriez croire, Monsieur, le plaisir que...'],
  ['H', "Je m'en vais. Voilà qu'on m'appelle. Jusqu'à tantôt."],
  [
    'F',
    "Que la fièvre te serre, chien de vilain à tous les diables. Le ladre a été ferme à toutes mes attaques : mais il ne me faut pas pourtant quitter la négociation ; et j'ai l'autre côté, en tout cas, d'où je suis assurée de tirer bonne récompense.",
    'fin',
  ],
];

export const BLOCKS: readonly Block[] = [
  { n: 0, label: 'Scène entière', short: 'La scène' },
  { n: 1, label: '1. Ta santé', short: 'Ta santé' },
  { n: 2, label: '2. Le souper', short: 'Le souper' },
  { n: 3, label: '3. La dot', short: 'La dot' },
  { n: 4, label: '4. Ton âge', short: 'Ton âge' },
  { n: 5, label: '5. Ton physique', short: 'Ton physique' },
  { n: 6, label: "6. L'esquive", short: "L'esquive" },
];
export const NOTES: Record<number, Note> = {
  0: {
    obj: "Harpagon croit mener la négociation, mais c'est Frosine qui la mène.",
    jeu: 'Il avale toutes les flatteries sans méfiance, sauf quand on touche à son argent : là, il redevient lucide et dur.',
  },
  1: {
    obj: 'Se faire rassurer sur son âge.',
    jeu: "Un peu méfiant au début (« Qui moi ? »), puis il se laisse gagner. « Tant mieux » après l'idée d'enterrer ses enfants : il est ravi, sans aucune gêne. Puis il passe brusquement aux affaires.",
  },
  2: {
    obj: 'Organiser le mariage sans rien dépenser.',
    jeu: "Impatient d'avoir la réponse (« Qui a fait réponse... »). Le carrosse, il le prête, il ne le donne pas : appuie sur « que je leur prêterai ».",
  },
  3: {
    obj: 'Obtenir une dot en argent réel.',
    jeu: "L'avare se réveille. Émerveillé par « douze mille livres de rente », puis déçu et lucide. « C'est une raillerie » : ferme, il ne se laisse pas avoir sur l'argent.",
  },
  4: {
    obj: 'Être rassuré : Mariane peut-elle aimer un vieillard ?',
    jeu: 'Inquiétude sincère au départ, puis surprise (« Elle ? »), curiosité et ravissement croissant. Il finit flatté et sûr de lui.',
  },
  5: {
    obj: 'Se faire admirer.',
    jeu: 'Complice de Frosine contre les jeunes : sa tirade est une moquerie, il peut imiter les « blondins ». Coquet sur « Tu me trouves bien ? ». La fluxion : il peut tousser. Puis vraie curiosité pour Mariane.',
  },
  6: {
    obj: 'Ne rien donner, sans jamais dire non.',
    jeu: "Visage sévère dès qu'elle parle d'argent, gai dès qu'elle parle de Mariane. Ses répliques sont des fuites de plus en plus pressées jusqu'à la sortie.",
  },
};
export const PLAN: readonly PlanDay[] = [
  {
    d: '2026-10-04',
    t: 'Découverte',
    x: 'Lis toute la scène 3 fois à voix haute, avec les deux rôles, sans chercher à mémoriser. Repère les 6 blocs et les « air sévère / air gai ».',
    go: [{ l: 'Lire la scène', p: { mode: 'lire', block: 0 } }],
  },
  {
    d: '2026-10-05',
    t: 'Blocs 1 et 2',
    x: 'Apprends les blocs 1 et 2. Commence en « Un mot sur deux », puis passe aux « Initiales » et enfin aux « Pièces ».',
    go: [
      { l: 'Bloc 1', p: { block: 1, mask: 'moitie' } },
      { l: 'Bloc 2', p: { block: 2, mask: 'moitie' } },
    ],
  },
  {
    d: '2026-10-06',
    t: 'Bloc 3',
    x: 'Apprends le bloc 3, le plus dense, puis révise les blocs 1 et 2.',
    go: [
      { l: 'Bloc 3', p: { block: 3, mask: 'moitie' } },
      { l: 'Révision bloc 1', p: { block: 1, mask: 'coins' } },
      { l: 'Révision bloc 2', p: { block: 2, mask: 'coins' } },
    ],
  },
  {
    d: '2026-10-07',
    t: 'Bloc 4',
    x: 'Apprends le bloc 4, puis révise le bloc 3.',
    go: [
      { l: 'Bloc 4', p: { block: 4, mask: 'moitie' } },
      { l: 'Révision bloc 3', p: { block: 3, mask: 'coins' } },
    ],
  },
  {
    d: '2026-10-08',
    t: 'Bloc 5',
    x: 'Apprends le bloc 5, puis révise le bloc 4.',
    go: [
      { l: 'Bloc 5', p: { block: 5, mask: 'moitie' } },
      { l: 'Révision bloc 4', p: { block: 4, mask: 'coins' } },
    ],
  },
  {
    d: '2026-10-09',
    t: 'Bloc 6 et enchaînement',
    x: 'Apprends le bloc 6, puis enchaîne toute la scène avec les initiales en appui.',
    go: [
      { l: 'Bloc 6', p: { block: 6, mask: 'moitie' } },
      { l: 'Toute la scène', p: { block: 0, mask: 'initiales' } },
    ],
  },
  {
    d: '2026-10-10',
    t: 'Toute la scène',
    x: "Joue toute la scène, répliques cachées. Enregistre-toi pour réécouter ton intonation ensuite dans l'onglet Lire.",
    go: [{ l: "Scène en m'enregistrant", p: { block: 0, mask: 'coins', check: 'rec' } }],
  },
  {
    d: '2026-10-11',
    t: 'Sans texte',
    x: 'Premier vrai passage sans texte, avec la vérification à la voix. Les répliques ratées sont gardées pour demain.',
    go: [{ l: 'Scène, vérification à la voix', p: { block: 0, mask: 'coins', check: 'voix' } }],
  },
  {
    d: '2026-10-12',
    t: 'Les trous',
    x: 'Ne retravaille que les répliques à revoir. 20 minutes maximum.',
    go: [{ l: 'Mes répliques à revoir', p: { block: 0, mask: 'coins', only: true } }],
  },
  {
    d: '2026-10-13',
    t: 'Debout et dans le désordre',
    x: "Joue debout, avec les déplacements. Puis les répliques dans le désordre : tu dois pouvoir repartir de n'importe où.",
    go: [
      { l: 'Scène debout', p: { block: 0, mask: 'coins' } },
      { l: 'Dans le désordre', p: { block: 0, mask: 'coins', order: 'hasard' } },
    ],
  },
  {
    d: '2026-10-14',
    t: 'Partenaire inconnue',
    x: 'Active la partenaire imprévisible : quatre voix, des débits et des temps de réaction qui changent.',
    go: [{ l: 'Partenaire imprévisible', p: { block: 0, mask: 'coins', wild: true } }],
  },
  {
    d: '2026-10-15',
    t: 'Dernier filage',
    x: 'Un seul passage complet, le plus tôt possible, puis repos. Relis le texte juste avant de dormir.',
    go: [
      { l: 'Un passage complet', p: { block: 0, mask: 'coins' } },
      { l: 'Relire avant de dormir', p: { mode: 'lire', block: 0 } },
    ],
  },
  {
    d: '2026-10-16',
    t: 'Jour J',
    x: 'Une relecture légère le matin, et rien de nouveau. Bonne représentation !',
    go: [{ l: 'Relecture', p: { mode: 'lire', block: 0 } }],
  },
];
export const MASKS: readonly (readonly [Mask, string])[] = [
  ['coins', 'Pièces'],
  ['initiales', 'Initiales'],
  ['moitie', 'Un mot sur deux'],
  ['visible', 'Visible'],
];
export const TOL: Record<Tol, number> = { stricte: 0.95, normale: 0.85, souple: 0.7 };

function parseSegs(t: string): Seg[] {
  return t
    .split(/(\{[^}]+\})/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s[0] === '{' ? { d: s.slice(1, -1) } : { t: s }));
}
/** Indices des répliques d'un bloc (0 : toute la scène). */
export function blockLines(b: number) {
  return LINES.map((_l, i) => i).filter((i) => b === 0 || LINES[i].b === b);
}
export const LINES: Line[] = [];
(() => {
  let cb = 1;
  for (const r of RAW) {
    if (typeof r === 'number') {
      cb = r;
      continue;
    }
    const [w, t, flag] = r;
    LINES.push({ w, t, b: cb, end: flag === 'fin', segs: w === 'F' ? parseSegs(t) : null });
  }
})();
