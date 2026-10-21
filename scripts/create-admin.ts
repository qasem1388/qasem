/**
 * Creates (or resets) a main administrator account from the command line.
 * No default credentials ship with the project: run this once on the server.
 *
 *   npm run admin:create -- --email you@company.sa --name "اسمك"
 *   npm run admin:create -- --email you@company.sa --reset      # reset password & re-activate
 *
 * The password is read from a hidden prompt, or from ADMIN_PASSWORD for automated setups.
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword, passwordProblem } from "../src/server/auth/password";

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) return reject(new Error("No terminal available: set ADMIN_PASSWORD instead."));
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (ch: string) => {
      if (ch === "\r" || ch === "\n" || ch === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (ch === "\u0003") {
        process.exit(130);
      } else if (ch === "\u007f" || ch === "\b") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const { values } = parseArgs({
    options: { email: { type: "string" }, name: { type: "string" }, reset: { type: "boolean", default: false } },
  });
  const email = values.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Provide a valid --email.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing && !values.reset) throw new Error("A user with this email already exists. Use --reset to set a new password.");
    if (!existing && !values.name?.trim()) throw new Error("Provide --name for a new administrator.");

    let password = process.env.ADMIN_PASSWORD ?? "";
    if (!password) {
      password = await promptHidden("Password: ");
      if ((await promptHidden("Confirm password: ")) !== password) throw new Error("Passwords do not match.");
    }
    const problem = passwordProblem(password, email);
    if (problem) throw new Error(problem);

    const passwordHash = await hashPassword(password);
    const user = existing
      ? await db.user.update({ where: { email }, data: { passwordHash, active: true, role: "ADMIN" } })
      : await db.user.create({ data: { email, name: values.name!.trim(), passwordHash, role: "ADMIN" } });
    if (existing) await db.session.deleteMany({ where: { userId: user.id } });
    await db.auditLog.create({
      data: {
        action: "user.created_cli",
        userId: user.id,
        entity: "user",
        entityId: user.id,
        details: { email, reset: !!existing },
      },
    });
    console.log(`✔ Administrator ${existing ? "updated" : "created"}: ${email}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(`✖ ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
