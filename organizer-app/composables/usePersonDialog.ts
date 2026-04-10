import { inject, provide, type InjectionKey } from 'vue'
import type { Person } from '~/types/models'

export interface PersonDialogService {
  openAdd: (prefill?: Partial<Person> | null) => void
}

const personDialogKey: InjectionKey<PersonDialogService> = Symbol('personDialog')

export function providePersonDialog (service: PersonDialogService) {
  provide(personDialogKey, service)
}

export function usePersonDialog (): PersonDialogService | undefined {
  return inject(personDialogKey)
}
