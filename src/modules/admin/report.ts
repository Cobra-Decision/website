const blocked = /\b(insert|update|delete|replace|create|alter|drop|pragma|attach|detach|vacuum|begin|commit|rollback)\b/i;

export function validateReportSql(input: string) {
  const sql = input.trim().replace(/;\s*$/, "");
  if (!sql) return "Enter a query.";
  if (sql.includes(";") || /--|\/\*/.test(sql)) return "Only one query without comments is allowed.";
  if (!/^(select|with)\b/i.test(sql) || blocked.test(sql)) return "Only read-only SELECT or WITH queries are allowed.";
  return sql;
}
