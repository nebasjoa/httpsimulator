import type { RequestConfig, Scenario } from '../types';
import { assembleExchange } from './shared';

const presetRequest: RequestConfig = {
  method: 'POST',
  https: true,
  host: 'pay.computop.com',
  path: '/paymentpage',
  contentType: 'application/x-www-form-urlencoded',
  body: 'MerchantID=Test&Amount=1999&Currency=EUR',
  extraHeaders: [],
};

export const simpleRequestScenario: Scenario = {
  id: 'simple-request',
  title: 'Single request / response',
  description: 'Full connection story (DNS → TCP → TLS → request → response) for one exchange with a selectable status code.',
  build: assembleExchange,
  presetRequest,
  presetServer: { statusCode: 200 },
};
