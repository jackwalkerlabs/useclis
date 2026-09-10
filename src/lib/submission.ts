interface Submission {
  name: string;
  repository: string;
  command: string;
  category: string;
  docs: string;
  useCase: string;
  handle?: string;
}

export function submissionBody(submission: Submission) {
  return [
    '## CLI submission',
    `Name: ${submission.name}`,
    `Repository: ${submission.repository}`,
    `Command: ${submission.command}`,
    `Category: ${submission.category}`,
    `Documentation: ${submission.docs}`,
    `\n### Agent use case\n${submission.useCase}`,
    ...(submission.handle ? [`\nSubmitted by: ${submission.handle}`] : []),
  ].join('\n');
}

export function submissionIssueUrl(destination: string, submission: Submission) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(destination)) throw new Error('A submission repository is required.');
  const url = new URL(`https://github.com/${destination}/issues/new`);
  url.searchParams.set('title', `CLI submission: ${submission.name}`);
  url.searchParams.set('body', submissionBody(submission));
  return url;
}
