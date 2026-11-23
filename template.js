// Šablona první zprávy. Uprav si podpis a odkaz na portfolio.

export const MY_NAME = 'Jevhen'
export const MY_PORTFOLIO = 'jazzhe-web.store'

export function firstMessage(lead) {
  return `Dobrý den,

jmenuji se ${MY_NAME} a tvořím webové stránky pro malé firmy v Praze. Všiml jsem si, že ${lead.name} zatím nemá vlastní web – přitom většina zákazníků dnes hledá služby nejdřív na Googlu.

Udělal bych vám jednoduchý a moderní web: kdo jste, co nabízíte, ceny, fotky, mapa a tlačítko pro zavolání nebo rezervaci. Funguje skvěle i na mobilu.

Ukázky mé práce: ${MY_PORTFOLIO}

Pokud by vás to zajímalo, rád vám pošlu nezávazný návrh zdarma.

S pozdravem
${MY_NAME}`
}
