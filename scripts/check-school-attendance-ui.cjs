const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { chromium, expect } = require('@playwright/test');
const XLSX = require('xlsx');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = process.env.APP_BASE_URL || 'http://127.0.0.1:3000';
  try {
    const response = await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.getByRole('button', { name: /Absensi 1 Sekolah/ }).click();
    await expect(page.getByRole('heading', { name: 'Rekap Absensi 1 Sekolah', exact: true })).toBeVisible();
    await expect(page.locator('table').first().locator('tbody tr')).toHaveCount(12);
    await expect(page.locator('table').first().getByRole('rowheader', { name: 'TOTAL SEKOLAH', exact: true })).toBeVisible();
    await page.locator('#school-attendance-group').selectOption('kelas');
    await expect(page.locator('table').first().locator('tbody tr')).toHaveCount(6);
    await page.locator('#school-attendance-group').selectOption('rombel');
    await page.locator('#school-attendance-month').selectOption('3');
    await page.locator('#school-attendance-year').fill('1999');
    await expect(page.locator('p[role="alert"]')).toContainText('Masukkan tahun 2000–2100');
    await expect(page.getByRole('button', { name: 'Cetak Rekap Sekolah', exact: true })).toBeDisabled();
    await page.locator('#school-attendance-year').fill('2026');
    await expect(page.locator('table').first().locator('tbody tr')).toHaveCount(12);
    console.log('PASS: school recap navigation, month/year validation, and both grouping modes');

    for (const [label, extension] of [['Export Excel', '.xlsx'], ['Export CSV', '.csv'], ['Download PDF', '.pdf']]) {
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      await page.getByRole('button', { name: label, exact: true }).click();
      const download = await downloadPromise;
      assert.ok(download.suggestedFilename().endsWith(extension));
      const path = `/tmp/school-attendance-ui${extension}`;
      await download.saveAs(path);
      const data = await fs.readFile(path);
      assert.ok(data.length > 50);
      if (extension === '.xlsx') {
        const workbook = XLSX.read(data);
        assert.deepEqual(workbook.SheetNames, ['REKAP SEKOLAH', 'PER ROMBEL', 'PER KELAS', 'RINCIAN SISWA', 'INFORMASI']);
        const summaryRows = XLSX.utils.sheet_to_json(workbook.Sheets['REKAP SEKOLAH']);
        assert.equal(summaryRows.at(-1).Kelas, 'TOTAL SEKOLAH');
      }
      if (extension === '.pdf') assert.equal(data.subarray(0, 4).toString(), '%PDF');
      console.log(`PASS: ${label} download`);
    }

    await page.evaluate(() => { window.print = () => { window.__schoolPrintCalled = true; }; });
    await page.getByRole('button', { name: 'Cetak Rekap Sekolah', exact: true }).click();
    await expect.poll(() => page.evaluate(() => Boolean(window.__schoolPrintCalled))).toBe(true);
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeHidden();
    await expect(page.locator('.school-attendance-preview .print-report')).toBeVisible();
    await page.pdf({ path: '/tmp/school-attendance-print.pdf', format: 'A4', landscape: true, printBackground: true });
    await page.emulateMedia({ media: 'screen' });
    console.log('PASS: report print call, hidden navigation, and A4 document generation');

    await page.getByRole('button', { name: 'Buka Kelas', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Isian Absensi Kelas 1A', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Rekap 1 Sekolah', exact: true }).click();
    await expect(page.locator('#school-attendance-month')).toHaveValue('3');
    await expect(page.locator('#school-attendance-year')).toHaveValue('2026');
    console.log('PASS: class drilldown and selected period preserved');

    await page.getByRole('button', { name: /Cetak Laporan/ }).click();
    await page.locator('select').first().selectOption('attendance_school');
    await expect(page.getByRole('heading', { name: /Rekap Absensi Seluruh Sekolah -/ })).toBeVisible();
    await expect(page.getByText('Tingkat Kelas', { exact: true })).toHaveCount(0);
    await page.locator('#print-school-grouping').selectOption('kelas');
    await expect(page.locator('.print-report table tbody tr')).toHaveCount(6);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.print-report')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navigasi utama' })).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
    console.log('PASS: print menu includes all-school attendance report');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Buka atau tutup menu' }).click();
    await page.getByRole('button', { name: /Absensi 1 Sekolah/ }).click();
    await expect(page.getByRole('heading', { name: 'Rekap Absensi 1 Sekolah', exact: true })).toBeVisible();
    await expect(page.locator('#school-attendance-month')).toBeVisible();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await page.screenshot({ path: '/tmp/school-attendance-mobile.png', fullPage: true });
    console.log('PASS: mobile school attendance layout without horizontal page overflow');

    const invalid = await page.request.get(`${base}/api/attendance/school?bulan=13&tahun=2026`);
    assert.equal(invalid.status(), 400);
    const result = await page.request.get(`${base}/api/attendance/school?bulan=3&tahun=2026`);
    assert.equal(result.status(), 200);
    const { summary } = await result.json();
    for (const field of ['jumlahSiswa', 'sudahDiisi', 'belumDiisi', 'hadir', 'sakit', 'izin', 'alpa', 'totalHari']) {
      assert.equal(summary.perRombel.reduce((sum, row) => sum + row[field], 0), summary.totals[field]);
      assert.equal(summary.perKelas.reduce((sum, row) => sum + row[field], 0), summary.totals[field]);
    }
    assert.equal(summary.siswa.length, summary.totals.jumlahSiswa);
    assert.deepEqual(errors, []);
    console.log('PASS: database-backed API totals and browser has no uncaught errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
