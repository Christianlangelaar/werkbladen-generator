import { groep3AftrekkenPrompt } from './groep3-aftrekken'
import { groep3BegrijpendLezenPrompt } from './groep3-begrijpend-lezen'
import { groep3ContextsommenPrompt } from './groep3-contextsommen'
import { groep3OptellenPrompt } from './groep3-optellen'
import { groep3RijmenPrompt } from './groep3-rijmen'
import { groep3SplitsenPrompt } from './groep3-splitsen'
import { groep3WoordenschatPrompt } from './groep3-woordenschat'
import { groep4AftrekkenPrompt } from './groep4-aftrekken'
import { groep4BegrijpendLezenPrompt } from './groep4-begrijpend-lezen'
import { groep4ContextsommenPrompt } from './groep4-contextsommen'
import { groep4OptellenPrompt } from './groep4-optellen'
import { groep4SpellingPrompt } from './groep4-spelling'
import { groep4TafelsPrompt } from './groep4-tafels'
import { groep4WoordenschatPrompt } from './groep4-woordenschat'
import { groep5AftrekkenGroteGetallenPrompt } from './groep5-aftrekken-grote-getallen'
import { groep5BegrijpendLezenPrompt } from './groep5-begrijpend-lezen'
import { groep5ContextsommenPrompt } from './groep5-contextsommen'
import { groep5DelenPrompt } from './groep5-delen'
import { groep5GrammaticaPrompt } from './groep5-grammatica'
import { groep5LeestekensPrompt } from './groep5-leestekens'
import { groep5OptellenGroteGetallenPrompt } from './groep5-optellen-grote-getallen'
import { groep5SpellingPrompt } from './groep5-spelling'
import { groep5TafelAutomatiserenPrompt } from './groep5-tafel-automatiseren'
import { groep5VermenigvuldigenPrompt } from './groep5-vermenigvuldigen'
import { groep5WerkwoordspellingPrompt } from './groep5-werkwoordspelling'
import { groep5WoordenschatPrompt } from './groep5-woordenschat'
import { groep6BegrijpendLezenPrompt } from './groep6-begrijpend-lezen'
import { groep6BreukenPrompt } from './groep6-breuken'
import { groep6ContextsommenPrompt } from './groep6-contextsommen'
import { groep6GrammaticaPrompt } from './groep6-grammatica'
import { groep6KommagetallenPrompt } from './groep6-kommagetallen'
import { groep6ProcentenPrompt } from './groep6-procenten'
import { groep6SpellingPrompt } from './groep6-spelling'
import { groep6VerhoudingenPrompt } from './groep6-verhoudingen'
import { groep6WerkwoordspellingPrompt } from './groep6-werkwoordspelling'
import { groep7BegrijpendLezenPrompt } from './groep7-begrijpend-lezen'
import { groep7BreukenPrompt } from './groep7-breuken'
import { groep7ContextsommenPrompt } from './groep7-contextsommen'
import { groep7EngelsWoordenschatPrompt } from './groep7-engels-woordenschat'
import { groep7GrammaticaPrompt } from './groep7-grammatica'
import { groep7ProcentenPrompt } from './groep7-procenten'
import { groep7SamenvattenPrompt } from './groep7-samenvatten'
import { groep7SchaalPrompt } from './groep7-schaal'
import { groep7WerkwoordspellingPrompt } from './groep7-werkwoordspelling'

const promptBuilders: Record<string, (amount: number) => string> = {
  '3-aftrekken': groep3AftrekkenPrompt,
  '3-begrijpend-lezen': groep3BegrijpendLezenPrompt,
  '3-contextsommen': groep3ContextsommenPrompt,
  '3-optellen': groep3OptellenPrompt,
  '3-rijmen': groep3RijmenPrompt,
  '3-splitsen': groep3SplitsenPrompt,
  '3-woordenschat': groep3WoordenschatPrompt,
  '4-aftrekken': groep4AftrekkenPrompt,
  '4-begrijpend-lezen': groep4BegrijpendLezenPrompt,
  '4-contextsommen': groep4ContextsommenPrompt,
  '4-optellen': groep4OptellenPrompt,
  '4-spelling': groep4SpellingPrompt,
  '4-tafels': groep4TafelsPrompt,
  '4-woordenschat': groep4WoordenschatPrompt,
  '5-aftrekken-grote-getallen': groep5AftrekkenGroteGetallenPrompt,
  '5-begrijpend-lezen': groep5BegrijpendLezenPrompt,
  '5-contextsommen': groep5ContextsommenPrompt,
  '5-delen': groep5DelenPrompt,
  '5-grammatica': groep5GrammaticaPrompt,
  '5-leestekens': groep5LeestekensPrompt,
  '5-optellen-grote-getallen': groep5OptellenGroteGetallenPrompt,
  '5-spelling': groep5SpellingPrompt,
  '5-tafel-automatiseren': groep5TafelAutomatiserenPrompt,
  '5-vermenigvuldigen': groep5VermenigvuldigenPrompt,
  '5-werkwoordspelling': groep5WerkwoordspellingPrompt,
  '5-woordenschat': groep5WoordenschatPrompt,
  '6-begrijpend-lezen': groep6BegrijpendLezenPrompt,
  '6-breuken': groep6BreukenPrompt,
  '6-contextsommen': groep6ContextsommenPrompt,
  '6-grammatica': groep6GrammaticaPrompt,
  '6-kommagetallen': groep6KommagetallenPrompt,
  '6-procenten': groep6ProcentenPrompt,
  '6-spelling': groep6SpellingPrompt,
  '6-verhoudingen': groep6VerhoudingenPrompt,
  '6-werkwoordspelling': groep6WerkwoordspellingPrompt,
  '7-begrijpend-lezen': groep7BegrijpendLezenPrompt,
  '7-breuken': groep7BreukenPrompt,
  '7-contextsommen': groep7ContextsommenPrompt,
  '7-engels-woordenschat': groep7EngelsWoordenschatPrompt,
  '7-grammatica': groep7GrammaticaPrompt,
  '7-procenten': groep7ProcentenPrompt,
  '7-samenvatten': groep7SamenvattenPrompt,
  '7-schaal': groep7SchaalPrompt,
  '7-werkwoordspelling': groep7WerkwoordspellingPrompt,
}

export function getWorksheetPrompt(group: string, exercise: string, amount: number) {
  const promptBuilder = promptBuilders[`${group}-${exercise}`]

  if (promptBuilder) {
    return promptBuilder(amount)
  }

  return [
    `Maak ${amount} korte ${exercise} voor groep ${group}.`,
    'Maak de opdrachten passend bij het Nederlandse basisschoolniveau van deze groep.',
    'Geef alleen JSON terug in deze vorm: {"questions":["1. ...","2. ..."]}.',
  ].join(' ')
}
