import { groep4AftrekkenPrompt } from './groep4-aftrekken'
import { groep4BegrijpendLezenPrompt } from './groep4-begrijpend-lezen'
import { groep4ContextsommenPrompt } from './groep4-contextsommen'
import { groep4OptellenPrompt } from './groep4-optellen'
import { groep4SpellingPrompt } from './groep4-spelling'
import { groep4TafelsPrompt } from './groep4-tafels'
import { groep4WoordenschatPrompt } from './groep4-woordenschat'
import { groep5AftrekkenGroteGetallenPrompt } from './groep5-aftrekken-grote-getallen'
import { groep5ContextsommenPrompt } from './groep5-contextsommen'
import { groep5DelenPrompt } from './groep5-delen'
import { groep5OptellenGroteGetallenPrompt } from './groep5-optellen-grote-getallen'
import { groep5TafelAutomatiserenPrompt } from './groep5-tafel-automatiseren'
import { groep5VermenigvuldigenPrompt } from './groep5-vermenigvuldigen'

const promptBuilders: Record<string, (amount: number) => string> = {
  '4-aftrekken': groep4AftrekkenPrompt,
  '4-begrijpend-lezen': groep4BegrijpendLezenPrompt,
  '4-contextsommen': groep4ContextsommenPrompt,
  '4-optellen': groep4OptellenPrompt,
  '4-spelling': groep4SpellingPrompt,
  '4-tafels': groep4TafelsPrompt,
  '4-woordenschat': groep4WoordenschatPrompt,
  '5-aftrekken-grote-getallen': groep5AftrekkenGroteGetallenPrompt,
  '5-contextsommen': groep5ContextsommenPrompt,
  '5-delen': groep5DelenPrompt,
  '5-optellen-grote-getallen': groep5OptellenGroteGetallenPrompt,
  '5-tafel-automatiseren': groep5TafelAutomatiserenPrompt,
  '5-vermenigvuldigen': groep5VermenigvuldigenPrompt,
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
