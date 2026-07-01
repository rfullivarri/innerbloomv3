import { readFile } from 'node:fs/promises';
import process from 'node:process';
import * as Ajv2020Module from 'ajv/dist/2020.js';
import type { ErrorObject } from 'ajv';

function readArg(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function formatErrors(errors: ErrorObject[]): string {
  return errors
    .map((error) => `${error.instancePath || '/'}: ${error.message ?? 'invalid'}`)
    .join('\n');
}

async function main(): Promise<void> {
  const schemaPath = readArg('schema');
  const inputPath = readArg('input');

  if (!schemaPath || !inputPath) {
    throw new Error(
      'Usage: tsx apps/api/scripts/validate-marketing-agent-json.ts --schema=<schema.json> --input=<input.json>',
    );
  }

  const [schemaText, inputText] = await Promise.all([
    readFile(schemaPath, 'utf8'),
    readFile(inputPath, 'utf8'),
  ]);

  const schema = JSON.parse(schemaText) as Record<string, unknown>;
  const input = JSON.parse(inputText) as unknown;
  const ajv = new Ajv2020Module.Ajv2020({ allErrors: true, strict: false });
  ajv.addFormat('date', /^\d{4}-\d{2}-\d{2}$/);
  ajv.addFormat('date-time', {
    type: 'string',
    validate: (value: string) => !Number.isNaN(Date.parse(value)),
  });

  const validate = ajv.compile(schema);
  if (!validate(input)) {
    throw new Error(`JSON validation failed:\n${formatErrors(validate.errors ?? [])}`);
  }

  console.log(`Validated ${inputPath} against ${schemaPath}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Unknown validation error');
  process.exitCode = 1;
});
