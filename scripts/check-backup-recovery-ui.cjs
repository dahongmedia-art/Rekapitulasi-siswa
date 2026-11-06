const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const {chromium, expect} = require('@playwright/test');
const base = process.env.APP_BASE_URL || 'http://127.0.0.1:3000';
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    const initialResponse = await page.request.get(`${base}/api/students?all=1`);
    assert.equal(initialResponse.status(), 200);
    const initial = await initialResponse.json();
    const count = initial.data.length;
    assert.ok(count > 0, 'Existing user data must be present');
    const beforeDigest = digest(initial.data);

    await page.goto(`${base}/?tab=students`, {waitUntil: 'networkidle'});
    await expect(page.getByRole('heading', {name: 'Data Siswa', exact: true})).toBeVisible();
    await expect(page.getByText(`Total tersimpan: ${count} siswa`, {exact: true})).toBeVisible();
    await page.getByPlaceholder('Cari nama / NIS / NISN').fill('no-match-recovery-test-984121');
    await expect(page.getByText('Total ditampilkan: 0 siswa', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Reset Filter — Tampilkan Semua', exact: true}).click();
    await expect(page.getByText(`Total ditampilkan: ${count} siswa`, {exact: true})).toBeVisible();
    console.log('PASS: direct Data Siswa link and reset filters reveal existing records');

    await page.goto(`${base}/?tab=backup`, {waitUntil: 'networkidle'});
    await expect(page.getByRole('heading', {name: 'Backup & Pemulihan Data', exact: true})).toBeVisible();
    await expect(page.getByText(`${count} siswa masih tersedia.`, {exact: true})).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', {name: 'Download Backup Lengkap', exact: true}).click();
    const download = await downloadPromise;
    await download.saveAs('/tmp/rekap-recovery-verified-backup.json');
    const text = await fs.readFile('/tmp/rekap-recovery-verified-backup.json', 'utf8');
    const payload = JSON.parse(text);
    assert.equal(payload.format, 'REKAP_SISWA_BACKUP');
    assert.equal(payload.version, 2);
    assert.equal(payload.students.length, count);
    assert.ok(Array.isArray(payload.attendance));
    assert.ok(payload.settings.namaSekolah);
    console.log('PASS: current complete backup downloads all existing students, attendance, and settings');

    const previewButton = page.getByRole('button', {name: 'Pratinjau & Pulihkan', exact: true}).first();
    await expect(previewButton).toBeVisible();
    await previewButton.click();
    const restore = page.getByRole('button', {name: 'Konfirmasi & Pulihkan', exact: true});
    await expect(page.getByRole('heading', {name: 'Pratinjau Pemulihan', exact: true})).toBeVisible();
    await expect(restore).toBeDisabled();
    await expect(page.locator('#restore-mode')).toHaveValue('merge');
    await page.getByRole('checkbox').check();
    await expect(restore).toBeEnabled();
    await page.locator('#restore-mode').selectOption('replace');
    await expect(restore).toBeDisabled();
    await page.getByRole('button', {name: 'Batalkan Pemulihan', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Pratinjau Pemulihan', exact: true})).toHaveCount(0);
    console.log('PASS: history preview requires explicit confirmation; changing mode clears confirmation; cancel is non-destructive');

    const input = page.getByLabel('Pilih file backup JSON');
    await input.setInputFiles({name:'invalid-backup.json',mimeType:'application/json',buffer:Buffer.from('{"students":"invalid"}')});
    await expect(page.locator('[role="alert"]').filter({hasText:'File backup tidak valid'})).toBeVisible();
    await input.setInputFiles({name:'valid-backup.json',mimeType:'application/json',buffer:Buffer.from(text)});
    await expect(page.getByRole('heading', {name:'Pratinjau Pemulihan',exact:true})).toBeVisible();
    await expect(restore).toBeDisabled();
    await page.getByRole('button', {name:'Batalkan Pemulihan',exact:true}).click();
    console.log('PASS: invalid backup blocked; valid uploaded file only previews without restoring');

    const noConfirmation = await page.request.post(`${base}/api/backups/restore`, {data:{mode:'replace',backup:payload}});
    assert.equal(noConfirmation.status(),400);
    const invalidBackup = await page.request.post(`${base}/api/backups/restore`, {data:{mode:'replace',confirmed:true,backup:{students:'invalid'}}});
    assert.equal(invalidBackup.status(),400);
    const emptyBackup = await page.request.post(`${base}/api/backups/restore`, {data:{mode:'replace',confirmed:true,backup:{...payload,students:[],attendance:[]}}});
    assert.equal(emptyBackup.status(),400);
    const after = await (await page.request.get(`${base}/api/students?all=1`)).json();
    assert.equal(digest(after.data),beforeDigest);
    console.log('PASS: no-confirmation, malformed, and empty restore rejected; all existing records unchanged');

    await page.setViewportSize({width:390,height:844});
    await expect(page.getByRole('heading',{name:'Backup & Pemulihan Data',exact:true})).toBeVisible();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
    assert.deepEqual(pageErrors,[]);
    console.log('PASS: recovery page works on mobile with no browser exceptions');
    console.log('Verified existing student count:',count);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
