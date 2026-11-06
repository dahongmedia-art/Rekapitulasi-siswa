const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium, expect } = require('@playwright/test');

const dateLabel = /tanggal\s+cetak\s*:|(?<!yang\s)dicetak\s*:/i;

(async () => {
  const reportFiles = [
    'src/components/print-section.tsx',
    'src/components/attendance-section.tsx',
    'src/components/school-attendance-section.tsx',
    'src/components/export-section.tsx',
  ];
  for (const file of reportFiles) {
    const source = await fs.readFile(file, 'utf8');
    assert.doesNotMatch(source, dateLabel, `${file} must not render a print date`);
    assert.doesNotMatch(source, /formatDateIndonesia\(new Date\(\)\)/, `${file} must not auto-date the signature`);
    if (!file.includes('school-attendance-section')) {
      assert.doesNotMatch(source, /formatDateTimeIndonesia\(new Date\(\)\)/, `${file} must not render print timestamps`);
    }
  }
  const printSource = await fs.readFile(reportFiles[0], 'utf8');
  const exportSource = await fs.readFile(reportFiles[3], 'utf8');
  assert.ok(printSource.includes('formatDateIndonesia(item.tanggalLahir)'));
  assert.ok(exportSource.includes('formatDateIndonesia(item.tanggalLahir)'));
  const backupSource = await fs.readFile('src/components/backup-section.tsx', 'utf8');
  assert.match(backupSource, /formatDateTimeIndonesia\((?:item|entry)\.createdAt\)/);
  console.log('PASS: print dates removed from all source templates; birth dates and backup dates retained');

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => { window.print = () => { window.__printCalled = true; }; });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = process.env.APP_BASE_URL || 'http://127.0.0.1:3000';

  try {
    const response = await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.getByRole('button', { name: /Cetak Laporan/ }).click();
    for (const type of ['daftar', 'kelas', 'attendance', 'attendance_school', 'rekap', 'gender', 'usia', 'dashboard']) {
      await page.locator('select').first().selectOption(type);
      await expect(page.locator('.print-report')).toBeVisible();
      assert.doesNotMatch(await page.locator('.print-report').innerText(), dateLabel);
      await expect(page.locator('.print-report')).toContainText('Tahun Pelajaran');
      await expect(page.locator('.print-report footer')).toContainText('Kepala Sekolah');
    }
    await page.locator('select').first().selectOption('usia');
    const periodSelector = page.locator('select').filter({ has: page.locator('option[value="semester"]') });
    for (const period of ['bulan', 'semester', 'tahun']) {
      await periodSelector.selectOption(period);
      assert.doesNotMatch(await page.locator('.print-report').innerText(), dateLabel);
    }
    console.log('PASS: all print report types and age periods render without print date');

    await page.getByRole('button', { name: /Absensi 1 Sekolah/ }).click();
    await expect(page.locator('.school-attendance-preview .print-report')).toBeVisible();
    assert.doesNotMatch(await page.locator('.school-attendance-preview .print-report').innerText(), dateLabel);
    await expect(page.locator('.school-attendance-preview .print-report')).toContainText('TOTAL SEKOLAH');
    await page.getByRole('button', { name: 'Cetak Rekap Sekolah', exact: true }).click();
    await expect.poll(() => page.evaluate(() => Boolean(window.__printCalled))).toBe(true);
    const schoolDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    const schoolDownload = await schoolDownloadPromise;
    await schoolDownload.saveAs('/tmp/school-recap-without-print-date.pdf');
    const schoolPdf = await fs.readFile('/tmp/school-recap-without-print-date.pdf');
    assert.equal(schoolPdf.subarray(0, 4).toString(), '%PDF');
    assert.doesNotMatch(schoolPdf.toString('latin1'), dateLabel);
    assert.match(schoolPdf.toString('latin1'), /TOTAL SEKOLAH/);
    assert.match(schoolPdf.toString('latin1'), /Halaman/);
    console.log('PASS: school attendance preview, print action, and PDF keep totals and page numbers without print date');

    await page.getByRole('button', { name: /Export Data/ }).click();
    await expect(page.locator('.export-print-report')).toBeVisible();
    assert.doesNotMatch(await page.locator('.export-print-report').innerText(), dateLabel);
    const studentDownloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export PDF/ }).click();
    const studentDownload = await studentDownloadPromise;
    await studentDownload.saveAs('/tmp/student-report-without-print-date.pdf');
    const studentPdf = await fs.readFile('/tmp/student-report-without-print-date.pdf');
    assert.equal(studentPdf.subarray(0, 4).toString(), '%PDF');
    assert.doesNotMatch(studentPdf.toString('latin1'), dateLabel);
    assert.match(studentPdf.toString('latin1'), /LAPORAN DATA SISWA/);
    assert.deepEqual(errors, []);
    console.log('PASS: student export preview and PDF without print date; browser has no uncaught errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
