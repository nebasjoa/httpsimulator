import { test, expect, type Page } from '@playwright/test';

const marker = (page: Page, label: string) => page.locator(`.timeline .marker[title="${label}"]`);

async function openMtlsScenario(page: Page) {
  await page.goto('/');
  await page.locator('.scenario-picker select').selectOption('mtls-s2s');
}

test('mtls-s2s emits the TLS 1.3 mutual-auth handshake in order, then the API exchange', async ({ page }) => {
  await openMtlsScenario(page);

  await expect(page.locator('.lifeline-label')).toHaveText(['Merchant server', 'Gateway API']);

  const titles = await page.locator('.timeline .marker').evaluateAll((els) => els.map((e) => e.getAttribute('title')));
  expect(titles).toEqual([
    'DNS lookup',
    'SYN',
    'SYN-ACK',
    'ACK',
    'ClientHello',
    'ServerHello',
    '{EncryptedExtensions, CertificateRequest}',
    '{Certificate, CertificateVerify, Finished}',
    '{Certificate}',
    '{CertificateVerify}',
    '{Finished}',
    'Verify client certificate',
    'POST /kvp/create',
    'Map certificate → merchant',
    'HTTP/1.1 201 Created',
    'Connection: keep-alive',
  ]);

  // CertificateRequest is the message that makes it mutual
  await marker(page, '{EncryptedExtensions, CertificateRequest}').click();
  await expect(page.locator('.event-detail')).toContainText('Computop Client CA G2');

  await marker(page, '{Certificate}').click();
  await expect(page.locator('.event-detail')).toContainText('CN=merchant-284500');

  // The request carries no Authorization header - the connection already authenticated the caller
  const pair = page.locator('.wire-pair');
  await expect(pair).toHaveCount(1);
  await expect(pair).toContainText('POST /kvp/create HTTP/1.1');
  await expect(pair).not.toContainText('Authorization:');
  await expect(pair).toContainText('HTTP/1.1 201 Created');
});

test('edge-proxy termination forwards the verified identity in X-Forwarded-Client-Cert', async ({ page }) => {
  await openMtlsScenario(page);
  await page.getByLabel('Where TLS ends').selectOption('edge-proxy');

  await expect(page.locator('.lifeline-label')).toHaveText(['Merchant server', 'Edge proxy', 'Gateway API']);

  const pairs = page.locator('.wire-pair');
  await expect(pairs).toHaveCount(2);
  // outer hop: merchant ↔ proxy, still answered by the relayed response
  await expect(pairs.nth(0)).toContainText('Merchant server → Edge proxy');
  await expect(pairs.nth(0)).not.toContainText('X-Forwarded-Client-Cert');
  await expect(pairs.nth(0)).toContainText('HTTP/1.1 201 Created');
  // inner hop: proxy → app carries the identity as a plain header
  await expect(pairs.nth(1)).toContainText('Edge proxy → Gateway API');
  await expect(pairs.nth(1)).toContainText('X-Forwarded-Client-Cert: Hash=9f2c51d07be3a8e41a;Subject="CN=merchant-284500,O=Example Shop GmbH"');
  await expect(pairs.nth(1)).toContainText('HTTP/1.1 201 Created');
});

for (const [mode, alert] of [
  ['mtls-no-cert', 'TLS alert: certificate_required'],
  ['mtls-unknown-ca', 'TLS alert: unknown_ca'],
  ['mtls-expired', 'TLS alert: certificate_expired'],
] as const) {
  test(`${mode} ends the handshake with ${alert} and no HTTP exchange`, async ({ page }) => {
    await openMtlsScenario(page);
    await page.locator('.server-config select').selectOption(mode);

    await expect(page.locator('.wire-pair')).toHaveCount(0);
    await page.locator('.timeline .marker').last().click();
    await expect(page.locator('.event-detail')).toContainText(alert);
  });
}

test('mTLS toggle works on simple-request and gates the mTLS failure modes', async ({ page }) => {
  await page.goto('/');

  const noCert = page.locator('.server-config option[value="mtls-no-cert"]');
  await expect(noCert).toHaveAttribute('disabled', '');
  await expect(marker(page, '{EncryptedExtensions, CertificateRequest}')).toHaveCount(0);

  const toggle = page.getByLabel('Mutual TLS (client certificate)');
  await toggle.check();
  await expect(marker(page, '{EncryptedExtensions, CertificateRequest}')).toHaveCount(1);
  await expect(noCert).not.toHaveAttribute('disabled');

  // turning mTLS off resets an mTLS failure mode instead of leaving it silently ignored
  await page.locator('.server-config select').selectOption('mtls-expired');
  await toggle.uncheck();
  await expect(page.locator('.server-config select')).toHaveValue('none');
  await expect(page.locator('.wire-pair')).toHaveCount(1);
});
