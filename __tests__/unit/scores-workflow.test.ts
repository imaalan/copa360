/** @jest-environment node */

import fs from 'fs';
import path from 'path';

const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'scores.yml');

describe('scores workflow', () => {
  it('exists at the expected path', () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
  });

  it('uses the 30-minute cron schedule', () => {
    const content = fs.readFileSync(workflowPath, 'utf8');
    expect(content).toContain('*/30 * * * *');
  });

  it('calls the cron scores endpoint', () => {
    const content = fs.readFileSync(workflowPath, 'utf8');
    expect(content).toContain('https://copa360.vercel.app/api/cron/scores');
  });

  it('uses GET', () => {
    const content = fs.readFileSync(workflowPath, 'utf8');
    expect(content).toContain('-X GET');
  });

  it('sends Authorization Bearer with CRON_SECRET', () => {
    const content = fs.readFileSync(workflowPath, 'utf8');
    expect(content).toMatch(/Authorization[\s\S]*Bearer[\s\S]*secrets\.CRON_SECRET/);
  });
});
