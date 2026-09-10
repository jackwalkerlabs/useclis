import assert from 'node:assert/strict';
import { test } from 'node:test';
import { submissionIssueUrl } from '../src/lib/submission.ts';

test('CLI issues preserve submitted details and URL characters in the intended repository', () => {
  const submission = {
    name: 'Search & inspect + CLI',
    repository: 'https://github.com/example/search',
    command: 'search --json',
    category: 'Code search',
    docs: 'https://example.com/docs?format=json&version=2#usage',
    useCase: 'Search code for “TODO” markers.\nReturn file paths & line numbers.',
    handle: '@maintainer',
  };
  const url = submissionIssueUrl('directory/project', submission);
  assert.equal(url.origin, 'https://github.com');
  assert.equal(url.pathname, '/directory/project/issues/new');
  assert.equal(url.searchParams.get('title'), `CLI submission: ${submission.name}`);
  const body = url.searchParams.get('body');
  for (const value of Object.values(submission)) assert.ok(body.includes(value));
  assert.equal(url.hash, '');
  assert.equal([...url.searchParams].length, 2);
  const withoutHandle = submissionIssueUrl('directory/project', { ...submission, handle: '' });
  assert.ok(!withoutHandle.searchParams.get('body').includes('Submitted by:'));
  assert.throws(() => submissionIssueUrl('', submission), /repository is required/);
  assert.throws(() => submissionIssueUrl('https://example.com/repo', submission), /repository is required/);
});
