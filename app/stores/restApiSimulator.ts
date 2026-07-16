import { defineStore } from 'pinia';
import type { HttpMethod } from '../../rest-engine/types';
import { getMethodInfo } from '../../rest-engine/methodCatalog';
import { getAuthScheme } from '../../rest-engine/authSchemes';
import { getQueryParamExample } from '../../rest-engine/queryParams';

export const useRestApiSimulatorStore = defineStore('restApiSimulator', {
  state: () => ({
    selectedMethod: 'GET' as HttpMethod,
    selectedAuthSchemeId: 'none' as string,
    selectedQueryParamId: 'test' as string,
    activeGlossaryTerm: null as string | null,
  }),

  getters: {
    methodInfo: (state) => getMethodInfo(state.selectedMethod),
    authScheme: (state) => getAuthScheme(state.selectedAuthSchemeId),
    queryParamExample: (state) => getQueryParamExample(state.selectedQueryParamId),
  },

  actions: {
    selectMethod(method: HttpMethod) {
      this.selectedMethod = method;
    },
    selectAuthScheme(id: string) {
      this.selectedAuthSchemeId = id;
    },
    selectQueryParam(id: string) {
      this.selectedQueryParamId = id;
    },
    setActiveGlossaryTerm(term: string | null) {
      this.activeGlossaryTerm = this.activeGlossaryTerm === term ? null : term;
    },
  },
});
