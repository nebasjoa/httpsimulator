import type { RequestConfig, Scenario } from '../types';
import { assembleExchange } from './shared';

const presetRequest: RequestConfig = {
  method: 'POST',
  https: true,
  host: 'pay.computop.com',
  path: '/paymentpage/submit',
  contentType: 'application/x-www-form-urlencoded',
  body: 'CardNumber=4111111111111111&Amount=1999&Currency=EUR&TransID=TX-1029384',
  extraHeaders: [],
};

export const formPostScenario: Scenario = {
  id: 'form-post',
  title: 'Form POST (x-www-form-urlencoded)',
  description: 'The merchant\'s .aspx POST shape: card data submitted as a form-encoded body.',
  build: assembleExchange,
  presetRequest,
  presetServer: { statusCode: 200 },
};
