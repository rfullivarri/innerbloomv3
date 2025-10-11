import process from 'node:process';
import { Client } from 'pg';

const HELP_MESSAGE = `\nGrant or revoke admin rights for a user.\n\nUsage:\n  pnpm --filter @innerbloom/api admin:grant --user-id <uuid>\n  pnpm --filter @innerbloom/api admin:grant --clerk-id <clerk>\n  pnpm --filter @innerbloom/api admin:grant --email <email>\n\nOptions:\n  --user-id <uuid>      Match by internal user_id column\n  --clerk-id <id>       Match by Clerk user id\n  --email <email>       Match by primary email (case insensitive)\n  --revoke              Remove admin rights instead of granting\n  --help                Show this message\n\nYou must provide at least one identifier. Multiple identifiers will be combined with OR.\n`;

type ParsedArgs = {
  userIds: string[];
  clerkIds: string[];
  emails: string[];
  grant: boolean;
  showHelp: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    userIds: [],
    clerkIds: [],
    emails: [],
    grant: true,
    showHelp: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case '--user-id': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('--user-id option requires a value');
        }
        parsed.userIds.push(value);
        index += 1;
        break;
      }
      case '--clerk-id': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('--clerk-id option requires a value');
        }
        parsed.clerkIds.push(value);
        index += 1;
        break;
      }
      case '--email': {
        const value = argv[index + 1];
        if (!value) {
          throw new Error('--email option requires a value');
        }
        parsed.emails.push(value.toLowerCase());
        index += 1;
        break;
      }
      case '--revoke': {
        parsed.grant = false;
        break;
      }
      case '--grant': {
        parsed.grant = true;
        break;
      }
      case '--help':
      case '-h':
      case '-?': {
        parsed.showHelp = true;
        break;
      }
      default: {
        throw new Error(`Unknown option: ${token}`);
      }
    }
  }

  return parsed;
}

async function run(): Promise<void> {
  const argv = process.argv.slice(2);
  let args: ParsedArgs;

  try {
    args = parseArgs(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    console.info(HELP_MESSAGE);
    process.exitCode = 1;
    return;
  }

  if (args.showHelp) {
    console.info(HELP_MESSAGE);
    return;
  }

  if (args.userIds.length === 0 && args.clerkIds.length === 0 && args.emails.length === 0) {
    console.error('Error: at least one identifier (--user-id, --clerk-id, --email) is required.');
    console.info(HELP_MESSAGE);
    process.exitCode = 1;
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DATABASE_URL environment variable is required.');
    process.exitCode = 1;
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (args.userIds.length > 0) {
      conditions.push(`user_id = ANY($${values.length + 1}::uuid[])`);
      values.push(args.userIds);
    }

    if (args.clerkIds.length > 0) {
      conditions.push(`clerk_user_id = ANY($${values.length + 1}::text[])`);
      values.push(args.clerkIds);
    }

    if (args.emails.length > 0) {
      conditions.push(`LOWER(email_primary) = ANY($${values.length + 1}::text[])`);
      values.push(args.emails.map((email) => email.toLowerCase()));
    }

    const statement = `UPDATE users\n      SET is_admin = $${values.length + 1}, updated_at = now()\n      WHERE ${conditions.join(' OR ')}\n      RETURNING user_id, clerk_user_id, email_primary, is_admin`;

    values.push(args.grant);

    const result = await client.query(statement, values);

    if (result.rowCount === 0) {
      console.warn('No users matched the provided identifiers.');
      process.exitCode = 1;
      return;
    }

    for (const row of result.rows) {
      console.info(
        `${row.user_id} | clerk=${row.clerk_user_id ?? 'n/a'} | email=${row.email_primary ?? 'n/a'} => is_admin=${row.is_admin}`,
      );
    }

    console.info(`\nSuccessfully ${args.grant ? 'granted' : 'revoked'} admin rights for ${result.rowCount} user(s).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to update admin status: ${message}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(`Unexpected error: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = 1;
});
