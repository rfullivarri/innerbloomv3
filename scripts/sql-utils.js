import process from 'node:process';

export function ensureDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL;

  if (!rawUrl) {
    console.error('DATABASE_URL is required to run SQL files');
    process.exit(1);
  }

  try {
    const parsed = new URL(rawUrl);
    if (!parsed.searchParams.has('sslmode')) {
      parsed.searchParams.set('sslmode', 'require');
    }
    return parsed.toString();
  } catch (error) {
    console.error('DATABASE_URL is not a valid URL', error);
    process.exit(1);
  }
}

export function isIgnorableError(error) {
  return typeof error?.message === 'string'
    ? /already exists|duplicate key|DuplicateObject/i.test(error.message)
    : false;
}

export function splitSqlStatements(sql) {
  const statements = [];
  let buffer = '';
  let statementStartLine = 1;
  let statementStartColumn = 1;
  let line = 1;
  let column = 1;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag = null;

  const advance = (char) => {
    buffer += char;
    if (char === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  };

  const pushStatement = () => {
    const trimmed = buffer.trim();
    if (trimmed.length > 0) {
      const leading = buffer.match(/^\s*/)?.[0] ?? '';
      let startLine = statementStartLine;
      let startColumn = statementStartColumn;
      for (const char of leading) {
        if (char === '\n') {
          startLine += 1;
          startColumn = 1;
        } else {
          startColumn += 1;
        }
      }

      statements.push({
        text: trimmed,
        startLine,
        startColumn,
      });
    }

    buffer = '';
    statementStartLine = line;
    statementStartColumn = column;
  };

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      advance(char);
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        advance(char);
        advance(next);
        i += 1;
        inBlockComment = false;
        continue;
      }

      advance(char);
      continue;
    }

    if (dollarTag) {
      advance(char);
      if (char === '$' && sql.slice(i - dollarTag.length + 1, i + 1) === dollarTag) {
        dollarTag = null;
      }
      continue;
    }

    if (inSingleQuote) {
      advance(char);
      if (char === '\'' && next === '\'') {
        advance(next);
        i += 1;
        continue;
      }
      if (char === '\'') {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      advance(char);
      if (char === '"' && next === '"') {
        advance(next);
        i += 1;
        continue;
      }
      if (char === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (char === '-' && next === '-') {
      advance(char);
      advance(next);
      i += 1;
      inLineComment = true;
      continue;
    }

    if (char === '/' && next === '*') {
      advance(char);
      advance(next);
      i += 1;
      inBlockComment = true;
      continue;
    }

    if (char === '$') {
      const rest = sql.slice(i);
      const match = rest.match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        const tag = match[0];
        for (let j = 0; j < tag.length; j += 1) {
          advance(sql[i + j]);
        }
        i += tag.length - 1;
        dollarTag = tag;
        continue;
      }
    }

    if (char === '\'') {
      inSingleQuote = true;
      advance(char);
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      advance(char);
      continue;
    }

    if (char === ';') {
      advance(char);
      pushStatement();
      continue;
    }

    advance(char);
  }

  if (buffer.trim().length > 0) {
    pushStatement();
  }

  return statements;
}

export function computeErrorLocation(statement, errorPosition) {
  const positionNumber = typeof errorPosition === 'string' || typeof errorPosition === 'number'
    ? Number(errorPosition)
    : Number.NaN;

  if (!Number.isFinite(positionNumber) || positionNumber <= 0) {
    return null;
  }

  const text = statement.text;
  const maxIndex = Math.min(positionNumber - 1, text.length - 1);
  let localLine = 1;
  let localColumn = 1;

  for (let i = 0; i < maxIndex; i += 1) {
    const char = text[i];
    if (char === '\n') {
      localLine += 1;
      localColumn = 1;
    } else {
      localColumn += 1;
    }
  }

  const absoluteLine = statement.startLine + localLine - 1;
  const absoluteColumn = localLine === 1
    ? statement.startColumn + localColumn - 1
    : localColumn;

  return { line: absoluteLine, column: absoluteColumn };
}

const TRANSACTION_REGEX = /^(BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION)\b/i;

export function isTransactionControlStatement(statementText) {
  return TRANSACTION_REGEX.test(statementText.trim().replace(/;$/, ''));
}
