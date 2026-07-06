import { groep4ContextsommenPrompt } from './groep4-contextsommen'
import { groep5ContextsommenPrompt } from './groep5-contextsommen'

const promptBuilders: Record<string, (amount: number) => string> = {
  '4-contextsommen': groep4ContextsommenPrompt,
  '5-contextsommen': groep5ContextsommenPrompt,
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
